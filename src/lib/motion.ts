import type { CSSProperties } from "react";

/** Inline style that staggers an element using the `.enter` entrance animation. */
export function enterDelay(ms: number): CSSProperties {
  return { "--enter-delay": `${ms}ms` } as CSSProperties;
}

/** Stagger for items in a grid, capped so long lists do not keep users waiting. */
export function gridDelay(index: number, step = 40, max = 8): number {
  return Math.min(index, max) * step;
}

/**
 * Shared view-transition name for a product's picture. The card and the
 * product page use the same name, so the picture morphs between them.
 */
export function productArtName(productId: string): string {
  return `product-art-${productId}`;
}
