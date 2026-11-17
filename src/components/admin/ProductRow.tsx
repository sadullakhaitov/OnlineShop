import { Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { kinds } from "@/data/products";
import type { ProductRow as Product } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCategory } from "@/lib/catalog";
import { discountPercent, formatPrice } from "@/lib/format";
import { productState } from "@/server/admin/products";
import { ProductArt } from "@/components/product/ProductArt";
import { ProductSwitches } from "./ProductSwitches";

const columns = "lg:grid-cols-[minmax(0,1fr)_10rem_6.5rem_6.5rem_2.5rem]";

/** A product in the admin list: a table row on wide screens, a small card on phones. */
function ProductRow({ product }: { product: Product }) {
  const t = useTranslations("admin.products");
  const tProduct = useTranslations("product");
  const locale = useLocale() as Locale;

  const title = `${product.brand} ${product.model}`;
  const state = productState(product);
  const discount = discountPercent(product.price, product.oldPrice ?? undefined);
  const category = getCategory(product.category)?.name[locale];
  const href = `/admin/products/${product.id}`;

  return (
    <div className={`grid grid-cols-2 items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5 ${columns}`}>
      <div className="col-span-2 flex min-w-0 items-center gap-3.5 lg:col-span-1">
        <Link href={href} tabIndex={-1} aria-hidden="true" className="tile grid size-14 shrink-0 place-items-center rounded-2xl">
          <ProductArt kind={product.art} image={product.image} className={`size-10 rounded-lg ${state === "onSale" ? "" : "opacity-50 grayscale"}`} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <Link
              href={href}
              className={`truncate text-[0.9375rem] font-medium transition-colors duration-300 hover:text-accent ${
                state === "hidden" ? "text-muted" : ""
              }`}
            >
              {title}
            </Link>
            {state !== "onSale" && (
              <span className="shrink-0 rounded-full border border-hairline px-2 py-0.5 text-[0.6875rem] font-medium text-muted">
                {t(`state.${state}`)}
              </span>
            )}
            {/* On a phone the name needs the room more than the mark does. */}
            {product.badge && (
              <span className="hidden shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-accent sm:inline">
                {tProduct(product.badge)}
              </span>
            )}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {kinds[product.art].name[locale]}
            {category && ` · ${category}`} · {t("code", { id: product.id.toUpperCase() })}
          </p>
          {/* Phones and tablets show the price under the name */}
          <p className="mt-1.5 text-sm font-semibold tabular-nums lg:hidden">
            {formatPrice(product.price)} <span className="text-xs font-medium text-muted">{tProduct("currency")}</span>
            {product.oldPrice && (
              <span className="ml-2 text-xs font-normal text-faint line-through">{formatPrice(product.oldPrice)}</span>
            )}
          </p>
        </div>
        <Link href={href} aria-label={t("edit", { title })} className="icon-btn shrink-0 lg:hidden">
          <Pencil className="size-4" strokeWidth={1.7} />
        </Link>
      </div>

      <div className="hidden text-right lg:block">
        <p className="text-sm font-semibold tabular-nums">
          {formatPrice(product.price)} <span className="text-xs font-medium text-muted">{tProduct("currency")}</span>
        </p>
        {product.oldPrice && (
          <p className="mt-0.5 text-xs tabular-nums text-faint">
            <span className="line-through">{formatPrice(product.oldPrice)}</span>
            {discount > 0 && <span className="ml-1.5 text-accent">−{discount}%</span>}
          </p>
        )}
      </div>

      <ProductSwitches id={product.id} title={title} inStock={product.inStock} active={product.active} />

      <Link href={href} aria-label={t("edit", { title })} className="icon-btn hidden lg:grid">
        <Pencil className="size-4" strokeWidth={1.7} />
      </Link>
    </div>
  );
}

/** A glass card holding product rows, with column names on wide screens. */
export function ProductRows({ products }: { products: Product[] }) {
  const t = useTranslations("admin.products");

  return (
    <div className="glass overflow-hidden rounded-[1.5rem]">
      <div
        aria-hidden="true"
        className={`hidden items-center gap-x-4 border-b border-hairline px-5 py-2.5 text-xs font-medium text-muted lg:grid ${columns}`}
      >
        <span>{t("title")}</span>
        <span className="text-right">{t("form.priceSection")}</span>
        <span className="text-center">{t("inStockShort")}</span>
        <span className="text-center">{t("activeShort")}</span>
        <span />
      </div>
      <ul className="divide-y divide-hairline">
        {products.map((product) => (
          <li key={product.id}>
            <ProductRow product={product} />
          </li>
        ))}
      </ul>
    </div>
  );
}
