import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import { searchInterest } from "@/db/schema";
import { createCatalog, type Catalog } from "@/lib/catalog";
import { products as seedProducts } from "@/data/products";
import { loadCatalog } from "./catalog";
import { addInterest, forgetOldInterest, readInterest, recordOpened, recordSearch, topProducts } from "./search-interest";
import { testDb } from "./testing";

let db: Db;
let catalog: Catalog;

beforeAll(async () => {
  db = await testDb();
  catalog = await loadCatalog(db);
});

const dyson = seedProducts.find((product) => product.title === "Dyson V8 Absolute")!;
const iphone = seedProducts.find((product) => product.title === "Apple iPhone 15")!;

describe("search counts", () => {
  it("adds points to what a search finds and more to what is opened", async () => {
    await db.delete(searchInterest);
    expect(await recordSearch(db, catalog, "dyson v8")).toBe(1);
    expect(await recordSearch(db, catalog, "DYSON V8")).toBe(1);
    expect(await recordOpened(db, catalog, dyson.slug)).toBe(true);
    expect(await recordOpened(db, catalog, "no-such-product")).toBe(false);
    expect((await readInterest(db))[dyson.id]).toBe(5);
  });

  it("ignores searches that are too short, find nothing or find too much", async () => {
    await db.delete(searchInterest);
    expect(await recordSearch(db, catalog, "d")).toBe(0);
    expect(await recordSearch(db, catalog, "qwertyuiop")).toBe(0);
    expect(await recordSearch(db, catalog, "a")).toBe(0);
    expect(await recordSearch(db, catalog, "samsung")).toBeGreaterThan(0);
    expect(await readInterest(db)).not.toEqual({});
  });

  it("counts only the last weeks", async () => {
    await db.delete(searchInterest);
    const now = new Date("2026-11-18T12:00:00Z");
    await addInterest(db, [iphone.id], 10, new Date("2026-09-01T12:00:00Z"));
    await addInterest(db, [iphone.id], 2, new Date("2026-11-17T12:00:00Z"));
    expect((await readInterest(db, now))[iphone.id]).toBe(2);
    await forgetOldInterest(db, now);
    expect(await db.select().from(searchInterest)).toHaveLength(1);
  });
});

describe("top products", () => {
  it("leads with the most searched, then keeps the shop's own order", () => {
    const shop = createCatalog(seedProducts);
    const top = topProducts(shop, { [iphone.id]: 9, [dyson.id]: 4 }, 5);
    expect(top.all.slice(0, 2).map((product) => product.id)).toEqual([iphone.id, dyson.id]);
    expect(top.all).toHaveLength(5);
    expect(top.byCategory[iphone.category]![0]!.id).toBe(iphone.id);
    expect(top.byCategory[dyson.category]![0]!.id).toBe(dyson.id);
    for (const [slug, list] of Object.entries(top.byCategory)) {
      expect(list.every((product) => product.category === slug)).toBe(true);
    }
    // Without any searches the list is the shop's own "popular" order.
    expect(topProducts(shop, {}, 4).all.map((product) => product.id)).toEqual(
      shop.popular(60).filter((product) => product.inStock).slice(0, 4).map((product) => product.id),
    );
  });
});
