"use client";

import { ShoppingCart, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { FREE_DELIVERY_FROM } from "@/data/delivery";
import { Link } from "@/i18n/navigation";
import { removeFromCart, setCartQuantity } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { enterDelay } from "@/lib/motion";
import { ProductArt } from "@/components/product/ProductArt";
import { QuantityStepper } from "./QuantityStepper";
import { useCartLines, type CartLine } from "./useCartLines";

export function CartView() {
  const t = useTranslations();
  const { status, lines, count, subtotal, savings, reload } = useCartLines();

  if (status === "loading") return <CartSkeleton />;

  if (status === "error") {
    return (
      <div className="glass enter flex flex-col items-center rounded-[1.75rem] px-6 py-14 text-center">
        <p className="text-sm text-muted">{t("cart.loadError")}</p>
        <button type="button" onClick={reload} className="btn btn-primary mt-5">
          {t("cart.retry")}
        </button>
      </div>
    );
  }

  if (lines.length === 0) return <CartEmpty />;

  const untilFree = FREE_DELIVERY_FROM - subtotal;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5">
      <ul className="glass enter divide-y divide-hairline rounded-[1.75rem] px-4 sm:px-6">
        {lines.map((line) => (
          <CartRow key={line.id} line={line} />
        ))}
      </ul>

      <aside style={enterDelay(80)} className="glass enter rounded-[1.75rem] p-5 sm:p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold">{t("cart.summary")}</h2>
        <dl className="mt-4 space-y-2.5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t("cart.items", { count })}</dt>
            <dd className="tabular-nums">
              {formatPrice(subtotal + savings)} {t("product.currency")}
            </dd>
          </div>
          {savings > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t("cart.discount")}</dt>
              <dd className="tabular-nums text-accent">
                −{formatPrice(savings)} {t("product.currency")}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t("cart.delivery")}</dt>
            <dd className="text-muted">{t("cart.deliveryLater")}</dd>
          </div>
        </dl>

        <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-hairline pt-4">
          <span className="font-medium">{t("cart.total")}</span>
          <span className="text-2xl font-semibold tabular-nums tracking-tight">
            {formatPrice(subtotal)} <span className="text-sm font-medium text-muted">{t("product.currency")}</span>
          </span>
        </div>

        {count > 0 ? (
          <Link href="/checkout" className="btn btn-primary mt-5 h-12 w-full text-[0.9375rem]">
            {t("cart.checkout")}
          </Link>
        ) : (
          <Link href="/catalog" className="btn btn-ghost mt-5 h-12 w-full text-[0.9375rem]">
            {t("cart.toCatalog")}
          </Link>
        )}

        {count > 0 && (
          <p className="mt-4 text-center text-xs leading-relaxed text-muted">
            {untilFree > 0
              ? t("cart.freeDeliveryHint", { amount: formatPrice(untilFree) })
              : t("cart.freeDeliveryReached")}
          </p>
        )}
      </aside>
    </div>
  );
}

function CartRow({ line }: { line: CartLine }) {
  const t = useTranslations();
  const href = `/product/${line.slug}`;

  return (
    <li className="flex gap-3.5 py-4 sm:gap-5 sm:py-5">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="tile grid size-20 shrink-0 place-items-center rounded-2xl sm:size-24"
      >
        <ProductArt
          kind={line.art}
          className={`size-[74%] drop-shadow-md ${line.inStock ? "" : "opacity-50 grayscale"}`}
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted">{line.kind}</p>
            <Link
              href={href}
              className="mt-0.5 line-clamp-2 text-[0.9375rem] font-medium leading-snug transition-colors duration-300 hover:text-accent"
            >
              {line.title}
            </Link>
          </div>
          <button
            type="button"
            aria-label={t("cart.remove")}
            onClick={() => removeFromCart(line.id)}
            className="icon-btn -mr-2 -mt-1.5 size-9 shrink-0 text-faint hover:text-ink"
          >
            <Trash2 className="size-[1.125rem]" strokeWidth={1.7} />
          </button>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          {line.inStock ? (
            <QuantityStepper quantity={line.quantity} onChange={(quantity) => setCartQuantity(line.id, quantity)} />
          ) : (
            <p className="text-xs text-faint">{t("cart.unavailable")}</p>
          )}
          <div className={`text-right ${line.inStock ? "" : "opacity-40"}`}>
            {line.quantity > 1 && line.inStock && (
              <p className="text-xs tabular-nums text-faint">{t("cart.each", { price: formatPrice(line.price) })}</p>
            )}
            <p className="whitespace-nowrap font-semibold tabular-nums tracking-tight sm:text-lg">
              {formatPrice(line.price * line.quantity)}{" "}
              <span className="text-xs font-medium text-muted">{t("product.currency")}</span>
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

export function CartEmpty() {
  const t = useTranslations("cart");

  return (
    <div className="glass enter flex flex-col items-center rounded-[1.75rem] px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <ShoppingCart className="size-7" strokeWidth={1.5} />
      </span>
      <h2 className="mt-5 text-xl font-semibold">{t("emptyTitle")}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{t("emptyText")}</p>
      <Link href="/catalog" className="btn btn-primary mt-6">
        {t("toCatalog")}
      </Link>
    </div>
  );
}

/** Holds the layout while the cart is being read, so nothing jumps. */
export function CartSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5" aria-hidden="true">
      <div className="glass divide-y divide-hairline rounded-[1.75rem] px-4 sm:px-6">
        {[0, 1].map((row) => (
          <div key={row} className="flex gap-3.5 py-4 sm:gap-5 sm:py-5">
            <div className="skeleton size-20 shrink-0 rounded-2xl sm:size-24" />
            <div className="flex flex-1 flex-col gap-2.5 py-1">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-4 w-3/5" />
              <div className="skeleton mt-auto h-8 w-28 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="glass rounded-[1.75rem] p-5 sm:p-6">
        <div className="skeleton h-5 w-32" />
        <div className="skeleton mt-5 h-4 w-full" />
        <div className="skeleton mt-3 h-4 w-4/5" />
        <div className="skeleton mt-6 h-12 w-full rounded-[0.875rem]" />
      </div>
    </div>
  );
}
