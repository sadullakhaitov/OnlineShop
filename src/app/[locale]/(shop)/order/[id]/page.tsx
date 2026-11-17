import { cache } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Check, CreditCard, MapPin, Package, Store, Truck, type LucideIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDb } from "@/db";
import type { OrderStatus } from "@/db/schema";
import { getDeliveryZone } from "@/data/delivery";
import { kinds, type ArtKind } from "@/data/products";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDateTime, formatPrice } from "@/lib/format";
import { enterDelay } from "@/lib/motion";
import { formatPhone } from "@/lib/phone";
import { getCatalog } from "@/server/catalog";
import { getSiteUrl } from "@/server/config";
import { getOrder, isPayable } from "@/server/orders";
import { getPaymentUrl } from "@/server/payments/urls";
import { reviewChances } from "@/server/reviews";
import { getCurrentCustomer, getSessionToken } from "@/server/session";
import { ReviewButton } from "@/components/order/ReviewButton";
import { PaymentWatcher } from "@/components/order/PaymentWatcher";
import { ProductArt } from "@/components/product/ProductArt";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PayLink } from "@/components/order/PayLink";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

// The page title and the page itself share one database read.
const loadOrder = cache(async (id: string) => getOrder(await getDb(), id));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const order = await loadOrder(id);
  const t = await getTranslations({ locale, namespace: "order" });
  return {
    title: order ? t("metaTitle", { number: order.number }) : "Multimedia",
    // The address of this page is the key to the order: keep it out of search
    // engines and out of the Referer header of outgoing links.
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

const stepOrder: OrderStatus[] = ["new", "confirmed", "delivering", "delivered"];

export default async function OrderPage({ params }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);

  const order = await loadOrder(id);
  if (!order) notFound();

  const t = await getTranslations();
  const catalog = await getCatalog();
  const pickup = order.deliveryType === "pickup";
  const zone = getDeliveryZone(order.zone);
  const online = order.paymentMethod !== "cash";
  const payUrl = getPaymentUrl(order, getSiteUrl(await headers()), locale);
  const awaitingPayment = online && isPayable(order);
  const signedIn = Boolean(await getSessionToken());
  // Its buyer, signed in, can say what they think of what was delivered.
  const customer = order.status === "delivered" && order.customerId && signedIn ? await getCurrentCustomer() : null;
  const reviewable =
    customer && customer.id === order.customerId ? await reviewChances(await getDb(), customer.id, order.id) : new Map<string, null>();

  // One line on what is happening with the order right now.
  const state =
    order.status === "new" && awaitingPayment
      ? "newOnline"
      : order.status === "delivering" && pickup
        ? "readyForPickup"
        : order.status;
  const stateText = order.status === "cancelled" && order.paymentStatus === "refunded" ? "refunded" : state;
  const currentStep = stepOrder.indexOf(order.status);
  const steps = stepOrder.map((step) => ({
    step,
    label: t(`order.steps.${step === "delivering" && pickup ? "readyForPickup" : step}`),
  }));
  const nextStep = currentStep >= 0 ? steps[currentStep + 1] : undefined;

  const paymentTone =
    order.paymentStatus === "paid" ? "text-success" : order.paymentStatus === "refunded" ? "text-muted" : "text-ink";

  const cards: { icon: LucideIcon; title: string; lines: (string | null)[] }[] = [
    {
      icon: pickup ? Store : Truck,
      title: pickup ? t("order.pickup") : t("order.delivery"),
      lines: pickup
        ? [t("footer.address"), t("footer.hours")]
        : [zone?.name[locale] ?? null, order.address],
    },
    {
      icon: MapPin,
      title: t("order.recipient"),
      lines: [order.name, formatPhone(order.phone), order.comment ? `${t("order.comment")}: ${order.comment}` : null],
    },
  ];

  return (
    <div className="flex flex-col gap-5 pt-5 sm:pt-7">
      {awaitingPayment && <PaymentWatcher />}

      <Breadcrumbs
        items={[
          { label: t("productPage.home"), href: "/" },
          ...(signedIn ? [{ label: t("account.orders"), href: "/account" }] : []),
          { label: t("order.title", { number: order.number }) },
        ]}
      />

      <section className="glass glass-sheen enter rounded-[1.75rem] p-6 sm:p-8">
        <p className="text-sm text-muted">
          {t("order.title", { number: order.number })}
          {" · "}
          {t("order.placed", { date: formatDateTime(order.createdAt, locale) })}
        </p>
        <h1 className="mt-2 text-[1.75rem] font-semibold leading-tight sm:text-4xl">{t(`order.headline.${state}`)}</h1>
        <p className="mt-2 max-w-xl text-[0.9375rem] leading-relaxed text-muted">{t(`order.text.${stateText}`)}</p>

        {order.status !== "cancelled" && (
          <>
            <ol className="mt-7 grid grid-cols-4 gap-2">
              {steps.map(({ step, label }, index) => {
                const done = index <= currentStep;
                return (
                  <li key={step} aria-current={index === currentStep ? "step" : undefined}>
                    <span className={`block h-1 rounded-full transition-colors duration-500 ${done ? "bg-accent" : "bg-hairline"}`} />
                    {/* Four names do not fit a phone screen: there the line below shows the step. */}
                    <span className={`mt-2.5 flex items-center gap-1.5 text-[0.8125rem] font-medium max-sm:sr-only ${done ? "text-ink" : "text-faint"}`}>
                      {done && <Check className="size-3.5 shrink-0 text-accent" strokeWidth={2.4} />}
                      {label}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p aria-hidden="true" className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[0.8125rem] sm:hidden">
              <span className="flex items-center gap-1.5 font-medium">
                <Check className="size-3.5 shrink-0 text-accent" strokeWidth={2.4} />
                {steps[currentStep]?.label}
              </span>
              {nextStep && <span className="text-muted">{t("order.nextStep", { step: nextStep.label })}</span>}
            </p>
          </>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5">
        <div className="flex min-w-0 flex-col gap-4">
          <section style={enterDelay(60)} className="glass enter rounded-[1.75rem] p-5 sm:p-7">
            <h2 className="flex items-center gap-2.5 text-lg font-semibold">
              <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
                <Package className="size-[1.125rem]" strokeWidth={1.7} />
              </span>
              {t("order.items")}
            </h2>
            {[...reviewable.values()].includes(null) && <p className="mt-2 text-sm text-muted">{t("review.hint")}</p>}
            <ul className="mt-3 divide-y divide-hairline">
              {order.items.map((item) => {
                // The order keeps what was bought; the product itself may have left the shop since.
                const listed = catalog.bySlug(item.slug) !== undefined;
                const picture = (
                  <ProductArt kind={item.art as ArtKind} image={catalog.byId(item.productId)?.image} className="size-[74%] drop-shadow-md" />
                );
                const tile = "tile grid size-16 shrink-0 place-items-center rounded-2xl";
                return (
                  <li key={item.id} className="py-3.5">
                    <div className="flex items-center gap-3.5">
                      {listed ? (
                        <Link href={`/product/${item.slug}`} tabIndex={-1} aria-hidden="true" className={tile}>
                          {picture}
                        </Link>
                      ) : (
                        <div className={tile}>{picture}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted">{kinds[item.art as ArtKind]?.name[locale]}</p>
                        {listed ? (
                          <Link
                            href={`/product/${item.slug}`}
                            className="line-clamp-2 text-[0.9375rem] font-medium leading-snug transition-colors duration-300 hover:text-accent"
                          >
                            {item.title}
                          </Link>
                        ) : (
                          <p className="line-clamp-2 text-[0.9375rem] font-medium leading-snug">{item.title}</p>
                        )}
                        <p className="mt-0.5 text-xs tabular-nums text-muted">
                          {t("order.quantity", { count: item.quantity })} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-sm font-semibold tabular-nums sm:text-base">
                        {formatPrice(item.price * item.quantity)}{" "}
                        <span className="text-xs font-medium text-muted">{t("product.currency")}</span>
                      </p>
                    </div>
                    {reviewable.has(item.productId) && (
                      <div className="pl-[4.875rem]">
                        <ReviewButton
                          orderId={order.id}
                          productId={item.productId}
                          title={item.title}
                          status={reviewable.get(item.productId) ?? null}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map(({ icon: Icon, title, lines }, index) => (
              <section key={title} style={enterDelay(120 + index * 60)} className="glass enter rounded-[1.75rem] p-5 sm:p-6">
                <h2 className="flex items-center gap-2.5 font-semibold">
                  <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
                    <Icon className="size-[1.125rem]" strokeWidth={1.7} />
                  </span>
                  {title}
                </h2>
                <div className="mt-3 space-y-1 text-sm leading-relaxed text-muted">
                  {lines.filter(Boolean).map((line) => (
                    <p key={line} className="break-words first:font-medium first:text-ink">
                      {line}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <aside style={enterDelay(80)} className="glass enter rounded-[1.75rem] p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 className="flex items-center gap-2.5 text-lg font-semibold">
            <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
              <CreditCard className="size-[1.125rem]" strokeWidth={1.7} />
            </span>
            {t("order.payment")}
          </h2>

          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t("order.subtotal")}</dt>
              <dd className="tabular-nums">
                {formatPrice(order.subtotal)} {t("product.currency")}
              </dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between gap-4 text-success">
                <dt>{t("order.discount", { code: order.promoCode ?? "" })}</dt>
                <dd className="tabular-nums">
                  −{formatPrice(order.discount)} {t("product.currency")}
                </dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{pickup ? t("order.pickup") : t("order.deliveryFee")}</dt>
              <dd className="tabular-nums">
                {order.deliveryFee > 0 ? `${formatPrice(order.deliveryFee)} ${t("product.currency")}` : t("order.free")}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-hairline pt-4">
            <span className="font-medium">{t("order.total")}</span>
            <span className="text-2xl font-semibold tabular-nums tracking-tight">
              {formatPrice(order.total)} <span className="text-sm font-medium text-muted">{t("product.currency")}</span>
            </span>
          </div>

          <dl className="mt-4 space-y-2.5 border-t border-hairline pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t("checkout.payment")}</dt>
              <dd className="text-right font-medium">{t(`order.method.${order.paymentMethod}`)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{t("order.paymentState")}</dt>
              <dd className={`text-right font-medium ${paymentTone}`}>{t(`order.paymentStatus.${order.paymentStatus}`)}</dd>
            </div>
          </dl>

          {payUrl ? (
            <>
              <PayLink href={payUrl} className="btn btn-primary mt-5 h-12 w-full text-[0.9375rem]">
                {t("order.pay", { method: t(`order.method.${order.paymentMethod}`) })}
              </PayLink>
              <p className="mt-3 text-center text-xs leading-relaxed text-muted">{t("order.payHint")}</p>
            </>
          ) : (
            <p className="mt-4 text-xs leading-relaxed text-muted">
              {order.paymentStatus === "paid" && order.paidAt
                ? t("order.paidAt", { date: formatDateTime(order.paidAt, locale) })
                : order.paymentStatus === "unpaid" && !online && order.status !== "cancelled"
                  ? t("order.cashHint")
                  : null}
            </p>
          )}
        </aside>
      </div>

      {/* The fade sits on each glass button itself, never on a wrapper. */}
      <div className="flex flex-wrap items-center gap-3 px-1">
        <Link href="/catalog" style={enterDelay(240)} className="btn btn-ghost enter">
          {t("order.continue")}
        </Link>
        {signedIn ? (
          <Link href="/account" style={enterDelay(280)} className="btn btn-ghost enter">
            {t("order.toAccount")}
          </Link>
        ) : (
          <>
            <Link href="/login" style={enterDelay(280)} className="btn btn-ghost enter">
              {t("order.login")}
            </Link>
            <p style={enterDelay(320)} className="enter w-full text-xs text-muted sm:w-auto sm:flex-1">
              {t("order.loginHint")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
