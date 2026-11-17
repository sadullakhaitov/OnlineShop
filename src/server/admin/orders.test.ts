import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { orderEvents, orders } from "@/db/schema";
import { markOrderPaid, markOrderRefunded } from "@/server/orders";
import { placeOrder, reloadOrder, testDb } from "@/server/testing";
import {
  allowedPaymentActions,
  allowedStatuses,
  changeOrderPayment,
  changeOrderStatus,
  countNewOrders,
  getAdminOrder,
  getDashboard,
  listAdminOrders,
  startOfDay,
} from "./orders";

describe("admin orders", () => {
  let db: Db;

  beforeEach(async () => {
    db = await testDb();
  });

  const events = async (orderId: string) =>
    (await db.select().from(orderEvents).where(eq(orderEvents.orderId, orderId))).map(
      ({ type, fromStatus, toStatus, actor }) => ({ type, fromStatus, toStatus, actor }),
    );

  it("moves an order along and writes the history", async () => {
    const order = await placeOrder(db, { paymentMethod: "cash" });

    expect(await changeOrderStatus(db, order.id, "new", "confirmed")).toEqual({ ok: true });
    expect(await changeOrderStatus(db, order.id, "confirmed", "delivering")).toEqual({ ok: true });
    expect(await changeOrderStatus(db, order.id, "delivering", "delivered")).toEqual({ ok: true });
    expect((await reloadOrder(db, order.id)).status).toBe("delivered");

    expect(await events(order.id)).toEqual([
      { type: "status", fromStatus: "new", toStatus: "confirmed", actor: "admin" },
      { type: "status", fromStatus: "confirmed", toStatus: "delivering", actor: "admin" },
      { type: "status", fromStatus: "delivering", toStatus: "delivered", actor: "admin" },
    ]);
  });

  it("refuses jumps, stale pages and unknown orders", async () => {
    const order = await placeOrder(db, { paymentMethod: "cash" });

    expect(await changeOrderStatus(db, order.id, "new", "delivered")).toEqual({ ok: false, error: "forbidden" });
    // Someone confirmed it in another tab; this tab still shows "new".
    await changeOrderStatus(db, order.id, "new", "confirmed");
    expect(await changeOrderStatus(db, order.id, "new", "cancelled")).toEqual({ ok: false, error: "stale" });
    expect((await reloadOrder(db, order.id)).status).toBe("confirmed");

    expect(await changeOrderStatus(db, "nope", "new", "confirmed")).toEqual({ ok: false, error: "missing" });
    expect(
      await changeOrderStatus(db, "00000000-0000-4000-8000-000000000000", "new", "confirmed"),
    ).toEqual({ ok: false, error: "missing" });
  });

  it("always offers a step back", async () => {
    expect(allowedStatuses({ status: "confirmed", paymentStatus: "unpaid" })).toContain("new");
    expect(allowedStatuses({ status: "confirmed", paymentStatus: "paid" })).not.toContain("new");
    expect(allowedStatuses({ status: "delivered", paymentStatus: "paid" })).toContain("delivering");
    expect(allowedStatuses({ status: "cancelled", paymentStatus: "unpaid" })).toEqual(["new"]);
    expect(allowedStatuses({ status: "cancelled", paymentStatus: "paid" })).toEqual(["confirmed"]);
    expect(allowedStatuses({ status: "cancelled", paymentStatus: "refunded" })).toEqual([]);
  });

  it("writes down cash, also after the delivery, and can take it back", async () => {
    const order = await placeOrder(db, { paymentMethod: "cash" });
    const at = new Date("2026-11-17T09:30:00Z");

    expect(await changeOrderPayment(db, order.id, "cash", at)).toEqual({ ok: true });
    let current = await reloadOrder(db, order.id);
    // Money in hand confirms a new order.
    expect(current).toMatchObject({ paymentStatus: "paid", paymentMethod: "cash", status: "confirmed", paidAt: at });
    // A second press changes nothing.
    expect(await changeOrderPayment(db, order.id, "cash")).toEqual({ ok: false, error: "stale" });

    expect(await changeOrderPayment(db, order.id, "undo")).toEqual({ ok: true });
    current = await reloadOrder(db, order.id);
    expect(current).toMatchObject({ paymentStatus: "unpaid", paidAt: null, status: "confirmed" });

    await changeOrderStatus(db, order.id, "confirmed", "delivering");
    await changeOrderStatus(db, order.id, "delivering", "delivered");
    expect(await changeOrderPayment(db, order.id, "cash")).toEqual({ ok: true });
    expect(await reloadOrder(db, order.id)).toMatchObject({ paymentStatus: "paid", status: "delivered" });

    expect((await events(order.id)).map((event) => event.type)).toEqual(["paid", "unpaid", "status", "status", "paid"]);
  });

  it("does not take cash for a cancelled order or undo an online payment", async () => {
    const cancelled = await placeOrder(db, { paymentMethod: "cash" });
    await changeOrderStatus(db, cancelled.id, "new", "cancelled");
    expect(await changeOrderPayment(db, cancelled.id, "cash")).toEqual({ ok: false, error: "stale" });

    const online = await placeOrder(db);
    await db.transaction((tx) => markOrderPaid(tx, online.id, "payme", new Date()));
    expect(allowedPaymentActions(await reloadOrder(db, online.id))).toEqual([]);
    expect(await changeOrderPayment(db, online.id, "undo")).toEqual({ ok: false, error: "stale" });
    expect(await events(online.id)).toEqual([{ type: "paid", fromStatus: "new", toStatus: "confirmed", actor: "payme" }]);
  });

  it("closes a paid order that was cancelled only after the money went back", async () => {
    const order = await placeOrder(db);
    await db.transaction((tx) => markOrderPaid(tx, order.id, "click", new Date()));
    await changeOrderStatus(db, order.id, "confirmed", "cancelled");

    let current = await reloadOrder(db, order.id);
    expect(allowedPaymentActions(current)).toEqual(["refund"]);
    // Cancelled by mistake: it can still be brought back.
    expect(allowedStatuses(current)).toEqual(["confirmed"]);

    expect(await changeOrderPayment(db, order.id, "refund")).toEqual({ ok: true });
    current = await reloadOrder(db, order.id);
    expect(current).toMatchObject({ status: "cancelled", paymentStatus: "refunded" });
    expect(allowedStatuses(current)).toEqual([]);
    expect(allowedPaymentActions(current)).toEqual([]);
  });

  it("notes who returned an online payment", async () => {
    const order = await placeOrder(db);
    await db.transaction((tx) => markOrderPaid(tx, order.id, "payme", new Date()));
    expect(await db.transaction((tx) => markOrderRefunded(tx, order.id, "payme"))).toBe(true);
    expect((await events(order.id)).at(-1)).toEqual({
      type: "refunded",
      fromStatus: "confirmed",
      toStatus: "cancelled",
      actor: "payme",
    });
  });

  it("finds orders by number, phone and name, and counts the tabs", async () => {
    const first = await placeOrder(db, { name: "Aziz Karimov", phone: "+998 90 111 22 33", paymentMethod: "cash" });
    const second = await placeOrder(db, { name: "Dilnoza Rahimova", phone: "+998 93 444 55 66", paymentMethod: "cash" });
    await placeOrder(db, { name: "100% Aziz_", phone: "+998 91 777 88 99", paymentMethod: "cash" });
    await changeOrderStatus(db, second.id, "new", "confirmed");

    const all = await listAdminOrders(db);
    expect(all.total).toBe(3);
    expect(all.counts).toMatchObject({ new: 2, confirmed: 1, delivered: 0 });
    expect(all.orders[0].items).toHaveLength(1);
    expect(await countNewOrders(db)).toBe(2);

    const ids = async (q: string, status?: "new" | "confirmed") =>
      (await listAdminOrders(db, { q, status })).orders.map((order) => order.id);
    expect(await ids(String(first.number))).toEqual([first.id]);
    expect(await ids(`№${second.number}`)).toEqual([second.id]);
    expect(await ids("444 55")).toEqual([second.id]);
    expect(await ids("aziz")).toHaveLength(2);
    expect(await ids("aziz", "confirmed")).toEqual([]);
    // Signs that mean "anything" in a database search are taken literally.
    expect(await ids("100%")).toHaveLength(1);
    expect(await ids("Aziz_")).toHaveLength(1);
    expect(await ids("%")).toHaveLength(1);

    const confirmed = await listAdminOrders(db, { status: "confirmed" });
    expect(confirmed.orders.map((order) => order.id)).toEqual([second.id]);
    expect(confirmed.total).toBe(1);
  });

  it("pages through long lists", async () => {
    for (let i = 0; i < 23; i++) await placeOrder(db, { paymentMethod: "cash" });

    const first = await listAdminOrders(db);
    expect(first).toMatchObject({ total: 23, page: 1, pages: 2 });
    expect(first.orders).toHaveLength(20);
    const second = await listAdminOrders(db, { page: 2 });
    expect(second.orders).toHaveLength(3);
    // A page that does not exist shows the last one.
    expect((await listAdminOrders(db, { page: 9 })).page).toBe(2);
    expect((await listAdminOrders(db, { page: -3 })).page).toBe(1);
  });

  it("shows everything about one order", async () => {
    const order = await placeOrder(db, { phone: "+998 90 111 22 33" });
    await placeOrder(db, { phone: "+998 90 111 22 33", paymentMethod: "cash" });
    await db.transaction((tx) => markOrderPaid(tx, order.id, "payme", new Date()));

    const found = await getAdminOrder(db, order.id);
    expect(found).toMatchObject({ id: order.id, hasAccount: false, otherOrders: 1 });
    expect(found?.items).toHaveLength(1);
    expect(found?.events).toHaveLength(1);
    expect(await getAdminOrder(db, "nope")).toBeNull();
  });

  it("counts the day on Bukhara's clock", async () => {
    // 21:30 UTC is already half past two at night in Bukhara.
    expect(startOfDay(new Date("2026-11-16T21:30:00Z")).toISOString()).toBe("2026-11-16T19:00:00.000Z");
    expect(startOfDay(new Date("2026-11-16T18:59:59Z")).toISOString()).toBe("2026-11-15T19:00:00.000Z");
  });

  it("adds up the dashboard", async () => {
    const now = new Date("2026-11-17T10:00:00Z");
    const at = (iso: string) => new Date(iso);
    const place = async (createdAt: Date, paymentMethod: "cash" | "payme" = "cash") => {
      const order = await placeOrder(db, { paymentMethod });
      await db.update(orders).set({ createdAt }).where(eq(orders.id, order.id));
      return order;
    };

    // Today in Bukhara began at 19:00 UTC of the 16th.
    const today = await place(at("2026-11-16T20:00:00Z"));
    const paidToday = await place(at("2026-11-17T06:00:00Z"), "payme");
    await db.transaction((tx) => markOrderPaid(tx, paidToday.id, "payme", at("2026-11-17T06:05:00Z")));
    const yesterday = await place(at("2026-11-16T12:00:00Z"));
    await changeOrderPayment(db, yesterday.id, "cash", at("2026-11-16T13:00:00Z"));
    const cancelledToday = await place(at("2026-11-17T07:00:00Z"));
    await changeOrderStatus(db, cancelledToday.id, "new", "cancelled");
    const old = await place(at("2026-10-01T07:00:00Z"));
    await changeOrderPayment(db, old.id, "cash", at("2026-10-01T08:00:00Z"));
    // Paid, then cancelled: the money has to go back.
    const toRefund = await place(at("2026-11-10T07:00:00Z"));
    await changeOrderPayment(db, toRefund.id, "cash", at("2026-11-10T08:00:00Z"));
    await changeOrderStatus(db, toRefund.id, "confirmed", "cancelled");

    const board = await getDashboard(db, now);
    const price = today.total;
    expect(board.today).toEqual({ orders: 2, amount: price * 2, revenue: price });
    expect(board.week).toEqual({ orders: 3, revenue: price * 2 });
    // The cancelled order's money, received a week ago, counts until it is returned.
    expect(board.month).toEqual({ orders: 3, revenue: price * 3 });
    expect(board.waiting).toBe(1);
    expect(board.attention.fresh.map((order) => order.id)).toEqual([today.id]);
    expect(board.attention.toRefund.map((order) => order.id)).toEqual([toRefund.id]);
    expect(board.attention.unpaidDelivered).toEqual([]);
    expect(board.recent).toHaveLength(6);
    expect(board.recent[0].id).toBe(cancelledToday.id);

    expect(board.days).toHaveLength(14);
    expect(board.days.at(-1)).toEqual({ date: at("2026-11-16T19:00:00Z"), orders: 2, revenue: price });
    expect(board.days.at(-2)).toEqual({ date: at("2026-11-15T19:00:00Z"), orders: 1, revenue: price });
    expect(board.days.reduce((sum, day) => sum + day.orders, 0)).toBe(3);
  });
});
