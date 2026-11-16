import { and, desc, eq, inArray, ne, or } from "drizzle-orm";
import { z } from "zod";
import type { Db, Tx } from "@/db";
import {
  customers,
  orderItems,
  orders,
  type Customer,
  type Order,
  type OrderItem,
  type PaymentMethod,
} from "@/db/schema";
import { deliveryFee, getDeliveryZone } from "@/data/delivery";
import { routing } from "@/i18n/routing";
import { getProductById } from "@/lib/catalog";
import { MAX_LINES, MAX_QUANTITY } from "@/lib/limits";
import { normalizePhone } from "@/lib/phone";

/** What the checkout form sends. Prices are never part of it. */
export const orderInputSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        quantity: z.number().int().min(1).max(MAX_QUANTITY),
      }),
    )
    .min(1)
    .max(MAX_LINES),
  name: z.string().trim().min(2).max(80),
  phone: z.string().min(1).max(30),
  deliveryType: z.enum(["delivery", "pickup"]),
  zone: z.string().max(40).optional(),
  address: z.string().trim().max(300).optional(),
  comment: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["payme", "click", "cash"]),
  locale: z.enum(routing.locales),
  /** The total the customer saw; the order is refused when prices changed since. */
  expectedTotal: z.number().int().nonnegative().optional(),
});

export type OrderInput = z.infer<typeof orderInputSchema>;
export type OrderWithItems = Order & { items: OrderItem[] };

export type CreateOrderResult =
  | { ok: true; order: OrderWithItems }
  /** Some form fields are missing or wrong. */
  | { ok: false; error: "invalid"; fields: string[] }
  /** Some products are gone or out of stock. */
  | { ok: false; error: "unavailable"; ids: string[] }
  /** The total differs from the one the customer saw. */
  | { ok: false; error: "changed"; total: number }
  /** The chosen payment method is switched off. */
  | { ok: false; error: "payment" };

type CreateOrderOptions = {
  /** The signed-in customer, if any; guests can order too. */
  customer?: Customer | null;
  /** Payment methods that are available right now. */
  methods: PaymentMethod[];
};

export async function createOrder(db: Db, raw: unknown, options: CreateOrderOptions): Promise<CreateOrderResult> {
  const parsed = orderInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "form")))];
    return { ok: false, error: "invalid", fields };
  }
  const input = parsed.data;

  const fields: string[] = [];
  const phone = normalizePhone(input.phone);
  if (!phone) fields.push("phone");

  const zone = input.deliveryType === "delivery" ? getDeliveryZone(input.zone) : undefined;
  if (input.deliveryType === "delivery") {
    if (!zone) fields.push("zone");
    if (!input.address || input.address.length < 5) fields.push("address");
  }
  if (!phone || fields.length > 0) return { ok: false, error: "invalid", fields };

  if (!options.methods.includes(input.paymentMethod)) return { ok: false, error: "payment" };

  // The same product sent twice counts as one line.
  const quantities = new Map<string, number>();
  for (const item of input.items) {
    quantities.set(item.id, Math.min(MAX_QUANTITY, (quantities.get(item.id) ?? 0) + item.quantity));
  }

  // Prices and availability come from the catalogue, never from the browser.
  const unavailable: string[] = [];
  const lines = [...quantities].flatMap(([id, quantity]) => {
    const product = getProductById(id);
    if (!product || !product.inStock) {
      unavailable.push(id);
      return [];
    }
    return [{ product, quantity }];
  });
  if (unavailable.length > 0) return { ok: false, error: "unavailable", ids: unavailable };

  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const fee = zone ? deliveryFee(zone, subtotal) : 0;
  const total = subtotal + fee;
  if (input.expectedTotal !== undefined && input.expectedTotal !== total) {
    return { ok: false, error: "changed", total };
  }
  const customer = options.customer ?? null;

  return db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        customerId: customer?.id ?? null,
        name: input.name,
        phone,
        locale: input.locale,
        deliveryType: input.deliveryType,
        zone: zone?.slug ?? null,
        address: zone ? (input.address ?? null) : null,
        comment: input.comment || null,
        paymentMethod: input.paymentMethod,
        subtotal,
        deliveryFee: fee,
        total,
      })
      .returning();

    const items = await tx
      .insert(orderItems)
      .values(
        lines.map(({ product, quantity }) => ({
          orderId: order.id,
          productId: product.id,
          slug: product.slug,
          title: product.title,
          art: product.art,
          price: product.price,
          quantity,
        })),
      )
      .returning();

    if (customer && !customer.name) {
      await tx.update(customers).set({ name: input.name }).where(eq(customers.id, customer.id));
    }

    return { ok: true as const, order: { ...order, items } };
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isOrderId(value: string): boolean {
  return UUID.test(value);
}

/** An order by the id from its page address. */
export async function getOrder(db: Db, id: string): Promise<OrderWithItems | null> {
  if (!isOrderId(id)) return null;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return { ...order, items };
}

/** Parses the order number that Payme and Click send back to us. */
export function parseOrderNumber(value: unknown): number | null {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d{1,15}$/.test(text)) return null;
  return Number(text);
}

export async function getOrderByNumber(db: Db, number: number): Promise<Order | null> {
  const [order] = await db.select().from(orders).where(eq(orders.number, number)).limit(1);
  return order ?? null;
}

/**
 * The order with this number, locked until the surrounding transaction ends,
 * so that two payment notifications for one order are handled one by one.
 */
export async function lockOrderByNumber(tx: Tx, number: number): Promise<Order | null> {
  const [order] = await tx.select().from(orders).where(eq(orders.number, number)).limit(1).for("update");
  return order ?? null;
}

/** Orders of a signed-in customer, including ones placed as a guest with the same phone. */
export async function listOrders(db: Db, customer: Customer, limit = 50): Promise<OrderWithItems[]> {
  const rows = await db
    .select()
    .from(orders)
    .where(or(eq(orders.customerId, customer.id), eq(orders.phone, customer.phone)))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
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

/** Can this order still be paid online? */
export function isPayable(order: Pick<Order, "status" | "paymentStatus">): boolean {
  return order.paymentStatus === "unpaid" && order.status !== "cancelled" && order.status !== "delivered";
}

/**
 * Marks the order as paid, once. Returns false when it was already paid or
 * cancelled, in which case the caller must refuse the payment.
 */
export async function markOrderPaid(tx: Tx, orderId: string, method: PaymentMethod, at: Date): Promise<boolean> {
  const [current] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1).for("update");
  if (!current || !isPayable(current)) return false;

  await tx
    .update(orders)
    .set({
      paymentStatus: "paid",
      paymentMethod: method,
      paidAt: at,
      // Paying online confirms the order by itself.
      status: current.status === "new" ? "confirmed" : current.status,
    })
    .where(eq(orders.id, orderId));
  return true;
}

/**
 * Takes back a payment: the money returns to the customer and the order is
 * cancelled. Returns false when the goods were already handed over.
 */
export async function markOrderRefunded(tx: Tx, orderId: string): Promise<boolean> {
  const updated = await tx
    .update(orders)
    .set({ paymentStatus: "refunded", status: "cancelled" })
    .where(and(eq(orders.id, orderId), ne(orders.status, "delivered")))
    .returning({ id: orders.id });
  return updated.length > 0;
}
