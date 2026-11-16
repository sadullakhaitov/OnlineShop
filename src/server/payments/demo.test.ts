import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { placeOrder, reloadOrder, testDb } from "@/server/testing";
import { simulatePayment } from "./demo";
import { clickPayUrl, paymeCheckoutUrl } from "./urls";

let db: Db;

beforeAll(async () => {
  db = await testDb();
});

describe("payment simulator", () => {
  for (const method of ["payme", "click"] as const) {
    it(`pays a ${method} order through the real handlers`, async () => {
      const order = await placeOrder(db, { paymentMethod: method });
      expect(await simulatePayment(db, order, "pay")).toBe(true);
      expect(await reloadOrder(db, order.id)).toMatchObject({ paymentStatus: "paid", status: "confirmed" });
      // A paid order cannot be paid again.
      expect(await simulatePayment(db, order, "pay")).toBe(false);
    });

    it(`leaves a ${method} order unpaid after a declined payment, ready for another try`, async () => {
      const order = await placeOrder(db, { paymentMethod: method });
      expect(await simulatePayment(db, order, "decline")).toBe(true);
      expect((await reloadOrder(db, order.id)).paymentStatus).toBe("unpaid");
      expect(await simulatePayment(db, order, "pay")).toBe(true);
      expect((await reloadOrder(db, order.id)).paymentStatus).toBe("paid");
    });
  }

  it("does nothing for an order that is paid on receipt", async () => {
    const order = await placeOrder(db, { paymentMethod: "cash" });
    expect(await simulatePayment(db, order, "pay")).toBe(false);
    expect((await reloadOrder(db, order.id)).paymentStatus).toBe("unpaid");
  });
});

describe("payment links", () => {
  const order = { number: 197, total: 5 };

  it("builds the Payme checkout link as in the documentation example", () => {
    const config = {
      merchantId: "587f72c72cac0d162c722ae2",
      login: "Paycom",
      key: "key",
      accountField: "order_id",
      checkoutUrl: "https://checkout.paycom.uz",
    };
    const url = paymeCheckoutUrl(config, order, "https://example.uz/uz/order/1", "uz");
    const [, encoded] = url.split("https://checkout.paycom.uz/");
    // The documentation's own example: m=587f72c72cac0d162c722ae2;ac.order_id=197;a=500
    expect(Buffer.from(encoded, "base64").toString()).toBe(
      "m=587f72c72cac0d162c722ae2;ac.order_id=197;a=500;l=uz;c=https://example.uz/uz/order/1",
    );
  });

  it("builds the Click link with the amount as N.NN", () => {
    const url = new URL(
      clickPayUrl({ serviceId: "11", merchantId: "22", secretKey: "s" }, order, "https://example.uz/uz/order/1"),
    );
    expect(url.origin + url.pathname).toBe("https://my.click.uz/services/pay");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      service_id: "11",
      merchant_id: "22",
      amount: "5.00",
      transaction_param: "197",
      return_url: "https://example.uz/uz/order/1",
    });
  });
});
