import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { mapLinks } from "@/lib/maps";
import { createOrder } from "./orders";
import { orderInput, testDb } from "./testing";

let db: Db;
const options = { methods: ["payme" as const, "click" as const, "cash" as const] };
const delivery = { ...orderInput, deliveryType: "delivery" as const, zone: "buxoro-shahri" };

beforeAll(async () => {
  db = await testDb();
});

describe("delivery spot on the map", () => {
  it("keeps the spot and lets the address be short", async () => {
    const placed = await createOrder(db, { ...delivery, address: "", location: { lat: 39.77471234567, lng: 64.4286 } }, options);
    if (!placed.ok) throw new Error(placed.error);
    expect(placed.order).toMatchObject({ lat: 39.774712, lng: 64.4286, address: null });
  });

  it("still asks for an address without a spot, and refuses places far away", async () => {
    expect(await createOrder(db, { ...delivery, address: "" }, options)).toMatchObject({ ok: false, fields: ["address"] });
    expect(await createOrder(db, { ...delivery, address: "Mustaqillik 1", location: { lat: 51.5, lng: -0.1 } }, options)).toMatchObject({
      ok: false,
      error: "invalid",
    });
  });

  it("drops the spot for pickup", async () => {
    const placed = await createOrder(db, { ...orderInput, location: { lat: 39.77, lng: 64.43 } }, options);
    expect(placed.ok && placed.order.lat).toBeNull();
  });

  it("opens the spot in map apps", () => {
    expect(mapLinks(39.7747, 64.4286).yandex).toBe("https://yandex.uz/maps/?pt=64.428600,39.774700&z=17&l=map");
  });
});
