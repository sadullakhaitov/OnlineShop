"use client";

import { useState } from "react";
import { Check, Star } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  orderId: string;
  productId: string;
  title: string;
  /** The customer's review so far, or null when there is none yet */
  status: "pending" | "approved" | "rejected" | null;
};

/** Under a delivered product: stars and a few words, sent for the admin to approve. */
export function ReviewButton({ orderId, productId, title, status: savedStatus }: Props) {
  const t = useTranslations("review");
  const [status, setStatus] = useState(savedStatus);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === "approved" || status === "pending") {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted">
        <Check className="size-3.5 text-success" strokeWidth={2.2} />
        {t(status === "approved" ? "published" : "sent")}
      </p>
    );
  }
  if (status === "rejected") return null;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-accent">
        <Star className="size-3.5" strokeWidth={2} />
        {t("write")}
      </button>
    );
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (rating === 0) return setError(t("needStars"));
    if (text.trim().length < 3) return setError(t("needText"));
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId, productId, rating, text }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (data?.ok || data?.error === "already") setStatus("pending");
      else setError(data?.error === "unauthorized" ? t("signIn") : data?.error === "limit" ? t("limit") : t("error"));
    } catch {
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  const shown = hover || rating;
  return (
    <form onSubmit={send} className="mt-3 flex flex-col gap-2.5" noValidate>
      <div role="radiogroup" aria-label={t("stars", { title })} className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={t("starLabel", { count: value })}
            onClick={() => {
              setRating(value);
              setError(null);
            }}
            onMouseEnter={() => setHover(value)}
            className="grid size-9 place-items-center rounded-xl transition-transform duration-200 active:scale-90"
          >
            <Star
              className={`size-6 transition-colors duration-200 ${value <= shown ? "fill-accent text-accent" : "text-faint"}`}
              strokeWidth={value <= shown ? 0 : 1.6}
            />
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={1000}
        rows={3}
        placeholder={t("placeholder")}
        aria-label={t("textLabel", { title })}
        className="field min-h-24 rounded-2xl px-4 py-3 text-[0.9375rem]"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn btn-primary h-10 flex-1 text-sm sm:flex-none">
          {t("send")}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost h-10 flex-1 text-sm sm:flex-none">
          {t("cancel")}
        </button>
      </div>
      <p className="text-xs text-faint">{t("moderated")}</p>
    </form>
  );
}
