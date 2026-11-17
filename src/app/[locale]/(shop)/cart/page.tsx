import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CartView } from "@/components/cart/CartView";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cart" });
  return { title: `${t("title")} — Multimedia`, robots: { index: false } };
}

export default async function CartPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-5 pt-5 sm:pt-7">
      <Breadcrumbs items={[{ label: t("productPage.home"), href: "/" }, { label: t("cart.title") }]} />
      <h1 className="enter px-1 text-[1.75rem] font-semibold leading-tight sm:text-4xl">{t("cart.title")}</h1>
      <CartView />
    </div>
  );
}
