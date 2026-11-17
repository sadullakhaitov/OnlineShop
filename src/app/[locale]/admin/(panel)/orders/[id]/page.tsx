import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronLeft, Phone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDb } from "@/db";
import type { OrderEvent, OrderStatus } from "@/db/schema";
import { getDeliveryZone } from "@/data/delivery";
import type { ArtKind } from "@/data/products";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDateTime, formatPrice, formatShortDateTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { allowedPaymentActions, allowedStatuses, getAdminOrder } from "@/server/admin/orders";
import { requireAdmin } from "@/server/admin/session";
import { readCatalog } from "@/server/catalog";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { OrderPaymentActions, OrderStatusActions } from "@/components/admin/OrderActions";
import { PaymentNote } from "@/components/admin/OrderRow";
import { ProductArt } from "@/components/product/ProductArt";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

const card = "glass rounded-[1.5rem] p-5 sm:p-6";
const cardTitle = "text-[0.9375rem] font-semibold";

// Payme: 1 created, 2 performed, -1 cancelled before the payment, -2 after it.
const paymeStates: Record<number, "waiting" | "paid" | "cancelled" | "refunded"> = {
  1: "waiting",
  2: "paid",
  [-1]: "cancelled",
  [-2]: "refunded",
};
const clickStates = { prepared: "waiting", completed: "paid", cancelled: "cancelled" } as const;

export default async function AdminOrderPage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  await requireAdmin();

  const [order, catalog] = await Promise.all([getAdminOrder(await getDb(), id), readCatalog()]);
  if (!order) notFound();

  const t = await getTranslations("admin");
  const tProduct = await getTranslations("product");
  const currency = tProduct("currency");
  const money = (value: number) => `${formatPrice(value)} ${currency}`;

  const pickup = order.deliveryType === "pickup";
  const zone = getDeliveryZone(order.zone);
  const statusName = (status: OrderStatus) => t(`status.${status === "delivering" && pickup ? "readyForPickup" : status}`);
  const methodName = order.paymentMethod === "cash" ? t("orders.method.cash") : t(`orders.method.${order.paymentMethod}`);

  const payActions = allowedPaymentActions(order);
  const cancelled = order.status === "cancelled";
  const online = order.paymentMethod !== "cash";
  const paymentHint =
    order.paymentStatus === "unpaid" && !cancelled
      ? online
        ? t("order.hints.online", { method: methodName })
        : t("order.hints.cash")
      : order.paymentStatus === "paid" && cancelled
        ? online
          ? t("order.hints.refundOnline", { method: methodName })
          : t("order.hints.refundCash")
        : order.paymentStatus === "paid" && online
          ? t("order.hints.paidOnline", { method: methodName })
          : undefined;

  const eventTitle = (event: OrderEvent) => {
    if (event.type === "status" && event.toStatus) return t("order.events.status", { status: statusName(event.toStatus) });
    if (event.type === "paid") {
      return event.actor === "payme" || event.actor === "click"
        ? t("order.events.paidOnline", { method: t(`order.actors.${event.actor}`) })
        : t("order.events.paidCash");
    }
    return t(`order.events.${event.type === "unpaid" ? "unpaid" : "refunded"}`);
  };
  const history = [
    { key: "created", title: t("order.events.created"), actor: t("order.actors.customer"), at: order.createdAt },
    ...order.events.map((event) => ({
      key: event.id,
      title: eventTitle(event),
      actor: t(`order.actors.${event.actor}`),
      at: event.createdAt,
    })),
  ];

  const transactions = [
    ...order.payme.map((item) => ({
      key: item.id,
      method: "Payme",
      id: item.paycomId,
      state: paymeStates[item.state] ?? "waiting",
      at: new Date(item.performTime || item.cancelTime || item.createTime),
    })),
    ...order.click.map((item) => ({
      key: String(item.id),
      method: "Click",
      id: item.clickTransId,
      state: clickStates[item.status],
      at: item.finishedAt ?? item.createdAt,
    })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="enter">
        <Link
          href="/admin/orders"
          className="-ml-1 inline-flex items-center gap-1 text-sm text-muted transition-colors duration-300 hover:text-ink"
        >
          <ChevronLeft className="size-4" strokeWidth={1.8} />
          {t("order.back")}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-[1.75rem] font-semibold tabular-nums sm:text-[2rem]">
            {t("order.title", { number: order.number })}
          </h1>
          <AdminStatusBadge status={order.status} deliveryType={order.deliveryType} className="h-7 px-3 text-[0.8125rem]" />
        </div>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          {t("order.placed", { date: formatDateTime(order.createdAt, locale) })}
          <Link
            href={`/order/${order.id}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-accent transition-opacity duration-300 hover:opacity-70"
          >
            {t("order.customerPage")}
            <ArrowUpRight className="size-3.5" strokeWidth={1.8} />
          </Link>
        </p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_21rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="flex flex-col gap-4 max-lg:order-2">
          <section className={card}>
            <h2 className={cardTitle}>{t("order.items")}</h2>
            <ul className="mt-2 divide-y divide-hairline">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3.5 py-3.5">
                  <div className="tile grid size-14 shrink-0 place-items-center rounded-2xl">
                    <ProductArt kind={item.art as ArtKind} image={catalog.byId(item.productId)?.image} className="size-11" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* The product's own page in the panel: it is there even when the shop no longer shows it. */}
                    <Link
                      href={`/admin/products/${item.productId}`}
                      className="block truncate text-sm font-medium transition-colors duration-300 hover:text-accent"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">
                      {t("order.code", { id: item.productId })} ·{" "}
                      <span className="tabular-nums">
                        {t("order.quantity", { count: item.quantity, price: formatPrice(item.price) })}
                      </span>
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">{money(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-2 border-t border-hairline pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{t("order.subtotal")}</dt>
                <dd className="tabular-nums">{money(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between gap-4 text-success">
                  <dt>{t("order.discount", { code: order.promoCode ?? "" })}</dt>
                  <dd className="tabular-nums">−{money(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{pickup ? t("order.pickup") : t("order.deliveryFee")}</dt>
                <dd className="tabular-nums">{order.deliveryFee > 0 ? money(order.deliveryFee) : t("order.free")}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 pt-1">
                <dt className="font-semibold">{t("order.total")}</dt>
                <dd className="text-lg font-semibold tabular-nums">{money(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section className={card}>
            <h2 className={cardTitle}>{t("order.history")}</h2>
            <ol className="mt-4">
              {history.map((entry, index) => (
                <li key={entry.key} className="relative flex gap-3.5 pb-5 last:pb-0">
                  {index < history.length - 1 && (
                    <span aria-hidden="true" className="absolute bottom-0 left-[0.3125rem] top-4 w-px bg-hairline" />
                  )}
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 size-[0.6875rem] shrink-0 rounded-full ${
                      index === history.length - 1 ? "bg-accent" : "border-2 border-faint"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{entry.title}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatShortDateTime(entry.at, locale)} · {entry.actor}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className={card}>
            <h2 className={`${cardTitle} mb-4`}>{t("order.status")}</h2>
            <OrderStatusActions
              id={order.id}
              status={order.status}
              deliveryType={order.deliveryType}
              allowed={allowedStatuses(order)}
              paid={order.paymentStatus === "paid"}
            />
          </section>

          <section className={card}>
            <h2 className={cardTitle}>{t("order.payment")}</h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{t("order.paymentState")}</dt>
                <dd className="text-right font-medium">
                  <PaymentNote order={order} />
                </dd>
              </div>
              {order.paidAt && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{t("order.paidAt")}</dt>
                  <dd className="text-right">{formatShortDateTime(order.paidAt, locale)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{t("order.total")}</dt>
                <dd className="text-right font-semibold tabular-nums">{money(order.total)}</dd>
              </div>
              {order.installmentMonths && order.installmentMonthly && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{t("order.installment")}</dt>
                  <dd className="text-right font-medium tabular-nums">
                    {t("order.installmentValue", { months: order.installmentMonths, sum: money(order.installmentMonthly) })}
                  </dd>
                </div>
              )}
            </dl>

            {(payActions.length > 0 || paymentHint) && (
              <div className="mt-4 border-t border-hairline pt-4">
                <OrderPaymentActions id={order.id} actions={payActions} hint={paymentHint} />
              </div>
            )}

            {transactions.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2.5 border-t border-hairline pt-4 text-xs">
                {transactions.map((item) => (
                  <li key={item.key}>
                    <p className="flex justify-between gap-3">
                      <span className="font-medium">{item.method}</span>
                      <span className="text-muted">
                        {t(`order.transactionState.${item.state}`)} · {formatShortDateTime(item.at, locale)}
                      </span>
                    </p>
                    <p className="mt-0.5 break-all font-mono text-[0.6875rem] text-faint">{item.id}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={card}>
            <h2 className={cardTitle}>{t("order.customer")}</h2>
            <p className="mt-3 text-sm font-medium">{order.name}</p>
            <a
              href={`tel:${order.phone}`}
              className="mt-1 inline-flex items-center gap-1.5 text-sm tabular-nums text-accent transition-opacity duration-300 hover:opacity-70"
              aria-label={`${t("order.call")}: ${formatPhone(order.phone)}`}
            >
              <Phone className="size-3.5" strokeWidth={1.8} />
              {formatPhone(order.phone)}
            </a>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              {order.hasAccount ? t("order.hasAccount") : t("order.guest")} · {t("order.language")}:{" "}
              {t(`order.languages.${order.locale === "ru" ? "ru" : "uz"}`)}
            </p>
            {order.otherOrders > 0 && (
              <Link
                href={{ pathname: "/admin/orders", query: { q: order.phone.replace(/\D/g, "").slice(-9) } }}
                className="mt-1 inline-block text-xs text-accent transition-opacity duration-300 hover:opacity-70"
              >
                {t("order.otherOrders", { count: order.otherOrders })}
              </Link>
            )}
          </section>

          <section className={card}>
            <h2 className={cardTitle}>{t("order.receiving")}</h2>
            <p className="mt-3 text-sm font-medium">
              {pickup ? t("order.pickup") : t("order.delivery")}
              {zone && <span className="font-normal text-muted"> · {zone.name[locale]}</span>}
            </p>
            {order.address && (
              <p className="mt-1.5 text-sm leading-relaxed">
                <span className="text-muted">{t("order.address")}: </span>
                {order.address}
              </p>
            )}
            {order.comment && (
              <p className="mt-3 rounded-xl bg-accent-soft px-3.5 py-2.5 text-[0.8125rem] leading-relaxed">
                <span className="text-muted">{t("order.comment")}: </span>
                {order.comment}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
