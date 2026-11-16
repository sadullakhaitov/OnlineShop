import { eq } from "drizzle-orm";
import { createLocalDb, type Db } from "@/db";
import { orders, type OrderStatus } from "@/db/schema";
import { getAllProducts } from "@/lib/catalog";
import { createOrder, type OrderInput, type OrderWithItems } from "./orders";

/** Helpers for the automated tests: a throwaway database and ready-made orders. */

export function testDb(): Promise<Db> {
  return createLocalDb();
}

export const inStockProduct = getAllProducts().find((product) => product.inStock)!;
export const soldOutProduct = getAllProducts().find((product) => !product.inStock)!;

export const orderInput: OrderInput = {
  items: [{ id: inStockProduct.id, quantity: 1 }],
  name: "Test Xaridor",
  phone: "+998 90 123 45 67",
  deliveryType: "pickup",
  paymentMethod: "payme",
  locale: "uz",
};

export async function placeOrder(db: Db, overrides: Partial<OrderInput> = {}): Promise<OrderWithItems> {
  const result = await createOrder(
    db,
    { ...orderInput, ...overrides },
    { methods: ["payme", "click", "cash"] },
  );
  if (!result.ok) throw new Error(`Test order was not created: ${result.error}`);
  return result.order;
}

export async function reloadOrder(db: Db, id: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  return order;
}

export async function setOrderStatus(db: Db, id: string, status: OrderStatus) {
  await db.update(orders).set({ status }).where(eq(orders.id, id));
}
