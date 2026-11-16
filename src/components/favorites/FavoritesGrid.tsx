"use client";

import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Product } from "@/data/products";
import { Link } from "@/i18n/navigation";
import { useFavorites } from "@/lib/favorites";
import { useHydrated } from "@/lib/hydration";
import { gridDelay } from "@/lib/motion";
import { ProductCard } from "@/components/product/ProductCard";

export function FavoritesGrid({ products }: { products: Product[] }) {
  const t = useTranslations("favorites");
  const ids = useFavorites();
  const hydrated = useHydrated();
  const items = products.filter((product) => ids.includes(product.id));

  // The list is only known in the browser; hold the space until then so the
  // "empty" message does not flash for people who do have favourites.
  if (!hydrated) return <div className="min-h-80" aria-hidden="true" />;

  if (items.length === 0) {
    return (
      <div className="glass enter flex flex-col items-center rounded-[1.75rem] px-6 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Heart className="size-7" strokeWidth={1.5} />
        </span>
        <h2 className="mt-5 text-xl font-semibold">{t("emptyTitle")}</h2>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{t("emptyText")}</p>
        <Link href="/catalog" className="btn btn-primary mt-6">
          {t("toCatalog")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((product, i) => (
        <ProductCard key={product.id} product={product} enter={gridDelay(i)} />
      ))}
    </div>
  );
}
