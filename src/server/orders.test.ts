import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { FREE_DELIVERY_FROM, getDeliveryZone } from "@/data/delivery";
import { products as seedProducts } from "@/data/products";
import { MAX_QUANTITY } from "@/lib/limits";
import { createOrder, getOrder, isPayable, markOrderPaid } from "./orders";
import { inStockProduct, orderInput, placeOrder, reloadOrder, soldOutProduct, testDb } from "./testing";

let db: Db;
const methods = ["payme", "click", "cash"] as const;
const options = { methods: [...methods] };

beforeAll(async () => {
  db = await testDb();
});

describe("createOrder", () => {
  it("takes prices from the catalogue and numbers orders from 100001", async () => {
    const first = await placeOrder(db, { items: [{ id: inStockProduct.id, quantity: 2 }] });
    expect(first.number).toBeGreaterThanOrEqual(100001);
    expect(first.subtotal).toBe(inStockProduct.price * 2);
    expect(first).toMatchObject({
      total: first.subtotal,
      deliveryFee: 0,
      status: "new",
      paymentStatus: "unpaid",
      phone: "+998901234567",
      zone: null,
      address: null,
    });
    expect(first.items).toEqual([
      expect.objectContaining({
        productId: inStockProduct.id,
        title: inStockProduct.title,
        price: inStockProduct.price,
        quantity: 2,
      }),
    ]);

    const second = await placeOrder(db);
    expect(second.number).toBe(first.number + 1);

    // A price sent by the browser is simply not part of the order.
    const tampered = { ...orderInput, items: [{ id: inStockProduct.id, quantity: 1, price: 1 }], total: 1 };
    const result = await createOrder(db, tampered, options);
    expect(result.ok && result.order.total).toBe(inStockProduct.price);
  });

  it("adds the delivery fee of the zone, and none above the free-delivery amount", async () => {
    const zone = getDeliveryZone("gijduvon")!;
    const cheap = [...seedProducts]
      .filter((product) => product.inStock)
      .sort((a, b) => a.price - b.price)[0];
    expect(cheap.price).toBeLessThan(FREE_DELIVERY_FROM);

    const paidDelivery = await placeOrder(db, {
      items: [{ id: cheap.id, quantity: 1 }],
      deliveryType: "delivery",
      zone: zone.slug,
      address: "Mustaqillik ko'chasi, 12-uy",
    });
    expect(paidDelivery).toMatchObject({
      deliveryFee: zone.fee,
      total: cheap.price + zone.fee,
      zone: zone.slug,
      address: "Mustaqillik ko'chasi, 12-uy",
    });

    const quantity = Math.min(MAX_QUANTITY, Math.ceil(FREE_DELIVERY_FROM / inStockProduct.price));
    const large = await placeOrder(db, {
      items: [{ id: inStockProduct.id, quantity }],
      deliveryType: "delivery",
      zone: zone.slug,
      address: "Mustaqillik ko'chasi, 12-uy",
    });
    if (large.subtotal >= FREE_DELIVERY_FROM) expect(large.deliveryFee).toBe(0);
    else expect(large.deliveryFee).toBe(zone.fee);
  });

  it("merges repeated lines and keeps the quantity within the limit", async () => {
    const order = await placeOrder(db, {
      items: [
        { id: inStockProduct.id, quantity: MAX_QUANTITY },
        { id: inStockProduct.id, quantity: 3 },
      ],
    });
    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(MAX_QUANTITY);
  });

  it("names the fields that are wrong", async () => {
    const check = async (overrides: Record<string, unknown>) => {
      const result = await createOrder(db, { ...orderInput, ...overrides }, options);
      return result.ok ? "ok" : result.error === "invalid" ? result.fields : result.error;
    };

    expect(await check({ phone: "12345" })).toEqual(["phone"]);
    expect(await check({ name: " " })).toEqual(["name"]);
    expect(await check({ items: [] })).toEqual(["items"]);
    expect(await check({ items: [{ id: inStockProduct.id, quantity: MAX_QUANTITY + 1 }] })).toEqual(["items"]);
    expect(await check({ deliveryType: "delivery" })).toEqual(["zone", "address"]);
    expect(await check({ deliveryType: "delivery", zone: "toshkent", address: "Chilonzor, 5-uy" })).toEqual(["zone"]);
    expect(await check({ locale: "en" })).toEqual(["locale"]);
    expect((await createOrder(db, null, options)).ok).toBe(false);
    expect((await createOrder(db, "not an order", options)).ok).toBe(false);
  });

  it("refuses products that are gone or sold out, and payment methods that are off", async () => {
    const soldOut = await createOrder(
      db,
      { ...orderInput, items: [{ id: soldOutProduct.id, quantity: 1 }, { id: "p-000", quantity: 1 }] },
      options,
    );
    expect(soldOut).toEqual({ ok: false, error: "unavailable", ids: [soldOutProduct.id, "p-000"] });

    const noPayme = await createOrder(db, orderInput, { methods: ["cash"] });
    expect(noPayme).toEqual({ ok: false, error: "payment" });
  });

  it("refuses an order when the total differs from the one the customer saw", async () => {
    const stale = await createOrder(db, { ...orderInput, expectedTotal: inStockProduct.price - 1000 }, options);
    expect(stale).toEqual({ ok: false, error: "changed", total: inStockProduct.price });

    const fresh = await createOrder(db, { ...orderInput, expectedTotal: inStockProduct.price }, options);
    expect(fresh.ok).toBe(true);
  });
});

describe("reading and paying orders", () => {
  it("finds an order only by its exact id", async () => {
    const order = await placeOrder(db);
    expect((await getOrder(db, order.id))?.items).toHaveLength(1);
    expect(await getOrder(db, "not-an-id")).toBeNull();
    expect(await getOrder(db, "00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  it("marks an order as paid only once", async () => {
    const order = await placeOrder(db);
    const at = new Date();
    const pay = () => db.transaction((tx) => markOrderPaid(tx, order.id, "click", at));

    expect(await pay()).toBe(true);
    expect(await pay()).toBe(false);
    const paid = await reloadOrder(db, order.id);
    expect(paid).toMatchObject({ paymentStatus: "paid", paymentMethod: "click", status: "confirmed" });
    expect(isPayable(paid)).toBe(false);
  });
});
