import { useLocale, useTranslations } from "next-intl";
import type { Order } from "@/db/schema";
import { getDeliveryZone } from "@/data/delivery";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatPrice, formatShortDateTime } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import type { OrderWithItems } from "@/server/orders";
import { AdminStatusBadge } from "./AdminStatusBadge";

/** One line on the payment: what the shop has to know at a glance. */
export function PaymentNote({ order, className = "" }: { order: Order; className?: string }) {
  const t = useTranslations("admin.orders");
  const method = t(`method.${order.paymentMethod}`);

  if (order.paymentStatus === "paid") {
    return <span className={`text-success ${className}`}>{t("payment.paid", { method })}</span>;
  }
  if (order.paymentStatus === "refunded") {
    return <span className={`text-muted ${className}`}>{t("payment.refunded")}</span>;
  }
  if (order.paymentMethod === "cash") {
    return <span className={`text-muted ${className}`}>{t("payment.onReceipt")}</span>;
  }
  return <span className={`text-accent ${className}`}>{t("payment.unpaid", { method })}</span>;
}

/** An order in a list: a table row on wide screens, a small card on phones. */
export function OrderRow({ order }: { order: OrderWithItems }) {
  const t = useTranslations("admin.orders");
  const tProduct = useTranslations("product");
  const locale = useLocale() as Locale;

  const pieces = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const first = order.items[0]?.title ?? "";
  const summary = order.items.length > 1 ? `${first} ${t("more", { count: order.items.length - 1 })}` : first;
  const place = order.deliveryType === "pickup" ? t("pickup") : (getDeliveryZone(order.zone)?.name[locale] ?? "");
  const date = formatShortDateTime(order.createdAt, locale);
  const total = `${formatPrice(order.total)} ${tProduct("currency")}`;

  return (
    <Link
      href={`/admin/orders/${order.id}`}
      className="block px-4 py-3.5 transition-colors duration-300 hover:bg-hairline sm:px-5"
    >
      {/* Phones and tablets */}
      <div className="lg:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.9375rem] font-semibold tabular-nums">№{order.number}</p>
            <p className="mt-0.5 text-xs text-muted">{date}</p>
          </div>
          <AdminStatusBadge status={order.status} deliveryType={order.deliveryType} />
        </div>
        <p className="mt-2.5 break-words text-sm">{order.name}</p>
        <p className="mt-0.5 text-xs tabular-nums text-muted">{formatPhone(order.phone)}</p>
        <p className="mt-1 line-clamp-2 text-xs text-muted">
          {summary}
          {place && ` · ${place}`}
        </p>
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <PaymentNote order={order} className="text-xs font-medium" />
          <span className="text-sm font-semibold tabular-nums">{total}</span>
        </div>
      </div>

      {/* Wide screens */}
      <div className="hidden grid-cols-[7rem_minmax(0,1fr)_minmax(0,1.4fr)_10.5rem_minmax(6rem,auto)] items-center gap-4 lg:grid">
        <div>
          <p className="text-sm font-semibold tabular-nums">№{order.number}</p>
          <p className="mt-0.5 text-xs text-muted">{date}</p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm" title={order.name}>{order.name}</p>
          <p className="mt-0.5 text-xs tabular-nums text-muted">{formatPhone(order.phone)}</p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm" title={summary}>{summary}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {t("items", { count: pieces })}
            {place && ` · ${place}`}
          </p>
        </div>
        {/* The sum with the state of its payment under it */}
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">{total}</p>
          <PaymentNote order={order} className="mt-0.5 block text-xs font-medium" />
        </div>
        <div className="flex justify-end">
          <AdminStatusBadge status={order.status} deliveryType={order.deliveryType} />
        </div>
      </div>
    </Link>
  );
}

/** A glass card holding order rows separated by hairlines. */
export function OrderRows({ orders }: { orders: OrderWithItems[] }) {
  return (
    <ul className="glass overflow-hidden rounded-[1.5rem] divide-y divide-hairline">
      {orders.map((order) => (
        <li key={order.id}>
          <OrderRow order={order} />
        </li>
      ))}
    </ul>
  );
}
