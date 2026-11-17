/** A promo code as the checkout needs it to work out the discount itself. */
export type PromoTerms = { code: string; kind: "percent" | "amount"; value: number; minTotal: number };

/** What the code takes off goods worth `subtotal`: never more than the goods themselves. */
export function promoDiscount(promo: Pick<PromoTerms, "kind" | "value">, subtotal: number): number {
  const raw = promo.kind === "percent" ? Math.floor((subtotal * promo.value) / 100) : promo.value;
  return Math.max(0, Math.min(subtotal, raw));
}
