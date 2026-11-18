import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { products as seedProducts } from "@/data/products";
import type { ProductInput } from "@/lib/product-input";
import { testDb } from "@/server/testing";
import {
  PRODUCT_PAGE_SIZE,
  createProduct,
  getAdminProduct,
  kindHints,
  listAdminProducts,
  parseProduct,
  productState,
  setProductFlag,
  updateProduct,
} from "./products";

const tv: ProductInput = {
  image: null,
  stock: null,
  category: "tv-audio",
  art: "tv",
  brand: "Samsung",
  model: 'Neo QLED 65"',
  price: 18_990_000,
  oldPrice: 21_490_000,
  badge: "new",
  color: "black",
  warranty: 2,
  inStock: true,
  active: true,
  specs: {
    screen: { uz: '65"', ru: '65"' },
    feature: { uz: "Smart TV, 120 Hz", ru: "Smart TV, 120 Гц" },
  },
};

describe("parseProduct", () => {
  it("tidies the text and keeps what was written", () => {
    const parsed = parseProduct({ ...tv, brand: "  Samsung ", model: "Neo   QLED  65\" " });
    expect(parsed).toMatchObject({ ok: true, values: { brand: "Samsung", model: 'Neo QLED 65"', price: 18_990_000 } });
  });

  it("shows a specification written in one language in both, and drops empty ones", () => {
    const parsed = parseProduct({
      ...tv,
      specs: {
        resolution: { uz: "4K UHD", ru: "" },
        type: { uz: "", ru: " OLED " },
        noise: { uz: "  ", ru: "" },
      },
    });
    expect(parsed.ok && parsed.values.specs).toEqual({
      type: { uz: "OLED", ru: "OLED" },
      resolution: { uz: "4K UHD", ru: "4K UHD" },
    });
  });

  it("names the fields that have to be corrected", () => {
    const fields = (input: unknown) => {
      const parsed = parseProduct(input);
      return parsed.ok ? [] : parsed.fields;
    };
    expect(fields({ ...tv, brand: " ", model: "" })).toEqual(["brand", "model"]);
    expect(fields({ ...tv, price: 500 })).toEqual(["price"]);
    expect(fields({ ...tv, price: 1_990_000.5 })).toEqual(["price"]);
    expect(fields({ ...tv, category: "garden" })).toEqual(["category"]);
    expect(fields({ ...tv, art: "tractor" })).toEqual(["art"]);
    expect(fields({ ...tv, warranty: 0 })).toEqual(["warranty"]);
    expect(fields({ ...tv, specs: { screen: { uz: "x".repeat(61), ru: "" } } })).toEqual(["specs"]);
    expect(fields({ ...tv, specs: { weight: { uz: "12 kg", ru: "12 кг" } } })).toEqual(["specs"]);
    expect(fields(null)).not.toEqual([]);
  });

  it("keeps a photo link only when it is https", () => {
    const photo = "https://example.com/tv.jpg";
    expect(parseProduct({ ...tv, image: ` ${photo} ` })).toMatchObject({ ok: true, values: { image: photo } });
    expect(parseProduct({ ...tv, image: "http://example.com/tv.jpg" })).toEqual({ ok: false, fields: ["image"] });
    expect(parseProduct({ ...tv, image: "javascript:alert(1)" })).toEqual({ ok: false, fields: ["image"] });
    expect(parseProduct({ ...tv, image: null })).toMatchObject({ ok: true, values: { image: null } });
  });

  it("refuses a crossed-out price that is not higher than the price", () => {
    expect(parseProduct({ ...tv, oldPrice: tv.price })).toEqual({ ok: false, fields: ["oldPrice"] });
    expect(parseProduct({ ...tv, oldPrice: tv.price - 1 })).toEqual({ ok: false, fields: ["oldPrice"] });
    expect(parseProduct({ ...tv, oldPrice: null }).ok).toBe(true);
  });
});

describe("admin products", () => {
  let db: Db;

  beforeEach(async () => {
    db = await testDb();
  });

  const create = async (input: Partial<ProductInput> = {}) => {
    const result = await createProduct(db, { ...tv, ...input });
    if (!result.ok) throw new Error(`Test product was not created: ${result.error}`);
    return result.product;
  };

  it("starts with the sample catalogue", async () => {
    const list = await listAdminProducts(db);
    expect(list.total).toBe(seedProducts.length);
    expect(list.products).toHaveLength(PRODUCT_PAGE_SIZE);
    expect(list.products[0]).toMatchObject({ id: "p-001", active: true });
    expect(list.counts).toEqual({
      onSale: seedProducts.filter((product) => product.inStock).length,
      soldOut: seedProducts.filter((product) => !product.inStock).length,
      hidden: 0,
    });
  });

  it("gives a new product the next code and an address made of its name", async () => {
    const product = await create();
    expect(product).toMatchObject({
      id: `p-${String(seedProducts.length + 1).padStart(3, "0")}`,
      slug: "samsung-neo-qled-65",
      rating: 0,
      reviews: 0,
      version: 1,
      specs: tv.specs,
    });
    expect(productState(product)).toBe("onSale");

    // The same model in another colour gets an address of its own.
    const second = await create({ color: "silver" });
    expect(second.slug).toBe("samsung-neo-qled-65-2");
    expect(Number(second.id.slice(2))).toBe(Number(product.id.slice(2)) + 1);

    // A name without Latin letters or digits falls back to the code.
    const cyrillic = await create({ brand: "Артель", model: "Шифо" });
    expect(cyrillic.slug).toBe(cyrillic.id);
  });

  it("keeps the codes apart when products are added at the same moment", async () => {
    const results = await Promise.all(Array.from({ length: 4 }, () => create()));
    expect(new Set(results.map((product) => product.id)).size).toBe(4);
    expect(new Set(results.map((product) => product.slug)).size).toBe(4);
  });

  it("does not add a product that fails the checks", async () => {
    expect(await createProduct(db, { ...tv, price: 0 })).toEqual({ ok: false, error: "invalid", fields: ["price"] });
    expect((await listAdminProducts(db)).total).toBe(seedProducts.length);
  });

  it("saves changes and counts the versions", async () => {
    const product = await create();
    const saved = await updateProduct(db, product.id, product.version, { ...tv, model: "Neo QLED 75", price: 24_990_000, oldPrice: null });
    expect(saved).toMatchObject({
      ok: true,
      product: {
        id: product.id,
        // The address stays, so that links and favourites keep working.
        slug: product.slug,
        model: "Neo QLED 75",
        price: 24_990_000,
        oldPrice: null,
        version: 2,
      },
    });
    expect(saved.ok && saved.product.updatedAt.getTime()).toBeGreaterThanOrEqual(product.updatedAt.getTime());
  });

  it("refuses to save over somebody else's change", async () => {
    const product = await create();
    await setProductFlag(db, product.id, "inStock", false);

    expect(await updateProduct(db, product.id, product.version, { ...tv, price: 1_000_000, oldPrice: null })).toEqual({
      ok: false,
      error: "stale",
    });
    expect(await getAdminProduct(db, product.id)).toMatchObject({ price: tv.price, inStock: false, version: 2 });

    expect(await updateProduct(db, "p-999", 1, tv)).toEqual({ ok: false, error: "missing" });
    expect(await updateProduct(db, product.id, 2, { ...tv, brand: "" })).toEqual({ ok: false, error: "invalid", fields: ["brand"] });
  });

  it("flips the switches of the list", async () => {
    const product = await create();

    const soldOut = await setProductFlag(db, product.id, "inStock", false);
    expect(soldOut.ok && productState(soldOut.product)).toBe("soldOut");

    const hidden = await setProductFlag(db, product.id, "active", false);
    expect(hidden).toMatchObject({ ok: true, product: { inStock: false, active: false, version: 3 } });
    expect(hidden.ok && productState(hidden.product)).toBe("hidden");

    expect(await setProductFlag(db, "p-999", "active", false)).toEqual({ ok: false, error: "missing" });
  });

  it("lists by state, section and search", async () => {
    const product = await create();
    const hidden = await create({ brand: "Artel", model: "Hidden 43", active: false });

    // The newest come first.
    const all = await listAdminProducts(db);
    expect(all.products.slice(0, 2).map((item) => item.id)).toEqual([hidden.id, product.id]);
    expect(all.pages).toBe(Math.ceil((seedProducts.length + 2) / PRODUCT_PAGE_SIZE));

    const onlyHidden = await listAdminProducts(db, { state: "hidden" });
    expect(onlyHidden.products.map((item) => item.id)).toEqual([hidden.id]);
    expect(onlyHidden.total).toBe(1);

    const soldOut = await listAdminProducts(db, { state: "soldOut" });
    expect(soldOut.products.every((item) => item.active && !item.inStock)).toBe(true);
    expect(soldOut.total).toBe(seedProducts.filter((item) => !item.inStock).length);

    // Every word has to match; capital letters do not matter.
    const found = await listAdminProducts(db, { q: "qled SAMSUNG" });
    expect(found.products.map((item) => item.id)).toEqual([product.id]);
    expect(found.counts).toEqual({ onSale: 1, soldOut: 0, hidden: 0 });

    const byCode = await listAdminProducts(db, { q: "P-001" });
    expect(byCode.products.map((item) => item.id)).toEqual(["p-001"]);

    // Signs that mean "anything" in a database search are plain text here.
    expect((await listAdminProducts(db, { q: "%" })).total).toBe(0);

    const section = await listAdminProducts(db, { category: "climate" });
    expect(section.total).toBe(seedProducts.filter((item) => item.category === "climate").length);
    expect(section.products.every((item) => item.category === "climate")).toBe(true);

    const last = await listAdminProducts(db, { page: 99 });
    expect(last.page).toBe(last.pages);
    expect(last.products.length).toBeGreaterThan(0);
  });

  it("suggests what products of a kind usually have", async () => {
    const hints = await kindHints(db);
    expect(hints.tv).toEqual({ specs: ["type", "screen", "resolution", "feature"], category: "tv-audio", color: "black" });
    expect(hints.ac).toMatchObject({ specs: ["area", "energy", "noise", "feature"], category: "climate" });
    // Headphones are sold in two sections; the form offers the first one filled in.
    expect(hints.headphones.category).toBe("tv-audio");
  });
});
