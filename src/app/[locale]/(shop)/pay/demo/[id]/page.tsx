import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDb } from "@/db";
import { redirect } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import { getPaymentModes } from "@/server/config";
import { getOrder, isPayable } from "@/server/orders";
import { DemoPayment } from "@/components/order/DemoPayment";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export const metadata: Metadata = {
  title: "Multimedia",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/**
 * Stands in for the Payme or Click payment page while that service is not
 * connected. Once its keys are set, this page no longer exists.
 */
export default async function DemoPaymentPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const order = await getOrder(await getDb(), id);
  if (!order || order.paymentMethod === "cash" || getPaymentModes()[order.paymentMethod] !== "demo") notFound();
  if (!isPayable(order)) return redirect({ href: `/order/${order.id}`, locale });

  const t = await getTranslations();
  const method = t(`order.method.${order.paymentMethod}`);

  return (
    <div className="mx-auto w-full max-w-md pt-8 sm:pt-14">
      <div className="glass glass-sheen enter rounded-[1.75rem] p-6 sm:p-8">
        <span className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          {t("payDemo.badge")}
        </span>
        <h1 className="mt-4 text-2xl font-semibold sm:text-[1.75rem]">{t("payDemo.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("payDemo.text", { method })}</p>

        <dl className="mt-6 space-y-3 border-y border-hairline py-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t("payDemo.order", { number: order.number })}</dt>
            <dd className="font-medium">{method}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted">{t("payDemo.amount")}</dt>
            <dd className="text-2xl font-semibold tabular-nums tracking-tight">
              {formatPrice(order.total)} <span className="text-sm font-medium text-muted">{t("product.currency")}</span>
            </dd>
          </div>
        </dl>

        <DemoPayment orderId={order.id} />
      </div>
    </div>
  );
}
