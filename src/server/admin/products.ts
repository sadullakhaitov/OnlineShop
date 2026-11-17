import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { products, type ProductRow } from "@/db/schema";
import { categories } from "@/data/categories";
import { artKinds, colorKeys, slugify, specKeys, type ProductSpecs, type SpecKey } from "@/data/products";
import { PRODUCT_LIMITS, type KindHints, type ProductField, type ProductInput } from "@/lib/product-input";

/** What the admin panel reads and changes in products. */

export const PRODUCT_PAGE_SIZE = 20;

/** A product is in exactly one of these: on sale, sold out, or hidden from the shop. */
export const PRODUCT_STATES = ["onSale", "soldOut", "hidden"] as const;
export type ProductState = (typeof PRODUCT_STATES)[number];

export function productState(product: Pick<ProductRow, "active" | "inStock">): ProductState {
  if (!product.active) return "hidden";
  return product.inStock ? "onSale" : "soldOut";
}

const tidy = (value: string) => value.replace(/\s+/g, " ").trim();
const price = z.number().int().min(PRODUCT_LIMITS.minPrice).max(PRODUCT_LIMITS.maxPrice);
const specText = z.string().max(200).transform(tidy).pipe(z.string().max(PRODUCT_LIMITS.spec));
const specPair = z.object({ uz: specText, ru: specText });

const inputSchema = z.object({
  category: z.string().refine((slug) => categories.some((category) => category.slug === slug)),
  art: z.enum(artKinds),
  brand: z.string().max(200).transform(tidy).pipe(z.string().min(1).max(PRODUCT_LIMITS.brand)),
  model: z.string().max(200).transform(tidy).pipe(z.string().min(1).max(PRODUCT_LIMITS.model)),
  price,
  oldPrice: price.nullable(),
  badge: z.enum(["hit", "new"]).nullable(),
  color: z.enum(colorKeys),
  warranty: z.number().int().min(PRODUCT_LIMITS.minWarranty).max(PRODUCT_LIMITS.maxWarranty),
  inStock: z.boolean(),
  active: z.boolean(),
  // Only the specifications the shop knows how to name.
  specs: z.strictObject(
    Object.fromEntries(specKeys.map((key) => [key, specPair.optional()])) as Record<SpecKey, z.ZodOptional<typeof specPair>>,
  ),
});

type ProductValues = Omit<ProductInput, "specs"> & { specs: ProductSpecs };

/** Checks the form and tidies it up; on failure names the fields to correct. */
export function parseProduct(raw: unknown): { ok: true; values: ProductValues } | { ok: false; fields: ProductField[] } {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "brand") as ProductField))];
    return { ok: false, fields };
  }
  const input = parsed.data;
  // A crossed-out price that is not higher than the price is a mistake, not a discount.
  if (input.oldPrice !== null && input.oldPrice <= input.price) return { ok: false, fields: ["oldPrice"] };

  // A specification written in one language only is shown as it is in both:
  // many of them ("4K UHD", "A++") read the same anyway.
  const specs: ProductSpecs = {};
  for (const key of specKeys) {
    const value = input.specs[key];
    if (!value || (!value.uz && !value.ru)) continue;
    specs[key] = { uz: value.uz || value.ru, ru: value.ru || value.uz };
  }
  return { ok: true, values: { ...input, specs } };
}

export type ProductResult =
  | { ok: true; product: ProductRow }
  | { ok: false; error: "invalid"; fields: ProductField[] }
  | { ok: false; error: "missing" | "stale" };

/**
 * Adds a product. Its code continues the shop's numbering ("p-039") and its
 * address comes from the brand and the model; neither changes afterwards, so
 * links, favourites and carts keep working when the product is renamed.
 */
export async function createProduct(db: Db, raw: unknown, now = new Date()): Promise<ProductResult> {
  const parsed = parseProduct(raw);
  if (!parsed.ok) return { ok: false, error: "invalid", fields: parsed.fields };
  const values = parsed.values;

  // Two people adding products at the same moment may pick the same code;
  // the one who loses simply tries again with the next one.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const taken = await db.select({ id: products.id, slug: products.slug }).from(products);
    const last = Math.max(0, ...taken.map((row) => Number(/^p-(\d+)$/.exec(row.id)?.[1] ?? 0)));
    const id = `p-${String(last + 1).padStart(3, "0")}`;

    const slugs = new Set(taken.map((row) => row.slug));
    const base = slugify(`${values.brand} ${values.model}`) || id;
    let slug = base;
    for (let copy = 2; slugs.has(slug); copy += 1) slug = `${base}-${copy}`;

    const [product] = await db
      .insert(products)
      .values({ ...values, id, slug, createdAt: now, updatedAt: now })
      .onConflictDoNothing()
      .returning();
    if (product) return { ok: true, product };
  }
  throw new Error("A new product could not get a free code");
}

/**
 * Saves the product form. `version` is the one the admin was looking at: when
 * the product has changed since, nothing is saved and the admin is told.
 */
export async function updateProduct(db: Db, id: string, version: number, raw: unknown, now = new Date()): Promise<ProductResult> {
  const parsed = parseProduct(raw);
  if (!parsed.ok) return { ok: false, error: "invalid", fields: parsed.fields };

  const [product] = await db
    .update(products)
    .set({ ...parsed.values, version: sql`${products.version} + 1`, updatedAt: now })
    .where(and(eq(products.id, id), eq(products.version, version)))
    .returning();
  if (product) return { ok: true, product };

  const [current] = await db.select({ id: products.id }).from(products).where(eq(products.id, id));
  return { ok: false, error: current ? "stale" : "missing" };
}

export type ProductFlag = "inStock" | "active";

/** The two switches of the product list: "in stock" and "shown in the shop". */
export async function setProductFlag(db: Db, id: string, flag: ProductFlag, value: boolean, now = new Date()): Promise<ProductResult> {
  const [product] = await db
    .update(products)
    .set({ [flag]: value, version: sql`${products.version} + 1`, updatedAt: now })
    .where(eq(products.id, id))
    .returning();
  return product ? { ok: true, product } : { ok: false, error: "missing" };
}

export async function getAdminProduct(db: Db, id: string): Promise<ProductRow | undefined> {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  return product;
}

export type ProductFilter = {
  q?: string;
  category?: string;
  state?: ProductState;
  page?: number;
};

export type ProductList = {
  products: ProductRow[];
  /** How many products match the search in each state */
  counts: Record<ProductState, number>;
  total: number;
  page: number;
  pages: number;
};

const stateCondition: Record<ProductState, SQL> = {
  onSale: sql`${products.active} and ${products.inStock}`,
  soldOut: sql`${products.active} and not ${products.inStock}`,
  hidden: sql`not ${products.active}`,
};

/** Every word of the search has to be in the name or be the product's code. */
function searchCondition(filter: ProductFilter): SQL | undefined {
  const words = (filter.q ?? "").trim().slice(0, 60).split(/\s+/).filter(Boolean);
  const title = sql`${products.brand} || ' ' || ${products.model}`;
  return and(
    filter.category ? eq(products.category, filter.category) : undefined,
    ...words.map((word) => {
      const pattern = `%${word.replace(/[\\%_]/g, "\\$&")}%`;
      return or(sql`${title} ilike ${pattern}`, ilike(products.id, pattern));
    }),
  );
}

export async function listAdminProducts(db: Db, filter: ProductFilter = {}): Promise<ProductList> {
  const search = searchCondition(filter);
  const countOf = (state: ProductState) => sql<number>`count(*) filter (where ${stateCondition[state]})`.mapWith(Number);

  const [counts] = await db
    .select({ onSale: countOf("onSale"), soldOut: countOf("soldOut"), hidden: countOf("hidden") })
    .from(products)
    .where(search);

  const total = filter.state ? counts[filter.state] : counts.onSale + counts.soldOut + counts.hidden;
  const pages = Math.max(1, Math.ceil(total / PRODUCT_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(filter.page ?? 1) || 1), pages);

  const rows = await db
    .select()
    .from(products)
    .where(and(search, filter.state ? stateCondition[filter.state] : undefined))
    // The newest first; products added together keep the order of their codes.
    .orderBy(desc(products.createdAt), asc(products.id))
    .limit(PRODUCT_PAGE_SIZE)
    .offset((page - 1) * PRODUCT_PAGE_SIZE);

  return { products: rows, counts, total, page, pages };
}

const COMMON_SPECS: SpecKey[] = ["type", "power", "feature"];

function mostCommon<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
}

/**
 * What the shop already does for each kind of product: which specifications
 * it fills in, and the section and colour such products usually have. The
 * form offers the same for the next product of that kind.
 */
export async function kindHints(db: Db): Promise<KindHints> {
  const rows = await db
    .select({ art: products.art, specs: products.specs, category: products.category, color: products.color })
    .from(products)
    .orderBy(asc(products.id));

  return Object.fromEntries(
    artKinds.map((art) => {
      const same = rows.filter((row) => row.art === art);
      const used = new Set(same.flatMap((row) => Object.keys(row.specs)));
      const specs = specKeys.filter((key) => used.has(key));
      return [
        art,
        {
          specs: specs.length > 0 ? specs : COMMON_SPECS,
          category: mostCommon(same.map((row) => row.category)),
          color: mostCommon(same.map((row) => row.color)),
        },
      ];
    }),
  ) as KindHints;
}
