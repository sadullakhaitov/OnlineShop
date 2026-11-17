import { and, avg, count, desc, eq, inArray, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { databaseKind, getDb, type Db } from "@/db";
import { orderItems, orders, products, reviews, type Review, type ReviewStatus } from "@/db/schema";
import { CATALOG_TAG } from "@/server/catalog";

/**
 * Reviews from customers who bought the product. A review waits for the
 * admin's approval; approved ones make the product's stars.
 */

export const REVIEW_TEXT_MIN = 3;
export const REVIEW_TEXT_MAX = 1000;

export type ReviewInput = { rating: number; text: string };

export function cleanReview(raw: { rating?: unknown; text?: unknown } | null | undefined): ReviewInput | null {
  const rating = raw?.rating;
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  if (typeof raw?.text !== "string") return null;
  // Line breaks are kept, runs of blank lines and spaces are not.
  const text = raw.text
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (text.length < REVIEW_TEXT_MIN || text.length > REVIEW_TEXT_MAX) return null;
  return { rating, text };
}

/** "Sardor Karimov" is shown as "Sardor K.": enough to be real, not enough to find. */
export function publicName(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const [first, second] = words;
  return second ? `${first} ${second[0]!.toUpperCase()}.` : first!;
}

/**
 * What the customer may say about this order's products: for each product,
 * the status of their review, or null when they can still write one. Empty
 * when the order is not theirs or has not been delivered.
 */
export async function reviewChances(db: Db, customerId: string, orderId: string): Promise<Map<string, ReviewStatus | null>> {
  const chances = new Map<string, ReviewStatus | null>();
  const [order] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId)))
    .limit(1);
  if (order?.status !== "delivered") return chances;

  const items = await db.select({ productId: orderItems.productId }).from(orderItems).where(eq(orderItems.orderId, orderId));
  const ids = [...new Set(items.map((item) => item.productId))];
  if (ids.length === 0) return chances;
  const written = await db
    .select({ productId: reviews.productId, status: reviews.status })
    .from(reviews)
    .where(and(eq(reviews.customerId, customerId), inArray(reviews.productId, ids)));
  for (const id of ids) chances.set(id, written.find((review) => review.productId === id)?.status ?? null);
  return chances;
}

export type SubmitReviewResult = { ok: true } | { ok: false; error: "invalid" | "forbidden" | "already" };

export async function submitReview(
  db: Db,
  customer: { id: string; name: string | null },
  raw: { orderId?: unknown; productId?: unknown; rating?: unknown; text?: unknown },
): Promise<SubmitReviewResult> {
  const input = cleanReview(raw);
  if (!input || typeof raw.orderId !== "string" || typeof raw.productId !== "string") return { ok: false, error: "invalid" };
  if (!/^[0-9a-f-]{36}$/i.test(raw.orderId)) return { ok: false, error: "forbidden" };

  const chances = await reviewChances(db, customer.id, raw.orderId);
  if (!chances.has(raw.productId)) return { ok: false, error: "forbidden" };
  if (chances.get(raw.productId) !== null) return { ok: false, error: "already" };

  const [order] = await db.select({ name: orders.name }).from(orders).where(eq(orders.id, raw.orderId)).limit(1);
  const inserted = await db
    .insert(reviews)
    .values({
      productId: raw.productId,
      customerId: customer.id,
      orderId: raw.orderId,
      name: publicName(customer.name || order?.name) || "—",
      rating: input.rating,
      text: input.text,
    })
    .onConflictDoNothing()
    .returning({ id: reviews.id });
  return inserted.length > 0 ? { ok: true } : { ok: false, error: "already" };
}

export type PublicReview = Pick<Review, "id" | "name" | "rating" | "text" | "createdAt">;

/** Approved reviews of a product, newest first. */
export async function productReviews(db: Db, productId: string, limit = 20): Promise<PublicReview[]> {
  return db
    .select({ id: reviews.id, name: reviews.name, rating: reviews.rating, text: reviews.text, createdAt: reviews.createdAt })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "approved")))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

export type ShownReview = { id: string; name: string; rating: number; text: string; date: string };

const shown = async (productId: string): Promise<ShownReview[]> =>
  (await productReviews(await getDb(), productId)).map(({ createdAt, ...review }) => ({ ...review, date: createdAt.toISOString() }));

// Kept in the host's cache beside the catalogue; moderating a review clears both.
const savedReviews = unstable_cache(shown, ["product-reviews-v1"], { tags: [CATALOG_TAG], revalidate: 600 });

/** Approved reviews for the product page, which is prepared ahead and cannot ask for the request. */
export async function readProductReviews(productId: string): Promise<ShownReview[]> {
  const kind = databaseKind();
  if (kind === "none") return [];
  return kind === "embedded" ? shown(productId) : savedReviews(productId);
}

/** For the admin: reviews in one state, newest first. */
export async function listReviews(db: Db, status: ReviewStatus, limit = 100): Promise<Review[]> {
  return db.select().from(reviews).where(eq(reviews.status, status)).orderBy(desc(reviews.createdAt)).limit(limit);
}

export async function countPendingReviews(db: Db): Promise<number> {
  const [row] = await db.select({ n: count() }).from(reviews).where(eq(reviews.status, "pending"));
  return Number(row?.n ?? 0);
}

/**
 * Approves or rejects a review, or deletes it, and makes the product's stars
 * from its approved reviews again. Returns the product id, or null when the
 * review is gone.
 */
export async function moderateReview(db: Db, id: string, action: "approve" | "reject" | "delete"): Promise<string | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return db.transaction(async (tx) => {
    const [review] =
      action === "delete"
        ? await tx.delete(reviews).where(eq(reviews.id, id)).returning({ productId: reviews.productId })
        : await tx
            .update(reviews)
            .set({ status: action === "approve" ? "approved" : "rejected" })
            .where(eq(reviews.id, id))
            .returning({ productId: reviews.productId });
    if (!review) return null;

    const [stats] = await tx
      .select({ average: avg(reviews.rating), total: count() })
      .from(reviews)
      .where(and(eq(reviews.productId, review.productId), eq(reviews.status, "approved")));
    const total = Number(stats?.total ?? 0);
    const average = total > 0 ? Math.round(Number(stats?.average ?? 0) * 10) / 10 : 0;
    await tx
      .update(products)
      .set({ rating: average, reviews: total, version: sql`${products.version} + 1`, updatedAt: new Date() })
      .where(eq(products.id, review.productId));
    return review.productId;
  });
}
