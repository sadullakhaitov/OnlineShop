import { unstable_cache } from "next/cache";
import { connection } from "next/server";
import { gte, sql } from "drizzle-orm";
import { databaseKind, getDb, type Db } from "@/db";
import { searchInterest } from "@/db/schema";
import { categories } from "@/data/categories";
import type { Product } from "@/data/products";
import type { Catalog } from "@/lib/catalog";

/**
 * What customers look for in the shop. Every search adds points to the
 * products it finds, and the home page leads with the products that were
 * found most in the last weeks, overall and in each category.
 */

/** Points for a product that a search found, and for one opened from the results. */
export const FOUND_POINTS = 1;
export const OPENED_POINTS = 3;

/** A search that finds more than this is too broad to say what someone wants. */
const MAX_FOUND = 12;

/** Only the searches of the last weeks count, so the list follows the season. */
const WINDOW_DAYS = 30;

/** Adds points to products for today. */
export async function addInterest(db: Db, productIds: string[], points: number, now = new Date()): Promise<void> {
  const ids = [...new Set(productIds)];
  if (!ids.length || points <= 0) return;
  const day = now.toISOString().slice(0, 10);
  await db
    .insert(searchInterest)
    .values(ids.map((productId) => ({ productId, day, score: points })))
    .onConflictDoUpdate({
      target: [searchInterest.productId, searchInterest.day],
      set: { score: sql`${searchInterest.score} + excluded.score` },
    });
}

/** Records a search typed by a customer: the products it finds get a point. */
export async function recordSearch(db: Db, catalog: Catalog, text: string): Promise<number> {
  const q = text.trim().slice(0, 80);
  if (q.length < 2) return 0;
  const found = catalog.find({ q });
  if (!found.length || found.length > MAX_FOUND) return 0;
  await addInterest(db, found.map((product) => product.id), FOUND_POINTS);
  // Now and then the old days are cleared away.
  if (Math.random() < 0.01) await forgetOldInterest(db);
  return found.length;
}

/** Records that a customer opened a product from the search results. */
export async function recordOpened(db: Db, catalog: Catalog, slug: string): Promise<boolean> {
  const product = catalog.bySlug(slug);
  if (!product) return false;
  await addInterest(db, [product.id], OPENED_POINTS);
  return true;
}

/** Points of every product searched for in the last weeks. */
export async function readInterest(db: Db, now = new Date()): Promise<Record<string, number>> {
  const since = new Date(now.getTime() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  const rows = await db
    .select({ productId: searchInterest.productId, score: sql<number>`sum(${searchInterest.score})::int` })
    .from(searchInterest)
    .where(gte(searchInterest.day, since))
    .groupBy(searchInterest.productId);
  return Object.fromEntries(rows.map((row) => [row.productId, Number(row.score)]));
}

/** Deletes counts older than the window; kept small, the table never grows much. */
export async function forgetOldInterest(db: Db, now = new Date()): Promise<void> {
  const before = new Date(now.getTime() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  await db.delete(searchInterest).where(sql`${searchInterest.day} < ${before}`);
}

export type TopProducts = { all: Product[]; byCategory: Record<string, Product[]> };

/**
 * The most searched-for products. Products nobody searched for yet keep the
 * shop's own order (its "hit" marks first), so a new shop still has a list.
 */
export function topProducts(catalog: Catalog, scores: Record<string, number>, limit: number): TopProducts {
  // `popular` returns the whole catalogue in the shop's order; the sort keeps it for equal scores.
  const ranked = catalog
    .popular(catalog.all().length)
    .filter((product) => product.inStock || (scores[product.id] ?? 0) > 0)
    .sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  const byCategory: Record<string, Product[]> = {};
  for (const category of categories) {
    byCategory[category.slug] = ranked.filter((product) => product.category === category.slug).slice(0, limit);
  }
  return { all: ranked.slice(0, limit), byCategory };
}

/** Marks the saved copy of the counts. */
export const INTEREST_TAG = "search-interest";

/**
 * Like the catalogue, the counts are kept in the host's cache so the home page
 * does not wake the database on every visit. They refresh every few minutes.
 */
const savedInterest = unstable_cache(async () => readInterest(await getDb()), ["search-interest-v1"], {
  tags: [INTEREST_TAG],
  revalidate: 300,
});

export async function getInterest(): Promise<Record<string, number>> {
  const kind = databaseKind();
  if (kind === "none") return {};
  try {
    if (kind === "embedded") {
      await connection();
      return await readInterest(await getDb());
    }
    return await savedInterest();
  } catch (error) {
    // The home page still opens, in the shop's own order.
    console.error("Search counts unavailable", error);
    return {};
  }
}
