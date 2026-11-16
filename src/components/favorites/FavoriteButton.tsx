"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { toggleFavorite, useFavorites } from "@/lib/favorites";

type Props = {
  productId: string;
  /** "icon" for product cards, "full" for the product page */
  variant?: "icon" | "full";
  className?: string;
};

export function FavoriteButton({ productId, variant = "icon", className = "" }: Props) {
  const t = useTranslations();
  const active = useFavorites().includes(productId);
  const label = active ? t("favorites.remove") : t("favorites.add");

  const heart = (
    <Heart
      className={`size-[1.125rem] transition-all duration-300 ease-smooth ${
        active ? "scale-110 fill-rose-500 text-rose-500" : ""
      }`}
      strokeWidth={1.7}
    />
  );

  if (variant === "full") {
    // Icon only on phones so it fits beside the cart button; with a label from sm up.
    return (
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        onClick={() => toggleFavorite(productId)}
        className={`btn btn-ghost size-12 shrink-0 p-0 sm:w-auto sm:px-5 ${className}`}
      >
        {heart}
        <span className="hidden sm:inline">{active ? t("productPage.favorited") : t("productPage.favorite")}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={() => toggleFavorite(productId)}
      className={`icon-btn size-9 text-muted hover:text-ink ${className}`}
    >
      {heart}
    </button>
  );
}
