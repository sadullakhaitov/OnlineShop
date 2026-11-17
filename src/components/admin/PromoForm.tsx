"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createPromoAction, type PromoActionState } from "@/server/admin/actions";
import { Select } from "@/components/ui/Select";

const label = "mb-1.5 block text-[0.8125rem] font-medium text-muted";

/** The form that adds a promo code. */
export function PromoForm() {
  const t = useTranslations("admin.promo");
  const [state, action, pending] = useActionState<PromoActionState, FormData>(createPromoAction, null);
  const [kind, setKind] = useState<"percent" | "amount">("percent");
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // A saved code clears the fields for the next one.
    if (state?.ok) form.current?.reset();
  }, [state]);

  const bad = (field: string) => (state && !state.ok && state.error === "invalid" && state.fields.includes(field as never)) || undefined;

  return (
    <form ref={form} action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" noValidate>
      <div>
        <label htmlFor="promo-code" className={label}>
          {t("code")}
        </label>
        <input id="promo-code" name="code" className="field uppercase" placeholder="YANGI10" maxLength={30} required aria-invalid={bad("code")} />
      </div>
      <div>
        <label htmlFor="promo-kind" className={label}>
          {t("kind")}
        </label>
        <Select id="promo-kind" name="kind" value={kind} onValueChange={(value) => setKind(value as "percent" | "amount")}>
          <option value="percent">{t("percent")}</option>
          <option value="amount">{t("amount")}</option>
        </Select>
      </div>
      <div>
        <label htmlFor="promo-value" className={label}>
          {kind === "percent" ? t("valuePercent") : t("valueAmount")}
        </label>
        <input id="promo-value" name="value" inputMode="numeric" className="field" placeholder={kind === "percent" ? "10" : "100000"} aria-invalid={bad("value")} />
      </div>
      <div>
        <label htmlFor="promo-min" className={label}>
          {t("minTotal")}
        </label>
        <input id="promo-min" name="minTotal" inputMode="numeric" className="field" placeholder="0" aria-invalid={bad("minTotal")} />
      </div>
      <div>
        <label htmlFor="promo-uses" className={label}>
          {t("maxUses")}
        </label>
        <input id="promo-uses" name="maxUses" inputMode="numeric" className="field" placeholder={t("unlimited")} aria-invalid={bad("maxUses")} />
      </div>
      <div>
        <label htmlFor="promo-expires" className={label}>
          {t("expiresAt")}
        </label>
        <input id="promo-expires" name="expiresAt" type="date" className="field" aria-invalid={bad("expiresAt")} />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
        <button type="submit" disabled={pending} className="btn btn-primary h-11 px-5 disabled:opacity-60">
          {t("add")}
        </button>
        {state?.ok && (
          <p role="status" className="text-sm text-success">
            {t("added")}
          </p>
        )}
        {state && !state.ok && (
          <p role="alert" className="text-sm text-danger">
            {t(`errors.${state.error}`)}
          </p>
        )}
      </div>
    </form>
  );
}
