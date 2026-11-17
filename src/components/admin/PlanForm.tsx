"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { savePlanAction, type PlanActionState } from "@/server/admin/actions";

const label = "mb-1.5 block text-[0.8125rem] font-medium text-muted";

/** Adds terms for paying in parts, or changes the markup of existing ones. */
export function PlanForm() {
  const t = useTranslations("admin.installment");
  const [state, action, pending] = useActionState<PlanActionState, FormData>(savePlanAction, null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  const invalid = (state && !state.ok && state.error === "invalid") || undefined;

  return (
    <form ref={form} action={action} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
      <div>
        <label htmlFor="plan-months" className={label}>
          {t("months")}
        </label>
        <input id="plan-months" name="months" inputMode="numeric" className="field" placeholder="12" aria-invalid={invalid} />
      </div>
      <div>
        <label htmlFor="plan-markup" className={label}>
          {t("markup")}
        </label>
        <input id="plan-markup" name="markup" inputMode="numeric" className="field" placeholder="0" aria-invalid={invalid} />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary h-11 px-5 disabled:opacity-60">
        {t("save")}
      </button>
      {state && (
        <p role="status" className={`text-sm sm:col-span-3 ${state.ok ? "text-success" : "text-danger"}`}>
          {state.ok ? t("saved") : t(`errors.${state.error}`)}
        </p>
      )}
    </form>
  );
}
