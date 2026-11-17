"use client";

import { Select } from "@/components/ui/Select";
import { useState } from "react";
import { Banknote, CreditCard, Store, TicketPercent, Truck, X } from "lucide-react";
import { promoDiscount, type PromoTerms } from "@/lib/promo";
import { useLocale, useTranslations } from "next-intl";
import type { DeliveryType, PaymentMethod } from "@/db/schema";
import { Link, useRouter } from "@/i18n/navigation";
import { removeFromCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { enterDelay } from "@/lib/motion";
import { localPhoneDigits } from "@/lib/phone";
import { getWebApp, openExternal } from "@/lib/telegram";
import { CartEmpty, CartSkeleton } from "@/components/cart/CartView";
import { useCartLines } from "@/components/cart/useCartLines";
import { ProductArt } from "@/components/product/ProductArt";
import { PhoneField } from "@/components/ui/PhoneField";

export type CheckoutZone = { slug: string; name: string; fee: number; days: number };
export type CheckoutMethod = { method: PaymentMethod; demo: boolean };

type Props = {
  zones: CheckoutZone[];
  /** Orders from this amount are delivered free of charge */
  freeFrom: number;
  methods: CheckoutMethod[];
  /** The signed-in customer, to fill in the contact fields */
  customer: { name: string; phone: string } | null;
  pickupAddress: string;
};

/** Contact and address are remembered in this browser for the next order. */
const SAVED_KEY = "multimedia:checkout";
type Saved = { name: string; phone: string; deliveryType: string; zone: string; address: string };

function readSaved(): Partial<Saved> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "{}");
    return typeof parsed === "object" && parsed !== null ? (parsed as Partial<Saved>) : {};
  } catch {
    return {};
  }
}

function writeSaved(saved: Saved) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  } catch {
    // Not being able to remember the address is no reason to stop.
  }
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

export function CheckoutForm(props: Props) {
  const t = useTranslations();
  const cart = useCartLines();
  // After the order is placed the cart empties; this keeps the "empty cart"
  // message from flashing while the next page opens.
  const [placed, setPlaced] = useState(false);

  if (placed) {
    return (
      <div className="glass enter rounded-[1.75rem] px-6 py-16 text-center text-sm text-muted" role="status">
        {t("checkout.placed")}
      </div>
    );
  }

  if (cart.status === "loading") return <CartSkeleton />;

  if (cart.status === "error") {
    return (
      <div className="glass enter flex flex-col items-center rounded-[1.75rem] px-6 py-14 text-center">
        <p className="text-sm text-muted">{t("cart.loadError")}</p>
        <button type="button" onClick={cart.reload} className="btn btn-primary mt-5">
          {t("cart.retry")}
        </button>
      </div>
    );
  }

  if (cart.available.length === 0) return <CartEmpty />;

  return <CheckoutFields {...props} cart={cart} onPlaced={() => setPlaced(true)} />;
}

type FieldsProps = Props & {
  cart: ReturnType<typeof useCartLines>;
  onPlaced: () => void;
};

type FieldName = "name" | "phone" | "zone" | "address";

function CheckoutFields({ zones, freeFrom, methods, customer, pickupAddress, cart, onPlaced }: FieldsProps) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  // This component only mounts in the browser, after the cart is loaded.
  const [saved] = useState(readSaved);
  const [name, setName] = useState(customer?.name || text(saved.name));
  const [phone, setPhone] = useState(localPhoneDigits(customer?.phone ?? text(saved.phone)));
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(
    saved.deliveryType === "pickup" ? "pickup" : "delivery",
  );
  const [zoneSlug, setZoneSlug] = useState(zones.some((zone) => zone.slug === saved.zone) ? text(saved.zone) : "");
  const [address, setAddress] = useState(text(saved.address));
  const [method, setMethod] = useState<PaymentMethod>(methods[0].method);
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<FieldName[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const delivery = deliveryType === "delivery";
  const zone = delivery ? zones.find((item) => item.slug === zoneSlug) : undefined;
  const fee = zone && cart.subtotal < freeFrom ? zone.fee : 0;
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<PromoTerms | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  // The discount follows the cart; a code that no longer fits is dropped from the total.
  const discount = promo && cart.subtotal >= promo.minTotal ? promoDiscount(promo, cart.subtotal) : 0;
  const total = cart.subtotal - discount + fee;

  const promoMessage = (reason?: string, minTotal?: number) =>
    reason === "minTotal" && minTotal
      ? t("checkout.promo.minTotal", { sum: formatPrice(minTotal) })
      : t(`checkout.promo.${reason === "expired" || reason === "used" || reason === "limit" ? reason : "unknown"}`);

  async function applyPromo() {
    const code = promoInput.trim();
    if (!code || promoBusy) return;
    setPromoBusy(true);
    setPromoError(null);
    try {
      const response = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: cart.subtotal }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok: true; terms: PromoTerms }
        | { ok: false; error?: string; minTotal?: number }
        | null;
      if (data?.ok) {
        setPromo(data.terms);
        setPromoInput("");
      } else setPromoError(promoMessage(data?.error, data?.minTotal));
    } catch {
      setPromoError(t("checkout.errors.generic"));
    }
    setPromoBusy(false);
  }

  const clear = (field: FieldName) => setErrors((current) => current.filter((item) => item !== field));
  const errorOf = (field: FieldName) => (errors.includes(field) ? t(`checkout.errors.${field}`) : null);

  function validate(): FieldName[] {
    const problems: FieldName[] = [];
    if (name.trim().length < 2) problems.push("name");
    if (phone.length !== 9) problems.push("phone");
    if (delivery && !zone) problems.push("zone");
    if (delivery && address.trim().length < 5) problems.push("address");
    return problems;
  }

  function showErrors(problems: FieldName[]) {
    setErrors(problems);
    document.getElementById(`checkout-${problems[0]}`)?.focus();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    setFormError(null);

    const problems = validate();
    if (problems.length > 0) return showErrors(problems);

    setSending(true);
    try {
      const telegram = getWebApp();
      const response = await fetch("/api/orders", {
        method: "POST",
        // Inside Telegram the order is tied to the Telegram user, who then hears about it in the bot.
        headers: { "Content-Type": "application/json", ...(telegram ? { "X-Telegram-Init-Data": telegram.initData } : {}) },
        body: JSON.stringify({
          items: cart.available.map((line) => ({ id: line.id, quantity: line.quantity })),
          name: name.trim(),
          phone: `+998${phone}`,
          deliveryType,
          zone: zone?.slug,
          address: delivery ? address.trim() : undefined,
          comment: comment.trim() || undefined,
          paymentMethod: method,
          locale,
          promoCode: discount > 0 ? promo?.code : undefined,
          expectedTotal: total,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        id?: string;
        payUrl?: string | null;
        error?: string;
        fields?: string[];
        reason?: string;
        minTotal?: number;
      } | null;

      if (response.ok && data?.ok && data.id) {
        writeSaved({ name: name.trim(), phone, deliveryType, zone: zoneSlug, address: address.trim() });
        onPlaced();
        removeFromCart(cart.available.map((line) => line.id));
        // Online payment continues at Payme or Click (or on the test page).
        // Inside Telegram the payment opens in the browser and the app shows the order meanwhile.
        if (data.payUrl && !(telegram && /^https?:/.test(data.payUrl))) window.location.assign(data.payUrl);
        else {
          if (data.payUrl) openExternal(data.payUrl);
          router.push(`/order/${data.id}`);
        }
        return;
      }

      const fields = (data?.fields ?? []).filter((field): field is FieldName =>
        ["name", "phone", "zone", "address"].includes(field),
      );
      if (data?.error === "invalid" && fields.length > 0) {
        showErrors(fields);
      } else if (data?.error === "unavailable" || data?.error === "changed") {
        setFormError(t(`checkout.errors.${data.error}`));
        cart.reload();
      } else if (data?.error === "promo") {
        setPromo(null);
        setPromoError(promoMessage(data.reason, data.minTotal));
        setFormError(t("checkout.promo.dropped"));
      } else if (data?.error === "payment") {
        setFormError(t("checkout.errors.payment"));
      } else {
        setFormError(t("checkout.errors.generic"));
      }
    } catch {
      setFormError(t("checkout.errors.generic"));
    }
    setSending(false);
  }

  const methodInfo: Record<PaymentMethod, { label: string; note: string; icon: typeof CreditCard }> = {
    payme: { label: "Payme", note: t("checkout.paymeText"), icon: CreditCard },
    click: { label: "Click", note: t("checkout.clickText"), icon: CreditCard },
    cash: { label: t("checkout.cash"), note: t("checkout.cashText"), icon: Banknote },
  };

  const sectionClass = "glass enter rounded-[1.75rem] p-5 sm:p-7";
  const labelClass = "mb-1.5 block text-[0.8125rem] font-medium text-muted";
  const errorClass = "mt-1.5 text-xs text-danger";

  return (
    <form
      onSubmit={submit}
      noValidate
      className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <section className={sectionClass}>
          <h2 className="text-lg font-semibold">{t("checkout.contact")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="checkout-name" className={labelClass}>
                {t("checkout.name")}
              </label>
              <input
                id="checkout-name"
                className="field"
                autoComplete="name"
                maxLength={80}
                placeholder={t("checkout.namePlaceholder")}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  clear("name");
                }}
                aria-invalid={errors.includes("name") || undefined}
                aria-describedby={errors.includes("name") ? "checkout-name-error" : undefined}
              />
              {errorOf("name") && (
                <p id="checkout-name-error" className={errorClass}>
                  {errorOf("name")}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="checkout-phone" className={labelClass}>
                {t("checkout.phone")}
              </label>
              <PhoneField
                id="checkout-phone"
                value={phone}
                onChange={(digits) => {
                  setPhone(digits);
                  clear("phone");
                }}
                invalid={errors.includes("phone")}
                describedBy={errors.includes("phone") ? "checkout-phone-error" : undefined}
              />
              {errorOf("phone") && (
                <p id="checkout-phone-error" className={errorClass}>
                  {errorOf("phone")}
                </p>
              )}
            </div>
          </div>
        </section>

        <section style={enterDelay(60)} className={sectionClass}>
          <h2 id="checkout-receiving" className="text-lg font-semibold">
            {t("checkout.receiving")}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-labelledby="checkout-receiving">
            {(
              [
                { value: "delivery", icon: Truck, label: t("checkout.delivery"), note: t("checkout.deliveryText") },
                { value: "pickup", icon: Store, label: t("checkout.pickup"), note: t("checkout.pickupText") },
              ] as const
            ).map(({ value, icon: Icon, label, note }) => (
              <label key={value} className="choice">
                <input
                  type="radio"
                  name="deliveryType"
                  className="radio"
                  checked={deliveryType === value}
                  onChange={() => {
                    setDeliveryType(value);
                    setErrors([]);
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted">{note}</span>
                </span>
                <Icon className="size-5 shrink-0 text-muted" strokeWidth={1.6} />
              </label>
            ))}
          </div>

          {delivery ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="checkout-zone" className={labelClass}>
                  {t("checkout.zone")}
                </label>
                  <Select
                    id="checkout-zone"
                    className="field"
                    value={zoneSlug}
                    onValueChange={(value) => {
                      setZoneSlug(value);
                      clear("zone");
                    }}
                    aria-invalid={errors.includes("zone") || undefined}
                    aria-describedby={errors.includes("zone") ? "checkout-zone-error" : undefined}
                  >
                    <option value="" disabled>
                      {t("checkout.zonePlaceholder")}
                    </option>
                    {zones.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                {errorOf("zone") ? (
                  <p id="checkout-zone-error" className={errorClass}>
                    {errorOf("zone")}
                  </p>
                ) : (
                  zone && (
                    <p className="mt-1.5 text-xs text-muted">
                      {t("checkout.zoneInfo", { days: zone.days })}
                      {" · "}
                      {fee > 0 ? t("checkout.zoneFee", { price: formatPrice(fee) }) : t("checkout.zoneFree")}
                    </p>
                  )
                )}
              </div>
              <div>
                <label htmlFor="checkout-address" className={labelClass}>
                  {t("checkout.address")}
                </label>
                <input
                  id="checkout-address"
                  className="field"
                  autoComplete="street-address"
                  maxLength={300}
                  placeholder={t("checkout.addressPlaceholder")}
                  value={address}
                  onChange={(event) => {
                    setAddress(event.target.value);
                    clear("address");
                  }}
                  aria-invalid={errors.includes("address") || undefined}
                  aria-describedby={errors.includes("address") ? "checkout-address-error" : undefined}
                />
                {errorOf("address") && (
                  <p id="checkout-address-error" className={errorClass}>
                    {errorOf("address")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {t("checkout.pickupAddress", { address: pickupAddress })}
              {". "}
              {t("footer.hours")}
            </p>
          )}
        </section>

        <section style={enterDelay(120)} className={sectionClass}>
          <h2 id="checkout-payment" className="text-lg font-semibold">
            {t("checkout.payment")}
          </h2>
          <div className="mt-4 grid gap-3" role="radiogroup" aria-labelledby="checkout-payment">
            {methods.map(({ method: value, demo }) => {
              const { label, note, icon: Icon } = methodInfo[value];
              return (
                <label key={value} className="choice">
                  <input
                    type="radio"
                    name="paymentMethod"
                    className="radio"
                    checked={method === value}
                    onChange={() => setMethod(value)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {label}
                      {demo && (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.625rem] font-semibold text-accent">
                          {t("checkout.demo")}
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-muted">{note}</span>
                  </span>
                  <Icon className="size-5 shrink-0 text-muted" strokeWidth={1.6} />
                </label>
              );
            })}
          </div>
        </section>

        <section style={enterDelay(180)} className={sectionClass}>
          <label htmlFor="checkout-comment" className="text-lg font-semibold">
            {t("checkout.comment")}{" "}
            <span className="text-sm font-normal text-faint">({t("checkout.optional")})</span>
          </label>
          <textarea
            id="checkout-comment"
            className="field mt-4"
            maxLength={500}
            rows={3}
            placeholder={t("checkout.commentPlaceholder")}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        </section>
      </div>

      <aside style={enterDelay(80)} className="glass enter rounded-[1.75rem] p-5 sm:p-6 lg:sticky lg:top-24">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("checkout.summary")}</h2>
          <Link href="/cart" className="text-xs text-muted transition-colors duration-300 hover:text-ink">
            {t("checkout.editCart")}
          </Link>
        </div>

        <ul className="mt-4 space-y-3">
          {cart.available.map((line) => (
            <li key={line.id} className="flex items-center gap-3">
              <span className="tile grid size-12 shrink-0 place-items-center rounded-xl">
                <ProductArt kind={line.art} image={line.image} className="size-[76%]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 text-sm font-medium">{line.title}</span>
                <span className="block text-xs tabular-nums text-muted">
                  {line.quantity} × {formatPrice(line.price)}
                </span>
              </span>
              <span className="whitespace-nowrap text-sm font-medium tabular-nums">
                {formatPrice(line.price * line.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-hairline pt-4">
          {promo ? (
            <div className="flex items-center gap-2.5 rounded-xl bg-accent-soft px-3 py-2.5 text-sm">
              <TicketPercent className="size-4 shrink-0 text-accent" strokeWidth={1.8} />
              <span className="flex-1 font-semibold tracking-wide">{promo.code}</span>
              {discount === 0 && <span className="text-xs text-muted">{promoMessage("minTotal", promo.minTotal)}</span>}
              <button type="button" onClick={() => setPromo(null)} aria-label={t("checkout.promo.remove")} className="text-muted hover:text-ink">
                <X className="size-4" strokeWidth={1.8} />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <label htmlFor="checkout-promo" className="sr-only">
                {t("checkout.promo.label")}
              </label>
              <input
                id="checkout-promo"
                value={promoInput}
                onChange={(event) => {
                  setPromoInput(event.target.value.toUpperCase());
                  setPromoError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyPromo();
                  }
                }}
                placeholder={t("checkout.promo.label")}
                autoCapitalize="characters"
                maxLength={30}
                aria-invalid={Boolean(promoError) || undefined}
                aria-describedby={promoError ? "checkout-promo-error" : undefined}
                className="field h-11 min-w-0 flex-1 uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal"
              />
              <button type="button" onClick={applyPromo} disabled={!promoInput.trim() || promoBusy} className="btn btn-ghost h-11 px-4 disabled:opacity-50">
                {t("checkout.promo.apply")}
              </button>
            </div>
          )}
          {promoError && (
            <p id="checkout-promo-error" className="mt-2 text-xs text-danger">
              {promoError}
            </p>
          )}
        </div>

        <dl className="mt-4 space-y-2.5 border-t border-hairline pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t("checkout.subtotal", { count: cart.count })}</dt>
            <dd className="tabular-nums">
              {formatPrice(cart.subtotal)} {t("product.currency")}
            </dd>
          </div>
          {discount > 0 && promo && (
            <div className="flex justify-between gap-4 text-success">
              <dt>{t("checkout.promo.discount", { code: promo.code })}</dt>
              <dd className="tabular-nums">
                −{formatPrice(discount)} {t("product.currency")}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{delivery ? t("checkout.deliveryFee") : t("checkout.pickup")}</dt>
            <dd className={delivery && !zone ? "text-muted" : "tabular-nums"}>
              {delivery && !zone
                ? t("checkout.chooseZone")
                : fee > 0
                  ? `${formatPrice(fee)} ${t("product.currency")}`
                  : t("checkout.free")}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-hairline pt-4">
          <span className="font-medium">{t("checkout.total")}</span>
          <span className="text-2xl font-semibold tabular-nums tracking-tight">
            {formatPrice(total)} <span className="text-sm font-medium text-muted">{t("product.currency")}</span>
          </span>
        </div>

        {formError && (
          <p role="alert" className="mt-4 rounded-xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3.5 py-2.5 text-[0.8125rem] leading-snug text-danger">
            {formError}
          </p>
        )}

        <button type="submit" disabled={sending} className="btn btn-primary mt-5 h-12 w-full text-[0.9375rem] disabled:opacity-60">
          {sending ? t("checkout.sending") : method === "cash" ? t("checkout.submit") : t("checkout.submitPay")}
        </button>
        <p className="mt-3 text-center text-xs leading-relaxed text-faint">
          {t.rich("checkout.consent", {
            offer: (chunks) => (
              <Link href="/offer" className="underline underline-offset-2 hover:text-ink">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </aside>
    </form>
  );
}
