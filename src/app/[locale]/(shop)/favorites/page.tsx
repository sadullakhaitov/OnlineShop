import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCatalog } from "@/server/catalog";
import { FavoritesGrid } from "@/components/favorites/FavoritesGrid";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

// With PostgreSQL this page is prepared ahead of time. The admin panel
// refreshes it when a product changes; this is the fallback for changes made
// elsewhere, in seconds.
export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "favorites" });
  return { title: `${t("title")} — Multimedia` };
}

export default async function FavoritesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-5 pt-5 sm:pt-7">
      <Breadcrumbs items={[{ label: t("productPage.home"), href: "/" }, { label: t("favorites.title") }]} />
      <h1 className="enter px-1 text-[1.75rem] font-semibold leading-tight sm:text-4xl">{t("favorites.title")}</h1>
      <FavoritesGrid products={(await getCatalog()).all()} />
    </div>
  );
}
