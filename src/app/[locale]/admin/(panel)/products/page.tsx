import Form from "next/form";
import { FileSpreadsheet, Plus, Search, X } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDb } from "@/db";
import { categories } from "@/data/categories";
import { Link, getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCategory } from "@/lib/catalog";
import { PRODUCT_STATES, listAdminProducts, type ProductState } from "@/server/admin/products";
import { requireAdmin } from "@/server/admin/session";
import { Pagination } from "@/components/admin/Pagination";
import { ProductRows } from "@/components/admin/ProductRow";
import { Select } from "@/components/ui/Select";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function AdminProductsPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  await requireAdmin();

  const query = await searchParams;
  const state = PRODUCT_STATES.find((item) => item === one(query.state));
  const category = getCategory(one(query.category))?.slug;
  const q = (one(query.q) ?? "").trim().slice(0, 60);
  const page = Number(one(query.page)) || 1;

  const t = await getTranslations("admin");
  const list = await listAdminProducts(await getDb(), { q, category, state, page });
  const everything = list.counts.onSale + list.counts.soldOut + list.counts.hidden;

  // Links keep the search and the section; a new tab or search starts from page one.
  const href = (next: { state?: ProductState | null; page?: number; q?: string }) => {
    const target = next.state === undefined ? state : (next.state ?? undefined);
    const text = next.q ?? q;
    return {
      pathname: "/admin/products",
      query: {
        ...(target ? { state: target } : {}),
        ...(category ? { category } : {}),
        ...(text ? { q: text } : {}),
        ...(next.page && next.page > 1 ? { page: String(next.page) } : {}),
      },
    };
  };

  const tabs: { key: string; label: string; count: number; state: ProductState | null }[] = [
    { key: "all", label: t("products.all"), count: everything, state: null },
    ...PRODUCT_STATES.map((item) => ({
      key: item,
      label: t(`products.state.${item}`),
      count: list.counts[item],
      state: item,
    })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="enter flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[1.75rem] font-semibold sm:text-[2rem]">{t("products.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("products.found", { count: list.total })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/products/import" className="btn btn-ghost">
            <FileSpreadsheet className="size-4" strokeWidth={1.8} />
            {t("products.import")}
          </Link>
          <Link href="/admin/products/new" className="btn btn-primary">
            <Plus className="size-4" strokeWidth={2} />
            {t("products.add")}
          </Link>
        </div>
      </header>

      <Form action={getPathname({ href: "/admin/products", locale })} className="flex flex-wrap gap-2">
        {state && <input type="hidden" name="state" value={state} />}
        <div className="field-group min-w-0 flex-1 basis-56 sm:max-w-80">
          <Search className="size-4 shrink-0 text-muted" strokeWidth={1.8} />
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder={t("products.search")}
            aria-label={t("products.search")}
            maxLength={60}
            autoComplete="off"
            enterKeyHint="search"
            className="[&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <Link
              href={href({ q: "" })}
              aria-label={t("orders.searchReset")}
              className="-mr-1.5 grid size-7 shrink-0 place-items-center rounded-full text-muted transition-colors duration-300 hover:bg-hairline hover:text-ink"
            >
              <X className="size-4" strokeWidth={1.8} />
            </Link>
          )}
        </div>
        <div className="min-w-0 flex-1 basis-44 sm:max-w-60">
          {/* The key makes the select follow the address when a link changes the section. */}
          <Select key={category ?? ""} name="category" defaultValue={category ?? ""} submitOnChange aria-label={t("products.category")}>
            <option value="">{t("products.allCategories")}</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name[locale]}
              </option>
            ))}
          </Select>
        </div>
        <button type="submit" className="btn btn-ghost shrink-0">
          {t("orders.searchSubmit")}
        </button>
      </Form>

      <nav aria-label={t("products.states")} className="no-scrollbar -mx-3 overflow-x-auto px-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <ul className="flex w-max gap-1.5">
          {tabs.map((tab) => {
            const current = (tab.state ?? undefined) === state;
            return (
              <li key={tab.key}>
                <Link
                  href={href({ state: tab.state })}
                  aria-current={current ? "page" : undefined}
                  className={`flex h-9 items-center gap-2 rounded-full px-3.5 text-[0.8125rem] font-medium transition-colors duration-300 ${
                    current ? "bg-btn text-btn-text" : "border border-hairline text-muted hover:text-ink"
                  }`}
                >
                  {tab.label}
                  <span className={`tabular-nums ${current ? "opacity-70" : "text-faint"}`}>{tab.count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {list.products.length === 0 ? (
        <div className="glass flex flex-col items-center rounded-[1.5rem] px-6 py-14 text-center">
          <h2 className="text-lg font-semibold">{t("products.emptyTitle")}</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{t("products.emptyText")}</p>
        </div>
      ) : (
        <ProductRows products={list.products} />
      )}

      <Pagination page={list.page} pages={list.pages} href={(target) => href({ page: target })} />
    </div>
  );
}
