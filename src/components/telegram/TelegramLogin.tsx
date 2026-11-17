"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AUTH_EVENT } from "@/lib/auth-hint";
import { whenWebApp } from "@/lib/telegram";

type Answer = { ok?: boolean; signedIn?: boolean; error?: string } | null;

async function ask(initData: string, contact?: string): Promise<Answer> {
  try {
    const response = await fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, contact }),
    });
    return (await response.json().catch(() => null)) as Answer;
  } catch {
    return null;
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Signing in inside Telegram: the user shares the phone number of their
 * Telegram account, which Telegram vouches for. Only visible in the Mini App.
 */
export function TelegramLogin() {
  const t = useTranslations("auth.telegram");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function done() {
    window.dispatchEvent(new Event(AUTH_EVENT));
    router.replace("/account");
    router.refresh();
  }

  async function share() {
    const app = await whenWebApp(2000);
    if (!app || busy) return;
    setError(null);

    let shared: { ok: boolean; response?: string };
    try {
      shared = await new Promise((resolve) => app.requestContact((ok, result) => resolve({ ok, response: result?.response })));
    } catch {
      // Telegram older than 6.9 cannot share a contact from a Mini App.
      setError(t("failed"));
      return;
    }
    if (!shared.ok) {
      setError(t("cancelled"));
      return;
    }

    setBusy(true);
    let answer = await ask(app.initData, shared.response);
    // Without a signed answer the number reaches the shop through the bot a moment later.
    for (let attempt = 0; answer?.ok && !answer.signedIn && attempt < 12; attempt += 1) {
      await wait(1500);
      answer = await ask(app.initData);
    }
    if (answer?.signedIn) {
      app.HapticFeedback?.notificationOccurred("success");
      return done();
    }
    setBusy(false);
    setError(t(answer?.error === "phone" ? "phone" : "failed"));
  }

  return (
    <div className="tg-only">
      <h1 className="text-2xl font-semibold sm:text-[1.75rem]">{t("title")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{t("text")}</p>
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="btn btn-primary mt-6 h-12 w-full gap-2 text-[0.9375rem] disabled:opacity-60"
      >
        <Send className="size-[1.125rem]" strokeWidth={1.8} />
        {busy ? t("waiting") : t("button")}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
      <div className="my-6 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-hairline" />
        {t("orSms")}
        <span className="h-px flex-1 bg-hairline" />
      </div>
    </div>
  );
}
