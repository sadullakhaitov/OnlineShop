import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ProductSpecs } from "@/data/products";
import { getCatalog } from "@/server/catalog";
import { CatalogFromAddress, CatalogView } from "@/components/catalog/CatalogView";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "catalog" });
  return { title: `${t("title")} — Multimedia` };
}

/**
 * Made in advance like the home page and kept in the host's cache; saving a
 * product in the admin panel makes it again. The page carries every product
 * (without the specification table, which cards do not show) and the browser
 * applies filters and search from the address.
 */
export default async function CatalogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const products = (await getCatalog()).all().map((product) => ({ ...product, specs: {} as ProductSpecs }));

  return (
    // Before the page wakes up, the full list shows; then the address decides.
    <Suspense fallback={<CatalogView products={products} query="" />}>
      <CatalogFromAddress products={products} />
    </Suspense>
  );
}
