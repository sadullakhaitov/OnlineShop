"use client";

import { useEffect, useMemo } from "react";
import { SearchX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { categories } from "@/data/categories";
import type { Product } from "@/data/products";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { PAGE_SIZE, createCatalog, getCategory, sortOptions, type SortOption } from "@/lib/catalog";
import { gridDelay } from "@/lib/motion";
import { CatalogShell } from "./CatalogShell";
import { ProductCard } from "@/components/product/ProductCard";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";

type Props = {
  products: Product[];
  /** The filters to show, as in the address after "?"; the copy made in advance shows none. */
  query: string;
};

function toNumber(value: string): number | undefined {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : undefined;
}

/**
 * The catalogue page, worked out in the browser.
 *
 * The page itself is made in advance and served from the host's cache, with
 * every product in it. Filters, search, sorting and pages are then applied
 * right here, so a tap in the Mini App shows results at once instead of
 * waiting for a server to start.
 */
export function CatalogView({ products, query }: Props) {
  const t = useTranslations("catalog");
  const tp = useTranslations("productPage");
  const locale = useLocale() as Locale;
  const catalog = useMemo(() => createCatalog(products), [products]);
  const sp = useMemo(() => new URLSearchParams(query), [query]);

  const get = (key: string) => sp.get(key) ?? "";
  const q = get("q").trim().slice(0, 80);
  const category = getCategory(get("category"));
  const sortParam = get("sort");
  const sort = (sortOptions as readonly string[]).includes(sortParam) ? (sortParam as SortOption) : "popular";

  const items = catalog.find({
    q: q || undefined,
    category: category?.slug,
    brands: get("brand").split(",").filter(Boolean),
    min: toNumber(get("min")),
    max: toNumber(get("max")),
    sale: get("sale") === "1",
    inStock: get("stock") === "1",
    sort,
  });

  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(get("page")) || 1));
  const visible = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = catalog.categoryCounts();
  const title = q ? t("searchTitle", { q }) : category ? category.name[locale] : t("allProducts");

  useEffect(() => {
    document.title = `${category ? category.name[locale] : t("title")} — Multimedia`;
  }, [category, locale, t]);

  const crumbs: Crumb[] = [{ label: tp("home"), href: "/" }];
  if (category || q) {
    crumbs.push({ label: t("title"), href: "/catalog" });
    crumbs.push({ label: category ? category.name[locale] : `«${q}»` });
  } else {
    crumbs.push({ label: t("title") });
  }

  // Keeps current filters when moving between pages.
  const pageHref = (target: number) => {
    const query: Record<string, string> = {};
    for (const [key, value] of sp.entries()) {
      if (value && key !== "page") query[key] = value;
    }
    if (target > 1) query.page = String(target);
    return { pathname: "/catalog", query };
  };

  return (
    <div className="flex flex-col gap-5 pt-5 sm:pt-7">
      <Breadcrumbs items={crumbs} />

      <CatalogShell
        title={title}
        total={items.length}
        searchParams={sp}
        categories={categories.map((item) => ({
          value: item.slug,
          label: item.name[locale],
          count: counts[item.slug] ?? 0,
        }))}
        brands={catalog.brands(category?.slug).map((brand) => ({
          value: brand.name,
          label: brand.name,
          count: brand.count,
        }))}
      >
        {visible.length === 0 ? (
          <div className="glass enter flex flex-col items-center rounded-[1.75rem] px-6 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
              <SearchX className="size-7" strokeWidth={1.5} />
            </span>
            <h2 className="mt-5 text-xl font-semibold">{t("emptyTitle")}</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{t("emptyText")}</p>
            <Link href="/catalog" className="btn btn-primary mt-6">
              {t("reset")}
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {visible.map((product, i) => (
                <ProductCard key={product.id} product={product} enter={gridDelay(i)} />
              ))}
            </div>

            {pages > 1 && (
              <nav aria-label={t("pagination")} className="mt-8 flex justify-center">
                <ul className="glass enter flex items-center gap-1 rounded-full p-1.5">
                  {Array.from({ length: pages }, (_, index) => index + 1).map((number) => (
                    <li key={number}>
                      <Link
                        href={pageHref(number)}
                        aria-label={t("page", { page: number })}
                        aria-current={number === page ? "page" : undefined}
                        className={`grid size-10 place-items-center rounded-full text-sm font-medium tabular-nums transition-colors duration-300 ${
                          number === page ? "bg-btn text-btn-text" : "text-muted hover:bg-hairline hover:text-ink"
                        }`}
                      >
                        {number}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </>
        )}
      </CatalogShell>
    </div>
  );
}

/** The catalogue for the filters in the address. */
export function CatalogFromAddress({ products }: { products: Product[] }) {
  return <CatalogView products={products} query={useSearchParams().toString()} />;
}
