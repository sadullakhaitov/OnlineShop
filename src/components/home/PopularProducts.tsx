import { getLocale, getTranslations } from "next-intl/server";
import { categories } from "@/data/categories";
import type { Product } from "@/data/products";
import type { Locale } from "@/i18n/routing";
import { getCatalog } from "@/server/catalog";
import { getInterest, topProducts } from "@/server/search-interest";
import { ProductCard } from "@/components/product/ProductCard";
import { PopularTabs } from "./PopularTabs";

const LIMIT = 10;

/**
 * Category chips and the products customers search for most. A chip shows the
 * top products of its category right here; every list is prepared on the
 * server, so switching is instant.
 */
export async function PopularProducts() {
  const t = await getTranslations("popular");
  const locale = (await getLocale()) as Locale;
  const [catalog, scores] = await Promise.all([getCatalog(), getInterest()]);
  const top = topProducts(catalog, scores, LIMIT);

  const grid = (products: Product[]) =>
    products.length > 0 ? (
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {products.map((product, i) => (
          <ProductCard key={product.id} product={product} reveal={(i % 5) * 70} />
        ))}
      </div>
    ) : (
      <p className="glass rounded-[1.5rem] px-6 py-12 text-center text-sm text-muted">{t("empty")}</p>
    );

  return (
    <PopularTabs
      tabs={[
        { slug: "all", panel: grid(top.all) },
        ...categories.map((category) => ({
          slug: category.slug,
          name: category.name[locale],
          icon: category.icon,
          panel: grid(top.byCategory[category.slug] ?? []),
        })),
      ]}
    />
  );
}
