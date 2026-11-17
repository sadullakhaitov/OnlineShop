import { ViewTransition } from "react";
import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { kinds, type Product } from "@/data/products";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { discountPercent, formatPrice } from "@/lib/format";
import { enterDelay, productArtName } from "@/lib/motion";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { Reveal } from "@/components/ui/Reveal";
import { ProductArt } from "./ProductArt";

type Props = {
  product: Product;
  /** Fade in when scrolled into view, after this delay in ms */
  reveal?: number;
  /** Fade in when the page opens, after this delay in ms */
  enter?: number;
};

const cardClass = "glass lift group relative flex h-full flex-col rounded-[1.5rem] p-2.5";

export function ProductCard({ product, reveal, enter }: Props) {
  const t = useTranslations("product");
  const locale = useLocale() as Locale;
  const discount = discountPercent(product.price, product.oldPrice);
  const badge = product.badge ? t(product.badge) : discount ? `−${discount}%` : null;

  const body = (
    <>
      <div className="tile relative aspect-square overflow-hidden rounded-[1.125rem]">
        {badge && (
          <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-accent-soft px-2.5 py-1 text-[0.6875rem] font-semibold text-accent backdrop-blur-md">
            {badge}
          </span>
        )}
        <FavoriteButton productId={product.id} className="absolute right-1.5 top-1.5 z-20" />
        {/* Same name as the picture on the product page, so it glides there on open. */}
        <ViewTransition name={productArtName(product.id)} share="morph" default="none">
          <ProductArt
            kind={product.art}
            className={`absolute inset-[11%] size-[78%] drop-shadow-lg transition-transform duration-700 ease-smooth group-hover:scale-[1.07] ${
              product.inStock ? "" : "opacity-50 grayscale"
            }`}
          />
        </ViewTransition>
      </div>

      <div className="flex flex-1 flex-col px-2 pb-1.5 pt-3.5">
        <p className="text-xs text-muted">{kinds[product.art].name[locale]}</p>
        <h3 className="mt-0.5 line-clamp-2 text-[0.9375rem] font-medium leading-snug">
          {/* The stretched link makes the whole card clickable. */}
          <Link
            href={`/product/${product.slug}`}
            className="after:absolute after:inset-0 after:z-10 after:rounded-[1.5rem]"
          >
            {product.title}
          </Link>
        </h3>
        {/* A product nobody has rated yet shows no stars rather than "0.0". */}
        {product.reviews > 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-muted">
            <Star className="size-3.5 fill-accent text-accent" strokeWidth={0} />
            <span className="font-medium text-ink">{product.rating.toFixed(1)}</span>
            <span aria-hidden="true">·</span>
            {t("reviews", { count: product.reviews })}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-1.5 pt-4">
          <div className="min-w-0">
            {!product.inStock ? (
              <p className="text-xs text-faint">{t("outOfStock")}</p>
            ) : (
              product.oldPrice && (
                <p className="text-xs tabular-nums text-faint line-through">{formatPrice(product.oldPrice)}</p>
              )
            )}
            <p className="whitespace-nowrap text-sm font-semibold tabular-nums tracking-tight sm:text-[1.0625rem]">
              {formatPrice(product.price)}{" "}
              <span className="text-[0.625rem] font-medium text-muted sm:text-xs">{t("currency")}</span>
            </p>
          </div>
          <AddToCartButton productId={product.id} inStock={product.inStock} />
        </div>
      </div>
    </>
  );

  if (reveal !== undefined) {
    return (
      <Reveal as="article" delay={reveal} className={cardClass}>
        {body}
      </Reveal>
    );
  }

  if (enter !== undefined) {
    return (
      <article className={`${cardClass} enter`} style={enterDelay(enter)}>
        {body}
      </article>
    );
  }

  return <article className={cardClass}>{body}</article>;
}
