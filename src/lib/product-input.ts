import type { ArtKind, ColorKey, ProductBadge, SpecKey } from "@/data/products";

/**
 * What the admin's product form and the server agree on. Kept apart from the
 * server code so that the browser can use the same limits.
 */

export const PRODUCT_LIMITS = {
  minPrice: 1_000,
  maxPrice: 1_000_000_000,
  minWarranty: 1,
  maxWarranty: 10,
  brand: 40,
  model: 60,
  spec: 60,
} as const;

/** What the product form sends. Text may be untidy; the server cleans it. */
export type ProductInput = {
  category: string;
  art: ArtKind;
  brand: string;
  model: string;
  /** In so'm */
  price: number;
  /** The price before a discount, when there is one */
  oldPrice: number | null;
  badge: ProductBadge | null;
  color: ColorKey;
  /** In years */
  warranty: number;
  inStock: boolean;
  active: boolean;
  specs: Partial<Record<SpecKey, { uz: string; ru: string }>>;
};

export type ProductField = keyof ProductInput;

/** What the shop already does for products of one kind; the form starts from it. */
export type KindHint = {
  /** Specifications filled in for this kind, in the shop's order */
  specs: SpecKey[];
  category?: string;
  color?: ColorKey;
};

export type KindHints = Record<ArtKind, KindHint>;
