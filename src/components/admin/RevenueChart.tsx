import { useLocale, useTranslations } from "next-intl";
import { formatDay, formatPrice } from "@/lib/format";
import type { DayTotal } from "@/server/admin/orders";

/** A round number at or above `max`, and the three or four steps leading to it. */
function axis(max: number): number[] {
  const rough = Math.max(max, 1) / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((value) => value >= rough) ?? power * 10;
  const count = Math.max(1, Math.ceil(max / step));
  return Array.from({ length: count + 1 }, (_, index) => index * step);
}

/**
 * Money received per day as thin columns. Works without scripts: a column
 * shows its numbers on hover and on keyboard focus, and the same numbers are
 * in the table under the chart.
 */
export function RevenueChart({ days }: { days: DayTotal[] }) {
  const t = useTranslations("admin.dashboard");
  const locale = useLocale();

  const max = Math.max(...days.map((day) => day.revenue));
  const ticks = axis(max);
  const top = ticks[ticks.length - 1];
  const compact = (value: number) => {
    if (value === 0) return "0";
    const [key, unit] = value >= 1_000_000 ? (["mln", 1_000_000] as const) : (["thousand", 1000] as const);
    return t(key, { value: (value / unit).toLocaleString(locale === "ru" ? "ru-RU" : "uz-Latn-UZ", { maximumFractionDigits: 1 }) });
  };
  const last = days.length - 1;

  return (
    <figure className="glass overflow-x-clip rounded-[1.5rem] p-5 sm:p-6">
      <figcaption>
        <h2 className="text-[0.9375rem] font-semibold">{t("chart")}</h2>
        <p className="mt-0.5 text-xs text-muted">
          {t("chartHint", { from: formatDay(days[0].date, locale), to: formatDay(days[last].date, locale) })}
        </p>
      </figcaption>

      {max === 0 ? (
        <p className="grid h-44 place-items-center text-sm text-muted">{t("chartEmpty")}</p>
      ) : (
        <div className="mt-6 flex gap-3">
          {/* Value axis, top to bottom */}
          <div
            aria-hidden="true"
            className="flex h-44 flex-col-reverse justify-between text-right text-[0.6875rem] leading-none tabular-nums text-muted"
          >
            {ticks.map((tick) => (
              <span key={tick} className="-my-1.5 py-1">
                {compact(tick)}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative h-44">
              {ticks.map((tick) => (
                <span
                  key={tick}
                  aria-hidden="true"
                  className="absolute inset-x-0 h-px bg-hairline"
                  style={{ bottom: `${(tick / top) * 100}%` }}
                />
              ))}

              <ol className="relative flex h-full items-end gap-0.5">
                {days.map((day, index) => {
                  const date = formatDay(day.date, locale);
                  // A note opens towards the middle of the chart, so that it never
                  // sticks out of the card, however narrow the screen is.
                  const side = index < days.length / 2 ? "left-0" : "right-0";
                  return (
                    <li
                      key={day.date.getTime()}
                      tabIndex={0}
                      aria-label={t("chartDay", { date, amount: formatPrice(day.revenue), orders: day.orders })}
                      className="group relative flex h-full flex-1 items-end justify-center rounded-md outline-offset-0"
                    >
                      <span className="relative block w-full max-w-6" style={{ height: `${(day.revenue / top) * 100}%` }}>
                        {day.revenue > 0 && (
                          <span className="absolute inset-0 min-h-0.5 rounded-t-[4px] bg-[var(--chart)] transition-opacity duration-300 group-hover:opacity-75 group-focus-visible:opacity-75" />
                        )}
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-xl border border-hairline bg-bg px-3 py-2 text-xs opacity-0 shadow-[0_12px_28px_-14px_var(--glass-shadow)] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 ${side}`}
                        >
                          <span className="block text-[0.8125rem] font-semibold text-ink">{t("sum", { amount: formatPrice(day.revenue) })}</span>
                          <span className="mt-0.5 block text-muted">
                            {date} · {t("periodOrders", { count: day.orders })}
                          </span>
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Day axis */}
            <div aria-hidden="true" className="mt-2 flex gap-0.5 text-center text-[0.625rem] leading-none tabular-nums">
              {days.map((day, index) => (
                <span key={day.date.getTime()} className={`flex-1 ${index === last ? "font-semibold text-ink" : "text-muted"}`}>
                  {formatDay(day.date, locale).match(/\d+/)?.[0]}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <details className="mt-4 text-xs">
        <summary className="w-fit cursor-pointer text-muted transition-colors duration-300 hover:text-ink">
          {t("chartTable")}
        </summary>
        <table className="mt-3 w-full max-w-sm tabular-nums">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">{t("colDay")}</th>
              <th className="py-1 text-right font-medium">{t("colOrders")}</th>
              <th className="py-1 text-right font-medium">{t("colRevenue")}</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.date.getTime()} className="border-t border-hairline">
                <td className="py-1.5">{formatDay(day.date, locale)}</td>
                <td className="py-1.5 text-right">{day.orders}</td>
                <td className="py-1.5 text-right">{formatPrice(day.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
