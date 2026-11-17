import { ArrowRight, CalendarClock, Send } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDb } from "@/db";
import { Link } from "@/i18n/navigation";
import { formatDay, formatPrice } from "@/lib/format";
import { enterDelay } from "@/lib/motion";
import { getDashboard } from "@/server/admin/orders";
import { requireAdmin } from "@/server/admin/session";
import type { OrderWithItems } from "@/server/orders";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { OrderRows } from "@/components/admin/OrderRow";
import { RevenueChart } from "@/components/admin/RevenueChart";

type Props = {
  params: Promise<{ locale: string }>;
};

type Tile = {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  /** Draws the eye when the number asks for action */
  loud?: boolean;
  href?: { pathname: string; query: Record<string, string> };
};

export default async function AdminDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const t = await getTranslations("admin.dashboard");
  const tNav = await getTranslations("admin.nav");
  const tProduct = await getTranslations("product");
  const now = new Date();
  const board = await getDashboard(await getDb(), now);
  const currency = tProduct("currency");

  const tiles: Tile[] = [
    {
      label: t("todayOrders"),
      value: String(board.today.orders),
      hint: t("todayAmount", { amount: formatPrice(board.today.amount) }),
    },
    {
      label: t("todayRevenue"),
      value: formatPrice(board.today.revenue),
      unit: currency,
      hint: t("revenueHint"),
    },
    {
      label: t("waiting"),
      value: String(board.waiting),
      hint: t("waitingHint"),
      loud: board.waiting > 0,
      href: { pathname: "/admin/orders", query: { status: "new" } },
    },
    {
      label: t("delivering"),
      value: String(board.delivering),
      hint: t("deliveringHint"),
      href: { pathname: "/admin/orders", query: { status: "delivering" } },
    },
  ];

  const periods = [
    { label: t("week"), ...board.week },
    { label: t("month"), ...board.month },
  ];

  const attention: { title: string; orders: OrderWithItems[] }[] = [
    { title: t("fresh"), orders: board.attention.fresh },
    { title: t("toRefund"), orders: board.attention.toRefund },
    { title: t("unpaidDelivered"), orders: board.attention.unpaidDelivered },
  ].filter((group) => group.orders.length > 0);

  const tileClass = "glass enter flex flex-col rounded-[1.5rem] p-5";

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh />

      <header className="enter">
        <h1 className="text-[1.75rem] font-semibold sm:text-[2rem]">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("today", { date: formatDay(now, locale) })}</p>
        {/* On a phone these settings are not on the tab bar. */}
        <nav className="mt-4 flex flex-wrap gap-2 lg:hidden" aria-label={tNav("settings")}>
          <Link href="/admin/installment" className="btn btn-ghost h-9 px-3.5 text-[0.8125rem]">
            <CalendarClock className="size-4" strokeWidth={1.8} />
            {tNav("installment")}
          </Link>
          <Link href="/admin/telegram" className="btn btn-ghost h-9 px-3.5 text-[0.8125rem]">
            <Send className="size-4" strokeWidth={1.8} />
            {tNav("telegram")}
          </Link>
        </nav>
      </header>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {tiles.map((tile, index) => {
          const body = (
            <>
              <span className="text-[0.8125rem] text-muted">{tile.label}</span>
              <span className={`mt-3 text-[1.75rem] font-semibold leading-none tracking-tight ${tile.loud ? "text-accent" : ""}`}>
                {tile.value}
                {tile.unit && <span className="ml-1.5 text-sm font-medium text-muted">{tile.unit}</span>}
              </span>
              <span className="mt-2 text-xs text-muted">{tile.hint}</span>
            </>
          );
          return (
            <li key={tile.label} className="contents">
              {tile.href ? (
                <Link href={tile.href} className={`${tileClass} lift`} style={enterDelay(index * 50)}>
                  {body}
                </Link>
              ) : (
                <div className={tileClass} style={enterDelay(index * 50)}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <RevenueChart days={board.days} />

        <dl className="glass grid grid-cols-2 gap-x-6 rounded-[1.5rem] p-5 sm:p-6 xl:grid-cols-1 xl:content-start xl:gap-y-6">
          {periods.map((period) => (
            <div key={period.label}>
              <dt className="text-[0.8125rem] text-muted">{period.label}</dt>
              <dd className="mt-2">
                <span className="text-xl font-semibold tracking-tight">{formatPrice(period.revenue)}</span>
                <span className="ml-1.5 text-xs font-medium text-muted">{currency}</span>
                <span className="mt-1 block text-xs text-muted">{t("periodOrders", { count: period.orders })}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {board.recent.length === 0 ? (
        <p className="glass rounded-[1.5rem] px-6 py-10 text-center text-sm text-muted">{t("empty")}</p>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-lg font-semibold">{t("attention")}</h2>
            {attention.length === 0 ? (
              <p className="glass rounded-[1.5rem] px-5 py-4 text-sm text-muted">{t("allGood")}</p>
            ) : (
              <div className="flex flex-col gap-5">
                {attention.map((group) => (
                  <div key={group.title}>
                    <h3 className="mb-2 px-1 text-[0.8125rem] font-medium text-muted">{group.title}</h3>
                    <OrderRows orders={group.orders} />
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-4">
              <h2 className="text-lg font-semibold">{t("recent")}</h2>
              <Link
                href="/admin/orders"
                className="flex items-center gap-1 text-sm text-accent transition-opacity duration-300 hover:opacity-70"
              >
                {t("allOrders")}
                <ArrowRight className="size-4" strokeWidth={1.8} />
              </Link>
            </div>
            <OrderRows orders={board.recent} />
          </section>
        </>
      )}
    </div>
  );
}
