"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";

/** Buttons of the test payment page: confirm or decline the pretend payment. */
export function DemoPayment({ orderId }: { orderId: string }) {
  const t = useTranslations("payDemo");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function send(action: "pay" | "decline") {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch("/api/payments/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      });
      if (response.ok) {
        router.replace(`/order/${orderId}`);
        router.refresh();
        return;
      }
    } catch {
      // Shown as a failed attempt below.
    }
    setFailed(true);
    setBusy(false);
  }

  return (
    <>
      {failed && (
        <p role="alert" className="mt-5 rounded-xl bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-3.5 py-2.5 text-[0.8125rem] leading-snug text-danger">
          {t("error")}
        </p>
      )}
      <button
        type="button"
        onClick={() => send("pay")}
        disabled={busy}
        className="btn btn-primary mt-6 h-12 w-full text-[0.9375rem] disabled:opacity-60"
      >
        {busy ? t("working") : t("confirm")}
      </button>
      <button
        type="button"
        onClick={() => send("decline")}
        disabled={busy}
        className="btn btn-ghost mt-3 h-12 w-full text-[0.9375rem] disabled:opacity-60"
      >
        {t("decline")}
      </button>
      <Link
        href={`/order/${orderId}`}
        className="mt-4 block text-center text-[0.8125rem] text-muted transition-colors duration-300 hover:text-ink"
      >
        {t("back")}
      </Link>
    </>
  );
}
