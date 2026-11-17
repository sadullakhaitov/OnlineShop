import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { promoCodes } from "@/db/schema";
import { changeOrderStatus } from "./admin/orders";
import { createPromo } from "./admin/promo";
import { createOrder } from "./orders";
import { checkPromo, normalizeCode, promoDiscount } from "./promo";
import { inStockProduct, orderInput, testDb } from "./testing";

let db: Db;
const options = { methods: ["payme" as const, "click" as const, "cash" as const] };

beforeAll(async () => {
  db = await testDb();
});

describe("promo rules", () => {
  it("reads codes in any case and refuses odd ones", () => {
    expect(normalizeCode(" yangi10 ")).toBe("YANGI10");
    expect(normalizeCode("a")).toBeNull();
    expect(normalizeCode("bad code")).toBeNull();
  });

  it("never takes off more than the goods cost", () => {
    expect(promoDiscount({ kind: "percent", value: 10 }, 1_234_567)).toBe(123_456);
    expect(promoDiscount({ kind: "amount", value: 500_000 }, 300_000)).toBe(300_000);
  });

  it("checks the admin's limits", async () => {
    expect((await createPromo(db, { code: "big", kind: "percent", value: "95", minTotal: "0" })).ok).toBe(false);
    expect(await createPromo(db, { code: "min5m", kind: "amount", value: "200000", minTotal: "5000000" })).toEqual({ ok: true });
    expect(await createPromo(db, { code: "MIN5M", kind: "amount", value: "1", minTotal: "0" })).toEqual({ ok: false, error: "taken" });
    expect(await checkPromo(db, "min5m", 4_000_000)).toEqual({ ok: false, error: "minTotal", minTotal: 5_000_000 });
    expect(await checkPromo(db, "nothing", 4_000_000)).toEqual({ ok: false, error: "unknown" });
    await db.update(promoCodes).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(promoCodes.code, "MIN5M"));
    expect(await checkPromo(db, "min5m", 6_000_000)).toMatchObject({ ok: false, error: "expired" });
  });
});

describe("orders with a promo code", () => {
  it("takes the discount off the goods, counts the use and gives it back on cancellation", async () => {
    await createPromo(db, { code: "ONCE10", kind: "percent", value: "10", minTotal: "0", maxUses: "1" });
    const items = [{ id: inStockProduct.id, quantity: 1 }];
    const discount = Math.floor(inStockProduct.price / 10);

    const result = await createOrder(db, { ...orderInput, items, promoCode: "once10" }, options);
    if (!result.ok) throw new Error(JSON.stringify(result));
    expect(result.order).toMatchObject({ promoCode: "ONCE10", discount, total: inStockProduct.price - discount });

    // One use only: the next customer is told so.
    expect(await createOrder(db, { ...orderInput, items, promoCode: "ONCE10" }, options)).toMatchObject({
      ok: false,
      error: "promo",
      reason: "used",
    });

    await changeOrderStatus(db, result.order.id, "new", "cancelled");
    expect((await checkPromo(db, "ONCE10", inStockProduct.price)).ok).toBe(true);
  });
});
