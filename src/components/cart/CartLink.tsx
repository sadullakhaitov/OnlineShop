"use client";

import { ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCartCount } from "@/lib/cart";

/** Cart icon in the header with the number of pieces in the cart. */
export function CartLink() {
  const t = useTranslations("nav");
  const count = useCartCount();

  return (
    <Link href="/cart" className="icon-btn relative hidden md:inline-grid" aria-label={t("cart")}>
      <ShoppingCart className="size-5" strokeWidth={1.7} />
      {count > 0 && (
        // The key restarts the little "pop" each time the number changes.
        <span key={count} className="badge absolute right-0 top-0.5">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
