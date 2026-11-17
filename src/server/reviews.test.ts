import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { customers, orders, products } from "@/db/schema";
import { cleanReview, moderateReview, productReviews, publicName, reviewChances, submitReview } from "./reviews";
import { inStockProduct, placeOrder, setOrderStatus, testDb } from "./testing";

let db: Db;

beforeAll(async () => {
  db = await testDb();
});

async function customerWithOrder(phone: string) {
  const [customer] = await db.insert(customers).values({ phone, name: "Sardor Karimov" }).returning();
  const order = await placeOrder(db);
  await db.update(orders).set({ customerId: customer!.id }).where(eq(orders.id, order.id));
  return { customer: customer!, order };
}

describe("review rules", () => {
  it("checks stars and text", () => {
    expect(cleanReview({ rating: 5, text: "  Zo'r   muzlatgich \n\n\n\nRahmat " })).toEqual({ rating: 5, text: "Zo'r muzlatgich \n\nRahmat" });
    expect(cleanReview({ rating: 0, text: "Yaxshi" })).toBeNull();
    expect(cleanReview({ rating: 4.5, text: "Yaxshi" })).toBeNull();
    expect(cleanReview({ rating: 4, text: "ok" })).toBeNull();
    expect(cleanReview({ rating: 4, text: "x".repeat(1001) })).toBeNull();
  });

  it("shows only the first name and an initial", () => {
    expect(publicName("Sardor Karimov")).toBe("Sardor K.");
    expect(publicName(" Ali ")).toBe("Ali");
    expect(publicName(null)).toBe("");
  });
});

describe("writing reviews", () => {
  it("waits for the delivery, takes one review per product and counts it once approved", async () => {
    const { customer, order } = await customerWithOrder("+998901110001");
    const review = { orderId: order.id, productId: inStockProduct.id, rating: 4, text: "Yaxshi ishlayapti" };

    expect(await submitReview(db, customer, review)).toEqual({ ok: false, error: "forbidden" });
    await setOrderStatus(db, order.id, "delivered");
    expect((await reviewChances(db, customer.id, order.id)).get(inStockProduct.id)).toBeNull();

    expect(await submitReview(db, customer, review)).toEqual({ ok: true });
    expect(await submitReview(db, customer, review)).toEqual({ ok: false, error: "already" });
    expect((await reviewChances(db, customer.id, order.id)).get(inStockProduct.id)).toBe("pending");
    expect(await productReviews(db, inStockProduct.id)).toEqual([]);

    const [pending] = await db.query.reviews.findMany();
    const [before] = await db.select().from(products).where(eq(products.id, inStockProduct.id));
    expect(await moderateReview(db, pending!.id, "approve")).toBe(inStockProduct.id);
    const [after] = await db.select().from(products).where(eq(products.id, inStockProduct.id));
    expect(after).toMatchObject({ rating: 4, reviews: 1, version: before!.version + 1 });

    const shown = await productReviews(db, inStockProduct.id);
    expect(shown).toMatchObject([{ name: "Sardor K.", rating: 4, text: "Yaxshi ishlayapti" }]);

    await moderateReview(db, pending!.id, "reject");
    const [rejected] = await db.select().from(products).where(eq(products.id, inStockProduct.id));
    expect(rejected).toMatchObject({ rating: 0, reviews: 0 });
  });

  it("refuses someone else's order", async () => {
    const { order } = await customerWithOrder("+998901110002");
    await setOrderStatus(db, order.id, "delivered");
    const [stranger] = await db.insert(customers).values({ phone: "+998901110003" }).returning();
    const result = await submitReview(db, stranger!, { orderId: order.id, productId: inStockProduct.id, rating: 5, text: "Zo'r" });
    expect(result).toEqual({ ok: false, error: "forbidden" });
  });
});
