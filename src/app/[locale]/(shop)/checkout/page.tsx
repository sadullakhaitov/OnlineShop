import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FREE_DELIVERY_FROM, deliveryZones } from "@/data/delivery";
import type { Locale } from "@/i18n/routing";
import { getPaymentMethods, getPaymentModes } from "@/server/config";
import { readPlans } from "@/server/installment";
import { getCurrentCustomer } from "@/server/session";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: `${t("title")} — Multimedia`, robots: { index: false } };
}

export default async function CheckoutPage({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations();

  // A signed-in customer gets the contact fields filled in. Guests order too,
  // so a database hiccup here must not take the page down.
  const customer = await getCurrentCustomer().catch(() => null);

  // Paying in parts is settled on delivery or in the store, so it needs that method.
  const plans = getPaymentMethods().includes("cash") ? await readPlans().catch(() => []) : [];

  const modes = getPaymentModes();
  const methods = getPaymentMethods().map((method) => ({
    method,
    demo: method !== "cash" && modes[method] === "demo",
  }));

  return (
    <div className="flex flex-col gap-5 pt-5 sm:pt-7">
      <Breadcrumbs
        items={[
          { label: t("productPage.home"), href: "/" },
          { label: t("cart.title"), href: "/cart" },
          { label: t("checkout.title") },
        ]}
      />
      <h1 className="enter px-1 text-[1.75rem] font-semibold leading-tight sm:text-4xl">{t("checkout.title")}</h1>
      <CheckoutForm
        zones={deliveryZones.map((zone) => ({
          slug: zone.slug,
          name: zone.name[locale],
          fee: zone.fee,
          days: zone.days,
        }))}
        freeFrom={FREE_DELIVERY_FROM}
        methods={methods}
        plans={plans}
        customer={customer ? { name: customer.name ?? "", phone: customer.phone } : null}
        pickupAddress={t("footer.address")}
      />
    </div>
  );
}
