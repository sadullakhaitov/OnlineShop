import { and, asc, count, desc, eq, ilike, inArray, like, or, sql, type SQL } from "drizzle-orm";
import type { Db } from "@/db";
import {
  clickTransactions,
  customers,
  orderEvents,
  orderItems,
  orders,
  paymeTransactions,
  type ClickTransaction,
  type Order,
  type OrderEvent,
  type OrderStatus,
  type PaymeTransaction,
} from "@/db/schema";
import { isOrderId, type OrderWithItems } from "@/server/orders";
import { queueOrderMessages } from "@/server/telegram/notify";

/** What the admin panel reads and changes in orders. */

export const ORDER_STATUSES: OrderStatus[] = ["new", "confirmed", "delivering", "delivered", "cancelled"];
export const ADMIN_PAGE_SIZE = 20;

/** Bukhara lives on Tashkent time, five hours ahead of UTC all year round. */
const TASHKENT_OFFSET = 5 * 60 * 60_000;
const DAY = 24 * 60 * 60_000;

/** The moment the current day began in Bukhara. */
export function startOfDay(now: Date): Date {
  return new Date(Math.floor((now.getTime() + TASHKENT_OFFSET) / DAY) * DAY - TASHKENT_OFFSET);
}

/**
 * Statuses the order may be moved to from where it is now. Besides the way
 * forward there is always a step back, because people press the wrong button.
 */
export function allowedStatuses(order: Pick<Order, "status" | "paymentStatus">): OrderStatus[] {
  const paid = order.paymentStatus === "paid";
  switch (order.status) {
    case "new":
      return ["confirmed", "cancelled"];
    case "confirmed":
      // A paid order is confirmed by the payment itself and cannot become "new" again.
      return paid ? ["delivering", "cancelled"] : ["delivering", "new", "cancelled"];
    case "delivering":
      return ["delivered", "confirmed", "cancelled"];
    case "delivered":
      return ["delivering", "cancelled"];
    case "cancelled":
      // After a refund the order is closed for good.
      if (order.paymentStatus === "refunded") return [];
      return [paid ? "confirmed" : "new"];
  }
}

/** Payment changes the shop makes by hand. */
export type PaymentAction = "cash" | "undo" | "refund";

export function allowedPaymentActions(order: Pick<Order, "status" | "paymentStatus" | "paymentMethod">): PaymentAction[] {
  if (order.paymentStatus === "unpaid") return order.status === "cancelled" ? [] : ["cash"];
  if (order.paymentStatus === "paid") {
    // Money for a cancelled order goes back to the customer.
    if (order.status === "cancelled") return ["refund"];
    // Only a payment the shop itself wrote down can be taken back here;
    // Payme and Click payments are returned in their cabinets.
    return order.paymentMethod === "cash" ? ["undo"] : [];
  }
  return [];
}

export type AdminResult = { ok: true } | { ok: false; error: "missing" | "stale" | "forbidden" };

/**
 * Moves the order from `from` to `to`. `from` is the status the admin saw:
 * when someone else changed the order meanwhile, nothing happens.
 */
export async function changeOrderStatus(db: Db, orderId: string, from: OrderStatus, to: OrderStatus): Promise<AdminResult> {
  if (!isOrderId(orderId)) return { ok: false, error: "missing" };

  return db.transaction(async (tx): Promise<AdminResult> => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1).for("update");
    if (!order) return { ok: false, error: "missing" };
    if (order.status !== from) return { ok: false, error: "stale" };
    if (!allowedStatuses(order).includes(to)) return { ok: false, error: "forbidden" };

    await tx.update(orders).set({ status: to }).where(eq(orders.id, orderId));
    await tx.insert(orderEvents).values({ orderId, type: "status", fromStatus: from, toStatus: to, actor: "admin" });
    // The customer hears about steps forward; a step back fixes a mistake and is not news.
    if (to === "cancelled" || ORDER_STATUSES.indexOf(to) > ORDER_STATUSES.indexOf(from)) {
      if (to !== "new") await queueOrderMessages(tx, order, to, ["customer"]);
    }
    return { ok: true };
  });
}

/** Writes down money the shop received or gave back by hand. */
export async function changeOrderPayment(
  db: Db,
  orderId: string,
  action: PaymentAction,
  now: Date = new Date(),
): Promise<AdminResult> {
  if (!isOrderId(orderId)) return { ok: false, error: "missing" };

  return db.transaction(async (tx): Promise<AdminResult> => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1).for("update");
    if (!order) return { ok: false, error: "missing" };
    if (!allowedPaymentActions(order).includes(action)) return { ok: false, error: "stale" };

    if (action === "cash") {
      // Money in hand confirms the order, like an online payment does.
      const confirmed = order.status === "new";
      await tx
        .update(orders)
        .set({
          paymentStatus: "paid",
          paymentMethod: "cash",
          paidAt: now,
          status: confirmed ? "confirmed" : order.status,
        })
        .where(eq(orders.id, orderId));
      await tx.insert(orderEvents).values({
        orderId,
        type: "paid",
        actor: "admin",
        fromStatus: confirmed ? "new" : null,
        toStatus: confirmed ? "confirmed" : null,
      });
    } else if (action === "undo") {
      await tx.update(orders).set({ paymentStatus: "unpaid", paidAt: null }).where(eq(orders.id, orderId));
      await tx.insert(orderEvents).values({ orderId, type: "unpaid", actor: "admin" });
    } else {
      await tx.update(orders).set({ paymentStatus: "refunded" }).where(eq(orders.id, orderId));
      await tx.insert(orderEvents).values({ orderId, type: "refunded", actor: "admin" });
      await queueOrderMessages(tx, order, "refunded", ["customer"]);
    }
    return { ok: true };
  });
}

export type OrderFilter = {
  status?: OrderStatus;
  /** Order number, part of a phone number or of a name */
  q?: string;
  page?: number;
};

function searchCondition(q: string | undefined): SQL | undefined {
  const text = (q ?? "").trim().slice(0, 60);
  if (!text) return undefined;

  const digits = text.replace(/\D/g, "");
  const conditions: SQL[] = [ilike(orders.name, `%${text.replace(/[\\%_]/g, "\\$&")}%`)];
  // "100012" or "№100012" is an order number…
  if (digits && digits.length <= 12 && /^[#№\s\d]+$/.test(text)) conditions.push(eq(orders.number, Number(digits)));
  // …and any three digits or more may be part of a phone number.
  if (digits.length >= 3) conditions.push(like(orders.phone, `%${digits}%`));
  return or(...conditions);
}

async function withItems(db: Db, rows: Order[]): Promise<OrderWithItems[]> {
  if (rows.length === 0) return [];
  const items = await db
    .select()
    .from(orderItems)
    .where(
      inArray(
        orderItems.orderId,
        rows.map((order) => order.id),
      ),
    );
  return rows.map((order) => ({ ...order, items: items.filter((item) => item.orderId === order.id) }));
}

export type OrderList = {
  orders: OrderWithItems[];
  /** Orders matching the search in each status, for the tabs */
  counts: Record<OrderStatus, number>;
  /** Orders matching the search and the chosen status */
  total: number;
  page: number;
  pages: number;
};

export async function listAdminOrders(db: Db, filter: OrderFilter = {}): Promise<OrderList> {
  const search = searchCondition(filter.q);

  const grouped = await db
    .select({ status: orders.status, value: count() })
    .from(orders)
    .where(search)
    .groupBy(orders.status);
  const counts = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0])) as Record<OrderStatus, number>;
  for (const row of grouped) counts[row.status] = row.value;

  const total = filter.status ? counts[filter.status] : grouped.reduce((sum, row) => sum + row.value, 0);
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(filter.page ?? 1) || 1), pages);

  const rows = await db
    .select()
    .from(orders)
    .where(and(search, filter.status ? eq(orders.status, filter.status) : undefined))
    .orderBy(desc(orders.createdAt), desc(orders.number))
    .limit(ADMIN_PAGE_SIZE)
    .offset((page - 1) * ADMIN_PAGE_SIZE);

  return { orders: await withItems(db, rows), counts, total, page, pages };
}

/** How many orders wait for the shop's answer; shown next to the menu item. */
export async function countNewOrders(db: Db): Promise<number> {
  const [row] = await db.select({ value: count() }).from(orders).where(eq(orders.status, "new"));
  return row.value;
}

export type AdminOrder = OrderWithItems & {
  events: OrderEvent[];
  payme: PaymeTransaction[];
  click: ClickTransaction[];
  /** Does the customer have an account with this phone number? */
  hasAccount: boolean;
  /** Other orders from the same phone number */
  otherOrders: number;
};

export async function getAdminOrder(db: Db, id: string): Promise<AdminOrder | null> {
  if (!isOrderId(id)) return null;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;

  const [items, events, payme, click, [account], [sameCustomer]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, id)).orderBy(asc(orderEvents.createdAt)),
    db.select().from(paymeTransactions).where(eq(paymeTransactions.orderId, id)).orderBy(asc(paymeTransactions.createTime)),
    db.select().from(clickTransactions).where(eq(clickTransactions.orderId, id)).orderBy(asc(clickTransactions.createdAt)),
    db.select({ id: customers.id }).from(customers).where(eq(customers.phone, order.phone)).limit(1),
    db.select({ value: count() }).from(orders).where(eq(orders.phone, order.phone)),
  ]);

  return {
    ...order,
    items,
    events,
    payme,
    click,
    hasAccount: Boolean(account),
    otherOrders: sameCustomer.value - 1,
  };
}

export type DayTotal = {
  /** The day's first moment in Bukhara */
  date: Date;
  orders: number;
  /** Money received that day */
  revenue: number;
};

export type Dashboard = {
  today: { orders: number; amount: number; revenue: number };
  week: { orders: number; revenue: number };
  month: { orders: number; revenue: number };
  /** Orders waiting for the shop's answer */
  waiting: number;
  /** Orders on the way or ready to be picked up */
  delivering: number;
  /** One entry per day, oldest first, today last */
  days: DayTotal[];
  /** Orders that need someone's hands, oldest first */
  attention: {
    fresh: OrderWithItems[];
    /** Cancelled, but the customer's money is still with the shop */
    toRefund: OrderWithItems[];
    /** Handed over, but no payment written down */
    unpaidDelivered: OrderWithItems[];
  };
  recent: OrderWithItems[];
};

const CHART_DAYS = 14;

export async function getDashboard(db: Db, now: Date = new Date()): Promise<Dashboard> {
  const today = startOfDay(now);
  const iso = (date: Date) => sql`${date.toISOString()}::timestamptz`;
  const week = new Date(today.getTime() - 6 * DAY);
  const month = new Date(today.getTime() - 29 * DAY);
  const chartStart = new Date(today.getTime() - (CHART_DAYS - 1) * DAY);

  const live = sql`${orders.status} <> 'cancelled'`;
  const paid = sql`${orders.paymentStatus} = 'paid'`;
  const number = (value: SQL) => sql<number>`coalesce(${value}, 0)`.mapWith(Number);

  const [totals] = await db
    .select({
      todayOrders: number(sql`count(*) filter (where ${live} and ${orders.createdAt} >= ${iso(today)})`),
      todayAmount: number(sql`sum(${orders.total}) filter (where ${live} and ${orders.createdAt} >= ${iso(today)})`),
      todayRevenue: number(sql`sum(${orders.total}) filter (where ${paid} and ${orders.paidAt} >= ${iso(today)})`),
      weekOrders: number(sql`count(*) filter (where ${live} and ${orders.createdAt} >= ${iso(week)})`),
      weekRevenue: number(sql`sum(${orders.total}) filter (where ${paid} and ${orders.paidAt} >= ${iso(week)})`),
      monthOrders: number(sql`count(*) filter (where ${live} and ${orders.createdAt} >= ${iso(month)})`),
      monthRevenue: number(sql`sum(${orders.total}) filter (where ${paid} and ${orders.paidAt} >= ${iso(month)})`),
      waiting: number(sql`count(*) filter (where ${orders.status} = 'new')`),
      delivering: number(sql`count(*) filter (where ${orders.status} = 'delivering')`),
    })
    .from(orders);

  // Days are counted on Bukhara's clock: seconds since 1970 shifted by five hours.
  // The shift is written into the query itself: a parameter would make the
  // database treat the same expression in SELECT and GROUP BY as two different ones.
  const shift = sql.raw(String(TASHKENT_OFFSET / 1000));
  const dayOf = (column: SQL) =>
    sql<number>`floor((extract(epoch from ${column}) + ${shift}) / 86400)`.mapWith(Number);
  const createdDay = dayOf(sql`${orders.createdAt}`);
  const paidDay = dayOf(sql`${orders.paidAt}`);
  const [placed, received] = await Promise.all([
    db
      .select({ day: createdDay, value: count() })
      .from(orders)
      .where(sql`${live} and ${orders.createdAt} >= ${iso(chartStart)}`)
      .groupBy(createdDay),
    db
      .select({ day: paidDay, value: number(sql`sum(${orders.total})`) })
      .from(orders)
      .where(sql`${paid} and ${orders.paidAt} >= ${iso(chartStart)}`)
      .groupBy(paidDay),
  ]);

  const days: DayTotal[] = Array.from({ length: CHART_DAYS }, (_, index) => {
    const date = new Date(chartStart.getTime() + index * DAY);
    const day = Math.floor((date.getTime() + TASHKENT_OFFSET) / DAY);
    return {
      date,
      orders: placed.find((row) => row.day === day)?.value ?? 0,
      revenue: received.find((row) => row.day === day)?.value ?? 0,
    };
  });

  const pick = (where: SQL, limit: number, newestFirst = false) =>
    db
      .select()
      .from(orders)
      .where(where)
      .orderBy(newestFirst ? desc(orders.createdAt) : asc(orders.createdAt))
      .limit(limit);
  const [fresh, toRefund, unpaidDelivered, recent] = await Promise.all([
    pick(sql`${orders.status} = 'new'`, 6),
    pick(sql`${orders.status} = 'cancelled' and ${paid}`, 6),
    pick(sql`${orders.status} = 'delivered' and ${orders.paymentStatus} = 'unpaid'`, 6),
    pick(sql`true`, 8, true),
  ]);

  return {
    today: { orders: totals.todayOrders, amount: totals.todayAmount, revenue: totals.todayRevenue },
    week: { orders: totals.weekOrders, revenue: totals.weekRevenue },
    month: { orders: totals.monthOrders, revenue: totals.monthRevenue },
    waiting: totals.waiting,
    delivering: totals.delivering,
    days,
    attention: {
      fresh: await withItems(db, fresh),
      toRefund: await withItems(db, toRefund),
      unpaidDelivered: await withItems(db, unpaidDelivered),
    },
    recent: await withItems(db, recent),
  };
}
