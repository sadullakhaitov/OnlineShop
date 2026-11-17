import { cache } from "react";
import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { asc, desc, eq, sql } from "drizzle-orm";
import { databaseKind, getDb, type Db } from "@/db";
import { products, type ProductRow } from "@/db/schema";
import { orderSpecs, products as sampleProducts, type Product } from "@/data/products";
import { createCatalog, type Catalog } from "@/lib/catalog";

/**
 * The shop's catalogue, read from the database.
 *
 * All products fit in memory comfortably, so the server keeps them there and
 * answers every catalogue question (filters, search, similar products) from
 * that copy. Before each use one small query checks that the copy is still
 * current: it compares a fingerprint of every product's id and version.
 */

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    art: row.art,
    brand: row.brand,
    model: row.model,
    title: `${row.brand} ${row.model}`,
    price: row.price,
    oldPrice: row.oldPrice ?? undefined,
    rating: row.rating,
    reviews: row.reviews,
    badge: row.badge ?? undefined,
    inStock: row.inStock,
    color: row.color,
    warranty: row.warranty,
    // The database does not keep the order of the keys, the shop does.
    specs: orderSpecs(row.specs),
  };
}

const copies = new WeakMap<Db, { fingerprint: string; catalog: Catalog }>();

/** The products customers can see, always as fresh as the database. */
export async function loadCatalog(db: Db): Promise<Catalog> {
  const [{ fingerprint }] = await db
    .select({
      fingerprint: sql<string>`md5(coalesce(string_agg(${products.id} || ':' || ${products.version}, ',' order by ${products.id}), ''))`,
    })
    .from(products);

  const copy = copies.get(db);
  if (copy?.fingerprint === fingerprint) return copy.catalog;

  // Hidden products are left out here, once, so that no page can show them.
  // The newest come first; products added together keep the order of their codes.
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.active, true))
    .orderBy(desc(products.createdAt), asc(products.id));
  const catalog = createCatalog(rows.map(toProduct));
  copies.set(db, { fingerprint, catalog });
  return catalog;
}

let sample: Catalog | undefined;

/**
 * Reads the catalogue as it is right now.
 *
 * A host with no database at all still shows the built-in sample products,
 * so that the shop can be looked at before a database is connected.
 *
 * Pages use `getCatalog` below. This one is for the product page, which is
 * kept ready between visits and so cannot wait for a request (see there).
 */
export const readCatalog = cache(async (): Promise<Catalog> => {
  const kind = databaseKind();
  if (kind === "none") return (sample ??= createCatalog(sampleProducts));
  if (kind === "embedded") return loadCatalog(await getDb());
  return createCatalog(await savedProducts());
});

/** Marks the saved copy of the catalogue; the admin panel clears it on every product change. */
export const CATALOG_TAG = "catalog";

/**
 * With PostgreSQL on a host such as Vercel every visit may start a fresh
 * server, and a free database sleeps when nobody uses it. So the products are
 * kept in the host's cache: pages answer without waking the database, and a
 * product saved in the admin panel clears the copy at once. Ten minutes is
 * only a safety net for changes made outside the admin panel.
 */
const savedProducts = unstable_cache(
  async (): Promise<Product[]> => (await loadCatalog(await getDb())).all(),
  ["catalog-products-v1"],
  { tags: [CATALOG_TAG], revalidate: 600 },
);

/**
 * The catalogue for pages and routes.
 *
 * With PostgreSQL a page may be prepared while the shop is being built and is
 * refreshed when a product changes in the admin panel. The embedded database
 * belongs to the one running server and must not be opened by a build, so
 * there the page waits for a real request instead.
 */
export async function getCatalog(): Promise<Catalog> {
  if (databaseKind() === "embedded") await connection();
  return readCatalog();
}

/**
 * Product page addresses to prepare while building. Only a PostgreSQL
 * database is read during a build; otherwise pages are made on first visit.
 */
export async function getBuildSlugs(): Promise<string[]> {
  const kind = databaseKind();
  if (kind === "none") return sampleProducts.map((product) => product.slug);
  if (kind === "embedded") return [];
  return (await loadCatalog(await getDb())).all().map((product) => product.slug);
}
