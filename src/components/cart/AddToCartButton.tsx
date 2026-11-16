"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { addToCart, useCart } from "@/lib/cart";

type Props = {
  productId: string;
  inStock: boolean;
  /** "icon" for product cards, "full" for the product page */
  variant?: "icon" | "full";
};

const iconClass = "relative z-20 size-9 shrink-0 rounded-xl p-0 sm:size-10 sm:rounded-[0.875rem]";
const fullClass = "h-12 min-w-0 flex-1 px-6 text-[0.9375rem]";
const popIn = "animate-[pop_0.45s_var(--ease)]";

/** Adds the product to the cart; once it is there, the button leads to the cart. */
export function AddToCartButton({ productId, inStock, variant = "icon" }: Props) {
  const t = useTranslations();
  const inCart = useCart().some((item) => item.id === productId);
  const full = variant === "full";

  if (inCart) {
    return (
      <Link
        href="/cart"
        aria-label={full ? undefined : t("cart.inCartGo")}
        className={`btn btn-accent ${full ? fullClass : iconClass}`}
      >
        <Check className={`size-[1.125rem] ${popIn}`} strokeWidth={2.2} />
        {full && t("cart.goToCart")}
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={!inStock}
      aria-label={full ? undefined : t("cart.add")}
      onClick={() => addToCart(productId)}
      className={`btn btn-primary ${full ? `${fullClass} disabled:opacity-40` : `${iconClass} disabled:opacity-30`}`}
    >
      <ShoppingCart className="size-[1.125rem]" strokeWidth={1.8} />
      {full && (inStock ? t("cart.add") : t("product.outOfStock"))}
    </button>
  );
}
