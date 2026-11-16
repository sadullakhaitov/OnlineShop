"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useFavorites } from "@/lib/favorites";

export function FavoritesLink() {
  const t = useTranslations("nav");
  const count = useFavorites().length;

  return (
    <Link href="/favorites" className="icon-btn relative hidden md:inline-grid" aria-label={t("favorites")}>
      <Heart className="size-5" strokeWidth={1.7} />
      {count > 0 && (
        <span key={count} className="badge absolute right-0 top-0.5">
          {count}
        </span>
      )}
    </Link>
  );
}
