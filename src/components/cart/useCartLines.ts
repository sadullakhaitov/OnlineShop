"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { removeFromCart, useCart } from "@/lib/cart";
import type { CartProduct } from "@/lib/catalog";
import { useHydrated } from "@/lib/hydration";

export type CartLine = CartProduct & { quantity: number };

/** null marks an id the catalogue no longer has. */
type Known = Record<string, CartProduct | null>;

/**
 * The cart joined with fresh product data from the server.
 * `lines` are all products in the cart; `available` leaves out sold-out ones,
 * and the totals only count those.
 */
export function useCartLines() {
  const items = useCart();
  const hydrated = useHydrated();
  const locale = useLocale();
  const [known, setKnown] = useState<Known>({});
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Only ids we know nothing about are asked for, so changing a quantity or
  // removing a line does not reload anything.
  const unknown = items
    .filter((item) => !(item.id in known))
    .map((item) => item.id)
    .join(",");

  useEffect(() => {
    if (!unknown) return;
    const controller = new AbortController();
    const ids = unknown.split(",");

    fetch(`/api/products?ids=${encodeURIComponent(unknown)}&locale=${locale}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Products request failed: ${response.status}`);
        return response.json() as Promise<{ products: CartProduct[] }>;
      })
      .then(({ products }) => {
        const found = new Map(products.map((product) => [product.id, product]));
        setKnown((current) => ({
          ...current,
          ...Object.fromEntries(ids.map((id) => [id, found.get(id) ?? null])),
        }));
        setFailed(false);
        // Products that left the catalogue leave the cart too.
        const gone = ids.filter((id) => !found.has(id));
        if (gone.length > 0) removeFromCart(gone);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });

    return () => controller.abort();
  }, [unknown, locale, attempt]);

  /** Forgets what was loaded and asks the server again. */
  const reload = useCallback(() => {
    setKnown({});
    setFailed(false);
    setAttempt((value) => value + 1);
  }, []);

  const lines: CartLine[] = items.flatMap((item) => {
    const product = known[item.id];
    return product ? [{ ...product, quantity: item.quantity }] : [];
  });
  const available = lines.filter((line) => line.inStock);

  const status: "loading" | "error" | "ready" = !hydrated
    ? "loading"
    : unknown
      ? failed
        ? "error"
        : "loading"
      : "ready";

  return {
    status,
    lines,
    available,
    /** Pieces that can be ordered */
    count: available.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: available.reduce((sum, line) => sum + line.price * line.quantity, 0),
    /** What the discounts save, compared with the old prices */
    savings: available.reduce(
      (sum, line) => sum + Math.max(0, (line.oldPrice ?? line.price) - line.price) * line.quantity,
      0,
    ),
    reload,
  };
}
