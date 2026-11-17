import { categories } from "@/data/categories";
import { kinds, type ArtKind, type Product } from "@/data/products";
import type { Locale } from "@/i18n/routing";

/**
 * Catalogue queries over a list of products. This file knows nothing about
 * where the products come from: `src/server/catalog.ts` reads them from the
 * database and hands them over. The browser only uses the types and constants.
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

/** What the cart and the checkout need to know about a product. */
export type CartProduct = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  art: ArtKind;
  price: number;
  oldPrice?: number;
  inStock: boolean;
};

export type SearchHit = {
  slug: string;
  title: string;
  kind: string;
  art: Product["art"];
  price: number;
};

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

// Products that compare as equal keep the order they were given in: newest first.
const sorters: Record<SortOption, (a: Product, b: Product) => number> = {
  // The shop's own "hit" mark comes first, so the shop decides what leads the home page.
  popular: (a, b) => Number(b.badge === "hit") - Number(a.badge === "hit") || b.reviews - a.reviews,
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
  new: (a, b) => Number(b.badge === "new") - Number(a.badge === "new") || sorters.popular(a, b),
};

export function getCategory(slug?: string) {
  return categories.find((category) => category.slug === slug);
}

/** Everything the shop asks about its products. */
export function createCatalog(products: Product[]) {
  const byId = new Map(products.map((product) => [product.id, product]));
  const bySlug = new Map(products.map((product) => [product.slug, product]));

  function find(query: CatalogQuery = {}): Product[] {
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

  return {
    all: (): Product[] => products,
    find,
    bySlug: (slug: string): Product | undefined => bySlug.get(slug),
    byId: (id: string): Product | undefined => byId.get(id),

    /** Current data of the given products; ids that no longer exist are left out. */
    cartProducts(ids: string[], locale: Locale): CartProduct[] {
      return ids.flatMap((id) => {
        const product = byId.get(id);
        if (!product) return [];
        return [
          {
            id: product.id,
            slug: product.slug,
            title: product.title,
            kind: kinds[product.art].name[locale],
            art: product.art,
            price: product.price,
            oldPrice: product.oldPrice,
            inStock: product.inStock,
          },
        ];
      });
    },

    popular: (limit: number): Product[] => [...products].sort(sorters.popular).slice(0, limit),

    related(product: Product, limit: number): Product[] {
      const sameKind = products.filter((item) => item.id !== product.id && item.art === product.art);
      const sameCategory = products.filter(
        (item) => item.id !== product.id && item.art !== product.art && item.category === product.category,
      );
      return [...sameKind, ...sameCategory].slice(0, limit);
    },

    /** Brands in a category (or in the whole catalogue), biggest first. */
    brands(category?: string): { name: string; count: number }[] {
      const counts = new Map<string, number>();
      for (const product of products) {
        if (category && product.category !== category) continue;
        counts.set(product.brand, (counts.get(product.brand) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    },

    categoryCounts(): Record<string, number> {
      const counts: Record<string, number> = {};
      for (const product of products) {
        counts[product.category] = (counts[product.category] ?? 0) + 1;
      }
      return counts;
    },

    search(text: string, locale: Locale, limit = 6): SearchHit[] {
      const q = text.trim();
      if (q.length < 2) return [];
      return find({ q })
        .slice(0, limit)
        .map((product) => ({
          slug: product.slug,
          title: product.title,
          kind: kinds[product.art].name[locale],
          art: product.art,
          price: product.price,
        }));
    },
  };
}

export type Catalog = ReturnType<typeof createCatalog>;
