import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { lowestMonthly, monthlyPayment } from "@/lib/installment";
import { createOrder } from "./orders";
import { deletePlan, listPlans, savePlan } from "./installment";
import { inStockProduct, orderInput, testDb } from "./testing";

let db: Db;
const options = { methods: ["payme" as const, "click" as const, "cash" as const] };

beforeAll(async () => {
  db = await testDb();
});

describe("installment", () => {
  it("counts the monthly sum, rounded up to thousands", () => {
    expect(monthlyPayment(8_990_000, { months: 12, markup: 0 })).toBe(750_000);
    expect(monthlyPayment(1_000_000, { months: 6, markup: 20 })).toBe(200_000);
    expect(monthlyPayment(1_000_000, { months: 3, markup: 0 })).toBe(334_000);
    expect(lowestMonthly(1_000_000, [{ months: 3, markup: 0 }, { months: 12, markup: 30 }])?.plan.months).toBe(12);
    expect(lowestMonthly(1_000_000, [])).toBeNull();
  });

  it("keeps only sensible terms", async () => {
    expect(await savePlan(db, { months: "1", markup: "0" })).toEqual({ ok: false, error: "invalid" });
    expect(await savePlan(db, { months: "12", markup: "101" })).toEqual({ ok: false, error: "invalid" });
    expect(await savePlan(db, { months: "6", markup: "10" })).toEqual({ ok: true });
    expect(await savePlan(db, { months: "6", markup: "12" })).toEqual({ ok: true });
    expect(await listPlans(db)).toEqual([{ months: 6, markup: 12 }]);
  });

  it("records the agreed terms with the order, paid on receipt only", async () => {
    const input = { ...orderInput, paymentMethod: "cash" as const, installmentMonths: 6 };
    const placed = await createOrder(db, input, options);
    if (!placed.ok) throw new Error(placed.error);
    expect(placed.order).toMatchObject({ installmentMonths: 6, installmentMonthly: monthlyPayment(inStockProduct.price, { months: 6, markup: 12 }) });

    expect(await createOrder(db, { ...input, paymentMethod: "payme" }, options)).toEqual({ ok: false, error: "payment" });
    expect(await createOrder(db, { ...input, installmentMonths: 9 }, options)).toEqual({ ok: false, error: "installment" });
    await deletePlan(db, 6);
    expect(await createOrder(db, input, options)).toEqual({ ok: false, error: "installment" });
  });
});
