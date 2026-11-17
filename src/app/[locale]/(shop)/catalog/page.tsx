import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { categories } from "@/data/categories";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { PAGE_SIZE, getCategory, sortOptions, type SortOption } from "@/lib/catalog";
import { gridDelay } from "@/lib/motion";
import { getCatalog } from "@/server/catalog";
import { CatalogShell } from "@/components/catalog/CatalogShell";
import { ProductCard } from "@/components/product/ProductCard";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";

type SearchParams = Record<string, string | string[] | undefined>;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
};

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

function toNumber(value: string): number | undefined {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : undefined;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "catalog" });
  const category = getCategory(one((await searchParams).category));
  return { title: `${category ? category.name[locale as Locale] : t("title")} — Multimedia` };
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  const t = await getTranslations("catalog");
  const tp = await getTranslations("productPage");

  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 80);
  const category = getCategory(one(sp.category));
  const sortParam = one(sp.sort);
  const sort = (sortOptions as readonly string[]).includes(sortParam) ? (sortParam as SortOption) : "popular";

  const catalog = await getCatalog();
  const items = catalog.find({
    q: q || undefined,
    category: category?.slug,
    brands: one(sp.brand).split(",").filter(Boolean),
    min: toNumber(one(sp.min)),
    max: toNumber(one(sp.max)),
    sale: one(sp.sale) === "1",
    inStock: one(sp.stock) === "1",
    sort,
  });

  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(pages, Math.max(1, Number(one(sp.page)) || 1));
  const visible = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = catalog.categoryCounts();
  const title = q ? t("searchTitle", { q }) : category ? category.name[locale] : t("allProducts");

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
    for (const [key, value] of Object.entries(sp)) {
      const single = one(value);
      if (single && key !== "page") query[key] = single;
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
