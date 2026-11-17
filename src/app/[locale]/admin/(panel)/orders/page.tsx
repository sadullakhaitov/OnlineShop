import Form from "next/form";
import { Search, X } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDb } from "@/db";
import type { OrderStatus } from "@/db/schema";
import { Link, getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { ORDER_STATUSES, listAdminOrders } from "@/server/admin/orders";
import { requireAdmin } from "@/server/admin/session";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { OrderRows } from "@/components/admin/OrderRow";
import { Pagination } from "@/components/admin/Pagination";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function AdminOrdersPage({ params, searchParams }: Props) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  await requireAdmin();

  const query = await searchParams;
  const status = ORDER_STATUSES.find((item) => item === one(query.status));
  const q = (one(query.q) ?? "").trim().slice(0, 60);
  const page = Number(one(query.page)) || 1;

  const t = await getTranslations("admin");
  const list = await listAdminOrders(await getDb(), { status, q, page });
  const everything = Object.values(list.counts).reduce((sum, value) => sum + value, 0);

  // Links keep the search and the tab; a new search or tab starts from page one.
  const href = (next: { status?: OrderStatus | null; page?: number }) => {
    const target = next.status === undefined ? status : (next.status ?? undefined);
    return {
      pathname: "/admin/orders",
      query: {
        ...(target ? { status: target } : {}),
        ...(q ? { q } : {}),
        ...(next.page && next.page > 1 ? { page: String(next.page) } : {}),
      },
    };
  };

  const tabs: { key: string; label: string; count: number; status: OrderStatus | null }[] = [
    { key: "all", label: t("orders.all"), count: everything, status: null },
    ...ORDER_STATUSES.map((item) => ({
      key: item,
      label: t(`status.${item}`),
      count: list.counts[item],
      status: item,
    })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <AutoRefresh />

      <header className="enter flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[1.75rem] font-semibold sm:text-[2rem]">{t("orders.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("orders.found", { count: list.total })}</p>
        </div>

        <Form action={getPathname({ href: "/admin/orders", locale })} className="flex w-full gap-2 sm:w-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="field-group min-w-0 flex-1 sm:w-72 sm:flex-none">
            <Search className="size-4 shrink-0 text-muted" strokeWidth={1.8} />
            <input
              name="q"
              type="search"
              defaultValue={q}
              placeholder={t("orders.search")}
              aria-label={t("orders.search")}
              maxLength={60}
              autoComplete="off"
              enterKeyHint="search"
              className="[&::-webkit-search-cancel-button]:hidden"
            />
            {q && (
              <Link href={{ pathname: "/admin/orders", query: status ? { status } : {} }} aria-label={t("orders.searchReset")} className="-mr-1.5 grid size-7 shrink-0 place-items-center rounded-full text-muted transition-colors duration-300 hover:bg-hairline hover:text-ink">
                <X className="size-4" strokeWidth={1.8} />
              </Link>
            )}
          </div>
          <button type="submit" className="btn btn-primary shrink-0">
            {t("orders.searchSubmit")}
          </button>
        </Form>
      </header>

      <nav aria-label={t("order.status")} className="no-scrollbar -mx-3 overflow-x-auto px-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <ul className="flex w-max gap-1.5">
          {tabs.map((tab) => {
            const current = (tab.status ?? undefined) === status;
            return (
              <li key={tab.key}>
                <Link
                  href={href({ status: tab.status })}
                  aria-current={current ? "page" : undefined}
                  className={`flex h-9 items-center gap-2 rounded-full px-3.5 text-[0.8125rem] font-medium transition-colors duration-300 ${
                    current ? "bg-btn text-btn-text" : "border border-hairline text-muted hover:text-ink"
                  }`}
                >
                  {tab.label}
                  <span className={`tabular-nums ${current ? "opacity-70" : tab.status === "new" && tab.count > 0 ? "text-accent" : "text-faint"}`}>
                    {tab.count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {list.orders.length === 0 ? (
        <div className="glass flex flex-col items-center rounded-[1.5rem] px-6 py-14 text-center">
          <h2 className="text-lg font-semibold">{t("orders.emptyTitle")}</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            {everything === 0 && !q ? t("orders.noOrdersText") : t("orders.emptyText")}
          </p>
        </div>
      ) : (
        <OrderRows orders={list.orders} />
      )}

      <Pagination page={list.page} pages={list.pages} href={(page) => href({ page })} />
    </div>
  );
}
