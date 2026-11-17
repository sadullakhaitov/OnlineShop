"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "@/server/admin/actions";

export function AdminLoginForm() {
  const t = useTranslations("admin.login");
  const [state, action, pending] = useActionState(loginAction, null);
  const error = state ? t(`errors.${state.error}`, { minutes: state.minutes ?? 15 }) : null;

  return (
    <form action={action} className="mt-6">
      <label htmlFor="admin-password" className="mb-1.5 block text-[0.8125rem] font-medium text-muted">
        {t("password")}
      </label>
      <input
        id="admin-password"
        name="password"
        type="password"
        className="field h-12"
        autoComplete="current-password"
        maxLength={500}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? "admin-login-error" : undefined}
        required
        autoFocus
      />
      {error && (
        <p id="admin-login-error" role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary mt-5 h-12 w-full text-[0.9375rem] disabled:opacity-60">
        {pending ? t("checking") : t("submit")}
      </button>
    </form>
  );
}
