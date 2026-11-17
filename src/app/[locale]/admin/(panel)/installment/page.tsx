import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDb } from "@/db";
import { formatPrice } from "@/lib/format";
import { monthlyPayment } from "@/lib/installment";
import { deletePlanAction } from "@/server/admin/actions";
import { requireAdmin } from "@/server/admin/session";
import { getPaymentMethods } from "@/server/config";
import { listPlans } from "@/server/installment";
import { PlanForm } from "@/components/admin/PlanForm";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.installment" });
  return { title: `${t("title")} — Multimedia admin` };
}

const card = "glass enter rounded-[1.5rem] p-5 sm:p-6";
const EXAMPLE = 5_000_000;

export default async function AdminInstallmentPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin.installment");
  const plans = await listPlans(await getDb());
  const cashOff = !getPaymentMethods().includes("cash");

  return (
    <div className="flex flex-col gap-5">
      <header className="enter">
        <h1 className="text-[1.75rem] font-semibold sm:text-[2rem]">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("subtitle")}</p>
      </header>

      {cashOff && <p className="enter rounded-2xl bg-accent-soft px-4 py-3 text-sm text-accent">{t("cashOff")}</p>}

      <section className={card}>
        <h2 className="mb-4 text-[0.9375rem] font-semibold">{t("new")}</h2>
        <PlanForm />
      </section>

      <section className={card}>
        <h2 className="text-[0.9375rem] font-semibold">{t("list")}</h2>
        {plans.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline">
            {plans.map((plan) => (
              <li key={plan.months} className="flex items-center gap-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {t("monthsValue", { count: plan.months })}
                    <span className="ml-2 text-sm font-normal text-muted">
                      {plan.markup > 0 ? t("markupValue", { percent: plan.markup }) : t("noMarkup")}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-muted">
                    {t("example", { price: formatPrice(EXAMPLE), sum: formatPrice(monthlyPayment(EXAMPLE, plan)) })}
                  </p>
                </div>
                <form action={deletePlanAction}>
                  <input type="hidden" name="months" value={plan.months} />
                  <button type="submit" aria-label={t("delete", { count: plan.months })} className="icon-btn text-muted hover:text-danger">
                    <Trash2 className="size-4" strokeWidth={1.7} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
