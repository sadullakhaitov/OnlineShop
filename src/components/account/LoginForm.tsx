"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AUTH_EVENT } from "@/lib/auth-hint";
import { formatPhone } from "@/lib/phone";
import { PhoneField } from "@/components/ui/PhoneField";

const CODE_LENGTH = 6;

type CodeResponse = {
  ok?: boolean;
  error?: string;
  retryAfter?: number;
  resendAfter?: number;
  demoCode?: string;
} | null;

/** Signing in: first the phone number, then the code from the SMS. */
export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  /** Seconds until another code may be requested */
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const fullPhone = `+998${phone}`;

  async function post(url: string, body: Record<string, string>): Promise<CodeResponse> {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return (await response.json().catch(() => null)) as CodeResponse;
    } catch {
      return null;
    }
  }

  async function requestCode() {
    if (busy) return;
    if (phone.length !== 9) return setError(t("errors.phone"));

    setBusy(true);
    setError(null);
    const data = await post("/api/auth/code", { phone: fullPhone, locale });
    setBusy(false);

    if (data?.ok) {
      setStep("code");
      setCode("");
      setDemoCode(data.demoCode ?? null);
      setWait(data.resendAfter ?? 60);
    } else if (data?.error === "wait") {
      // A code was sent a moment ago: let the customer enter it.
      setStep("code");
      setWait(data.retryAfter ?? 60);
      setError(t("errors.wait", { seconds: data.retryAfter ?? 60 }));
    } else if (data?.error === "phone" || data?.error === "limit" || data?.error === "sms") {
      setError(t(`errors.${data.error}`));
    } else {
      setError(t("errors.generic"));
    }
  }

  async function verify(value: string) {
    if (busy || value.length !== CODE_LENGTH) return;

    setBusy(true);
    setError(null);
    const data = await post("/api/auth/verify", { phone: fullPhone, code: value });

    if (data?.ok) {
      window.dispatchEvent(new Event(AUTH_EVENT));
      router.replace("/account");
      router.refresh();
      return;
    }
    setBusy(false);
    setCode("");
    const known = data?.error === "invalid" || data?.error === "expired" || data?.error === "attempts";
    setError(t(`errors.${known ? data.error : "generic"}`));
  }

  if (step === "phone") {
    return (
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          requestCode();
        }}
      >
        <h1 className="text-2xl font-semibold sm:text-[1.75rem]">{t("title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t("text")}</p>

        <label htmlFor="login-phone" className="mb-1.5 mt-6 block text-[0.8125rem] font-medium text-muted">
          {t("phone")}
        </label>
        <PhoneField
          id="login-phone"
          value={phone}
          onChange={(digits) => {
            setPhone(digits);
            setError(null);
          }}
          invalid={Boolean(error)}
          describedBy={error ? "login-error" : undefined}
          autoFocus
        />
        {error && (
          <p id="login-error" role="alert" className="mt-2 text-xs text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary mt-5 h-12 w-full text-[0.9375rem] disabled:opacity-60">
          {busy ? t("sending") : t("getCode")}
        </button>
      </form>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        verify(code);
      }}
    >
      <h1 className="text-2xl font-semibold sm:text-[1.75rem]">{t("codeTitle")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("codeText", { phone: formatPhone(fullPhone) })}</p>

      {demoCode && (
        <p className="mt-4 rounded-xl bg-accent-soft px-3.5 py-2.5 text-[0.8125rem] leading-snug text-accent">
          {t("demoCode", { code: demoCode })}
        </p>
      )}

      <label htmlFor="login-code" className="mb-1.5 mt-6 block text-[0.8125rem] font-medium text-muted">
        {t("code")}
      </label>
      <input
        id="login-code"
        className="field h-14 text-center text-2xl font-semibold tabular-nums tracking-[0.4em]"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        placeholder="••••••"
        value={code}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
          setCode(digits);
          setError(null);
          // The last digit sends the form by itself.
          if (digits.length === CODE_LENGTH) verify(digits);
        }}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? "login-error" : undefined}
        disabled={busy}
        autoFocus
      />
      {error && (
        <p id="login-error" role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || code.length !== CODE_LENGTH}
        className="btn btn-primary mt-5 h-12 w-full text-[0.9375rem] disabled:opacity-60"
      >
        {busy ? t("checking") : t("signIn")}
      </button>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-[0.8125rem]">
        <button
          type="button"
          onClick={requestCode}
          disabled={busy || wait > 0}
          className="text-accent transition-opacity duration-300 hover:opacity-70 disabled:text-faint disabled:hover:opacity-100"
        >
          {wait > 0 ? t("resendIn", { seconds: wait }) : t("resend")}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("phone");
            setError(null);
            setDemoCode(null);
          }}
          className="text-muted transition-colors duration-300 hover:text-ink"
        >
          {t("changePhone")}
        </button>
      </div>
    </form>
  );
}
