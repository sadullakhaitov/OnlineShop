import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { products } from "@/db/schema";
import { products as seedProducts, specKeys } from "@/data/products";
import type { ProductInput } from "@/lib/product-input";
import { createProduct, setProductFlag, updateProduct } from "./admin/products";
import { loadCatalog } from "./catalog";
import { createOrder } from "./orders";
import { orderInput, testDb } from "./testing";

const kettle: ProductInput = {
  image: null,
  stock: null,
  category: "kitchen",
  art: "kettle",
  brand: "Tefal",
  model: "Glass Kettle KI772",
  price: 450_000,
  oldPrice: null,
  badge: null,
  color: "black",
  warranty: 1,
  inStock: true,
  active: true,
  specs: { feature: { uz: "Shisha korpus", ru: "Стеклянный корпус" }, volume: { uz: "1.7 l", ru: "1,7 л" } },
};

describe("catalogue", () => {
  let db: Db;

  beforeEach(async () => {
    db = await testDb();
  });

  const order = (id: string) =>
    createOrder(db, { ...orderInput, items: [{ id, quantity: 1 }] }, { methods: ["payme", "click", "cash"] });

  it("starts as the sample catalogue, product for product", async () => {
    const catalog = await loadCatalog(db);
    expect(catalog.all()).toEqual(seedProducts);
  });

  it("is read once and kept until a product changes", async () => {
    const first = await loadCatalog(db);
    expect(await loadCatalog(db)).toBe(first);

    const product = first.byId("p-001")!;
    const row = { ...kettle, category: product.category, art: product.art, brand: product.brand, model: product.model };
    const [{ version }] = await db.select({ version: products.version }).from(products).where(eq(products.id, product.id));
    const saved = await updateProduct(db, product.id, version!, { ...row, price: product.price + 100_000 });
    expect(saved.ok).toBe(true);

    const second = await loadCatalog(db);
    expect(second).not.toBe(first);
    expect(second.byId("p-001")?.price).toBe(product.price + 100_000);
    expect(await loadCatalog(db)).toBe(second);
  });

  it("charges the price of the moment the order is placed", async () => {
    const created = await createProduct(db, kettle);
    if (!created.ok) throw new Error("no product");
    const { id, version } = created.product;

    const before = await order(id);
    expect(before.ok && before.order.total).toBe(450_000);

    await updateProduct(db, id, version, { ...kettle, price: 390_000, oldPrice: 450_000 });
    const after = await order(id);
    expect(after.ok && after.order.total).toBe(390_000);
    expect(after.ok && after.order.items[0]).toMatchObject({ title: "Tefal Glass Kettle KI772", price: 390_000 });
  });

  it("does not sell what is hidden or sold out", async () => {
    const created = await createProduct(db, kettle);
    if (!created.ok) throw new Error("no product");
    const { id, slug } = created.product;
    expect((await loadCatalog(db)).bySlug(slug)?.id).toBe(id);

    await setProductFlag(db, id, "inStock", false);
    expect((await loadCatalog(db)).byId(id)?.inStock).toBe(false);
    expect(await order(id)).toEqual({ ok: false, error: "unavailable", ids: [id] });

    await setProductFlag(db, id, "inStock", true);
    await setProductFlag(db, id, "active", false);
    const catalog = await loadCatalog(db);
    expect(catalog.byId(id)).toBeUndefined();
    expect(catalog.bySlug(slug)).toBeUndefined();
    expect(catalog.search("glass kettle", "uz")).toEqual([]);
    expect(catalog.cartProducts([id], "uz")).toEqual([]);
    expect(catalog.all()).toHaveLength(seedProducts.length);
    expect(await order(id)).toEqual({ ok: false, error: "unavailable", ids: [id] });

    await setProductFlag(db, id, "active", true);
    expect((await order(id)).ok).toBe(true);
  });

  it("shows a new product in search, in its section and among similar ones", async () => {
    const created = await createProduct(db, kettle);
    if (!created.ok) throw new Error("no product");
    const catalog = await loadCatalog(db);
    const product = catalog.byId(created.product.id)!;

    expect(product).toMatchObject({ title: "Tefal Glass Kettle KI772", rating: 0, reviews: 0 });
    // Specifications come in the shop's order whatever order they were saved in.
    expect(Object.keys(product.specs)).toEqual(specKeys.filter((key) => key in kettle.specs));

    expect(catalog.search("tefal glass", "ru").map((hit) => hit.slug)).toContain(product.slug);
    expect(catalog.find({ category: "kitchen", brands: ["Tefal"] }).map((item) => item.id)).toContain(product.id);
    expect(catalog.categoryCounts().kitchen).toBe(seedProducts.filter((item) => item.category === "kitchen").length + 1);

    const otherKettle = catalog.all().find((item) => item.art === "kettle" && item.id !== product.id)!;
    expect(catalog.related(otherKettle, 5).map((item) => item.id)).toContain(product.id);
  });

  it("puts the shop's hits first in the popular order", async () => {
    const created = await createProduct(db, { ...kettle, badge: "hit" });
    if (!created.ok) throw new Error("no product");
    const catalog = await loadCatalog(db);

    const hits = seedProducts.filter((item) => item.badge === "hit").length + 1;
    const popular = catalog.popular(hits + 2);
    expect(popular.slice(0, hits).every((item) => item.badge === "hit")).toBe(true);
    expect(popular.map((item) => item.id)).toContain(created.product.id);
  });
});
