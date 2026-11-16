import { categories } from "@/data/categories";
import { kinds, products, type Product } from "@/data/products";
import type { Locale } from "@/i18n/routing";

/**
 * Catalogue queries. Pages only talk to these functions, so replacing the
 * sample data with a database later means rewriting this file alone.
 */

export const sortOptions = ["popular", "price-asc", "price-desc", "rating", "new"] as const;
export type SortOption = (typeof sortOptions)[number];

export type CatalogQuery = {
  q?: string;
  category?: string;
  brands?: string[];
  min?: number;
  max?: number;
  sale?: boolean;
  inStock?: boolean;
  sort?: SortOption;
};

export const PAGE_SIZE = 12;

/** Lower-cases and unifies the apostrophe variants typed in Uzbek words (o‘, g‘). */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[ʻʼ‘’`´]/g, "'");
}

function matchesText(product: Product, text: string): boolean {
  const kind = kinds[product.art].name;
  const category = categories.find((item) => item.slug === product.category)?.name;
  const haystack = normalize(
    [product.title, kind.uz, kind.ru, category?.uz ?? "", category?.ru ?? ""].join(" "),
  );
  return normalize(text)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

const sorters: Record<SortOption, (a: Product, b: Product) => number> = {
  popular: (a, b) => b.reviews - a.reviews,
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
  new: (a, b) => Number(b.badge === "new") - Number(a.badge === "new") || b.reviews - a.reviews,
};

export function findProducts(query: CatalogQuery = {}): Product[] {
  const { q, category, brands, min, max, sale, inStock, sort = "popular" } = query;
  return products
    .filter((product) => {
      if (category && product.category !== category) return false;
      if (brands?.length && !brands.includes(product.brand)) return false;
      if (min !== undefined && product.price < min) return false;
      if (max !== undefined && product.price > max) return false;
      if (sale && !product.oldPrice) return false;
      if (inStock && !product.inStock) return false;
      if (q && !matchesText(product, q)) return false;
      return true;
    })
    .sort(sorters[sort]);
}

export function getProduct(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getAllProducts(): Product[] {
  return products;
}

export function getPopularProducts(limit: number): Product[] {
  return [...products].sort(sorters.popular).slice(0, limit);
}

export function getRelatedProducts(product: Product, limit: number): Product[] {
  const sameKind = products.filter((item) => item.id !== product.id && item.art === product.art);
  const sameCategory = products.filter(
    (item) => item.id !== product.id && item.art !== product.art && item.category === product.category,
  );
  return [...sameKind, ...sameCategory].slice(0, limit);
}

/** Brands in a category (or in the whole catalogue), biggest first. */
export function getBrands(category?: string): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const product of products) {
    if (category && product.category !== category) continue;
    counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function getCategoryCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const product of products) {
    counts[product.category] = (counts[product.category] ?? 0) + 1;
  }
  return counts;
}

export function getCategory(slug?: string) {
  return categories.find((category) => category.slug === slug);
}

export type SearchHit = {
  slug: string;
  title: string;
  kind: string;
  art: Product["art"];
  price: number;
};

export function searchProducts(text: string, locale: Locale, limit = 6): SearchHit[] {
  const q = text.trim();
  if (q.length < 2) return [];
  return findProducts({ q })
    .slice(0, limit)
    .map((product) => ({
      slug: product.slug,
      title: product.title,
      kind: kinds[product.art].name[locale],
      art: product.art,
      price: product.price,
    }));
}
