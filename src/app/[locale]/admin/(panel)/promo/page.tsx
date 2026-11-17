import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDb } from "@/db";
import type { Locale } from "@/i18n/routing";
import { formatDateTime, formatPrice } from "@/lib/format";
import { deletePromoAction, togglePromoAction } from "@/server/admin/actions";
import { listPromos } from "@/server/admin/promo";
import { requireAdmin } from "@/server/admin/session";
import { PromoForm } from "@/components/admin/PromoForm";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.promo" });
  return { title: `${t("title")} — Multimedia admin` };
}

const card = "glass rounded-[1.5rem] p-5 sm:p-6";

export default async function AdminPromoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin.promo");
  const promos = await listPromos(await getDb());
  const now = new Date();

  return (
    <div className="flex flex-col gap-5">
      <header className="enter">
        <h1 className="text-[1.75rem] font-semibold sm:text-[2rem]">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
      </header>

      <section className={`${card} enter`}>
        <h2 className="mb-4 text-[0.9375rem] font-semibold">{t("new")}</h2>
        <PromoForm />
      </section>

      <section className={`${card} enter`}>
        <h2 className="text-[0.9375rem] font-semibold">{t("list")}</h2>
        {promos.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--hairline)]">
            {promos.map((promo) => {
              const expired = promo.expiresAt !== null && promo.expiresAt <= now;
              const usedUp = promo.maxUses !== null && promo.uses >= promo.maxUses;
              const state = !promo.active ? "off" : expired ? "expired" : usedUp ? "usedUp" : "on";
              return (
                <li key={promo.code} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold tracking-wide">{promo.code}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${
                          state === "on" ? "bg-accent-soft text-accent" : "border border-hairline text-muted"
                        }`}
                      >
                        {t(`state.${state}`)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {promo.kind === "percent" ? `−${promo.value}%` : `−${formatPrice(promo.value)} so'm`}
                      {promo.minTotal > 0 && ` · ${t("from", { sum: formatPrice(promo.minTotal) })}`}
                      {` · ${t("uses", { uses: promo.uses, max: promo.maxUses ?? "∞" })}`}
                      {promo.expiresAt && ` · ${t("until", { date: formatDateTime(promo.expiresAt, locale as Locale) })}`}
                    </p>
                  </div>
                  <form action={togglePromoAction}>
                    <input type="hidden" name="code" value={promo.code} />
                    <input type="hidden" name="active" value={promo.active ? "0" : "1"} />
                    <button type="submit" className="btn btn-ghost h-9 px-3.5 text-[0.8125rem]">
                      {promo.active ? t("turnOff") : t("turnOn")}
                    </button>
                  </form>
                  <form action={deletePromoAction}>
                    <input type="hidden" name="code" value={promo.code} />
                    <button type="submit" aria-label={t("delete", { code: promo.code })} className="icon-btn text-muted hover:text-danger">
                      <Trash2 className="size-4" strokeWidth={1.7} />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
