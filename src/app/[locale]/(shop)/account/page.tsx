import type { Metadata } from "next";
import { Package } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDb } from "@/db";
import type { ArtKind } from "@/data/products";
import { Link, redirect } from "@/i18n/navigation";
import { formatDateTime, formatPrice } from "@/lib/format";
import { enterDelay, gridDelay } from "@/lib/motion";
import { formatPhone } from "@/lib/phone";
import { listOrders } from "@/server/orders";
import { getCurrentCustomer } from "@/server/session";
import { LogoutButton } from "@/components/account/LogoutButton";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { ProductArt } from "@/components/product/ProductArt";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type Props = {
  params: Promise<{ locale: string }>;
};

/** How many product pictures an order card shows before "+N". */
const THUMBS = 4;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: `${t("title")} — Multimedia`, robots: { index: false } };
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const customer = await getCurrentCustomer();
  if (!customer) return redirect({ href: "/login", locale });

  const t = await getTranslations();
  const orders = await listOrders(await getDb(), customer);

  // "Not paid" would alarm a customer who chose to pay on receipt.
  const paymentNote = (order: (typeof orders)[number]) => {
    if (order.paymentStatus !== "unpaid") return t(`order.paymentStatus.${order.paymentStatus}`);
    if (order.status === "cancelled") return null;
    return order.paymentMethod === "cash" ? t("order.method.cash") : t("order.paymentStatus.unpaid");
  };

  return (
    <div className="flex flex-col gap-5 pt-5 sm:pt-7">
      <Breadcrumbs items={[{ label: t("productPage.home"), href: "/" }, { label: t("account.title") }]} />

      <section className="glass glass-sheen enter flex flex-wrap items-center justify-between gap-4 rounded-[1.75rem] p-6 sm:p-8">
        <div className="min-w-0">
          <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-4xl">
            {customer.name ? t("account.greeting", { name: customer.name }) : t("account.greetingNoName")}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {t("account.phone")}: <span className="font-medium tabular-nums text-ink">{formatPhone(customer.phone)}</span>
          </p>
        </div>
        <LogoutButton />
      </section>

      <h2 className="enter mt-2 px-1 text-2xl font-semibold sm:text-[1.75rem]">{t("account.orders")}</h2>

      {orders.length === 0 ? (
        <div className="glass enter flex flex-col items-center rounded-[1.75rem] px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Package className="size-7" strokeWidth={1.5} />
          </span>
          <h3 className="mt-5 text-xl font-semibold">{t("account.ordersEmptyTitle")}</h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{t("account.ordersEmptyText")}</p>
          <Link href="/catalog" className="btn btn-primary mt-6">
            {t("account.toCatalog")}
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {orders.map((order, index) => (
            <li key={order.id}>
              <Link
                href={`/order/${order.id}`}
                style={enterDelay(gridDelay(index))}
                className="glass lift enter flex h-full flex-col gap-4 rounded-[1.5rem] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold tabular-nums">№{order.number}</p>
                    <p className="mt-0.5 text-xs text-muted">{formatDateTime(order.createdAt, locale)}</p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                <div className="mt-auto flex items-end justify-between gap-3">
                  <div className="flex items-center">
                    {order.items.slice(0, THUMBS).map((item) => (
                      <span
                        key={item.id}
                        className="tile -ml-2 grid size-11 place-items-center rounded-xl border border-[var(--glass-border)] first:ml-0"
                      >
                        <ProductArt kind={item.art as ArtKind} className="size-[76%]" />
                      </span>
                    ))}
                    {order.items.length > THUMBS && (
                      <span className="ml-2 text-xs font-medium text-muted">
                        {t("account.more", { count: order.items.length - THUMBS })}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="whitespace-nowrap font-semibold tabular-nums">
                      {formatPrice(order.total)}{" "}
                      <span className="text-xs font-medium text-muted">{t("product.currency")}</span>
                    </p>
                    <p className={`mt-0.5 text-xs ${order.paymentStatus === "paid" ? "text-success" : "text-muted"}`}>
                      {paymentNote(order)}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
