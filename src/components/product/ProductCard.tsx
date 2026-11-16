import { Heart, ShoppingCart, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Product } from "@/data/products";
import type { Locale } from "@/i18n/routing";
import { discountPercent, formatPrice } from "@/lib/format";
import { ProductArt } from "./ProductArt";

export function ProductCard({ product }: { product: Product }) {
  const t = useTranslations("product");
  const locale = useLocale() as Locale;
  const discount = discountPercent(product.price, product.oldPrice);
  const badge = product.badge ? t(product.badge) : discount ? `−${discount}%` : null;

  return (
    <article className="glass lift group flex h-full flex-col rounded-[1.5rem] p-2.5">
      <div className="tile relative aspect-square overflow-hidden rounded-[1.125rem]">
        {badge && (
          <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-accent-soft px-2.5 py-1 text-[0.6875rem] font-semibold text-accent backdrop-blur-md">
            {badge}
          </span>
        )}
        <button
          type="button"
          aria-label={t("addToFavorites")}
          className="icon-btn absolute right-1.5 top-1.5 z-10 size-9 text-muted hover:text-ink"
        >
          <Heart className="size-[1.125rem]" strokeWidth={1.7} />
        </button>
        <ProductArt
          kind={product.art}
          className="absolute inset-[11%] size-[78%] drop-shadow-lg transition-transform duration-700 ease-smooth group-hover:scale-[1.07]"
        />
      </div>

      <div className="flex flex-1 flex-col px-2 pb-1.5 pt-3.5">
        <p className="text-xs text-muted">{product.type[locale]}</p>
        <h3 className="mt-0.5 line-clamp-2 text-[0.9375rem] font-medium leading-snug">{product.title}</h3>
        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
          <Star className="size-3.5 fill-accent text-accent" strokeWidth={0} />
          <span className="font-medium text-ink">{product.rating.toFixed(1)}</span>
          <span aria-hidden="true">·</span>
          {t("reviews", { count: product.reviews })}
        </p>

        <div className="mt-auto flex items-end justify-between gap-1.5 pt-4">
          <div className="min-w-0">
            {product.oldPrice && (
              <p className="text-xs tabular-nums text-faint line-through">{formatPrice(product.oldPrice)}</p>
            )}
            <p className="whitespace-nowrap text-sm font-semibold sm:text-[1.0625rem] tabular-nums tracking-tight">
              {formatPrice(product.price)}{" "}
              <span className="text-[0.625rem] font-medium text-muted sm:text-xs">{t("currency")}</span>
            </p>
          </div>
          <button
            type="button"
            aria-label={t("addToCart")}
            className="btn btn-primary size-9 shrink-0 rounded-xl p-0 sm:size-10 sm:rounded-[0.875rem]"
          >
            <ShoppingCart className="size-[1.125rem]" strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </article>
  );
}
