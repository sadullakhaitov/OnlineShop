"use client";

import { useEffect, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { whenWebApp } from "@/lib/telegram";
import { LogoutButton } from "./LogoutButton";

type Props = {
  name: string | null;
  phone: string;
};

/**
 * The customer's own card: picture, name and phone. Inside Telegram the
 * picture is their Telegram photo; elsewhere the first letter of their name.
 * The name can be changed here; the phone is how they sign in, so it stays.
 */
export function ProfileCard({ name: savedName, phone }: Props) {
  const t = useTranslations("account");
  const router = useRouter();
  const [name, setName] = useState(savedName);
  const [photo, setPhoto] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(savedName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let live = true;
    whenWebApp(4000).then((app) => {
      const user = app?.initDataUnsafe?.user;
      if (!live || !user) return;
      if (user.photo_url?.startsWith("https://")) setPhoto(user.photo_url);
      // A first visit from Telegram: offer the Telegram name to save.
      if (!savedName && user.first_name) setDraft(user.first_name);
    });
    return () => {
      live = false;
    };
  }, [savedName]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const value = draft.replace(/\s+/g, " ").trim();
    if (value.length < 2 || value.length > 60) return setError(t("nameError"));
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; name?: string; error?: string } | null;
      if (!data?.ok || !data.name) {
        setError(data?.error === "invalid" ? t("nameError") : t("saveError"));
        return;
      }
      setName(data.name);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch {
      setError(t("saveError"));
    } finally {
      setBusy(false);
    }
  }

  const initial = (name ?? "").trim().charAt(0).toUpperCase() || "M";

  return (
    <section className="glass glass-sheen enter rounded-[1.75rem] p-5 sm:p-8">
      <div className="flex items-center gap-4">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- Telegram's picture, from Telegram's servers.
          <img src={photo} alt={t("avatar")} className="size-16 shrink-0 rounded-full object-cover sm:size-20" />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-16 shrink-0 place-items-center rounded-full bg-accent-soft text-2xl font-semibold text-accent sm:size-20 sm:text-3xl"
          >
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-xl font-semibold leading-tight sm:text-4xl">
            {name ? t("greeting", { name }) : t("greetingNoName")}
          </h1>
          <p className="mt-1 text-sm tabular-nums text-muted">{phone}</p>
        </div>
      </div>

      {editing ? (
        <form onSubmit={save} className="mt-5 flex flex-col gap-3" noValidate>
          <label htmlFor="profile-name" className="text-sm font-medium">
            {t("nameLabel")}
          </label>
          <input
            id="profile-name"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={60}
            autoComplete="name"
            autoFocus
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "profile-name-error" : undefined}
            className="field h-12 rounded-2xl px-4 text-base"
          />
          {error && (
            <p id="profile-name-error" className="text-sm text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn btn-primary flex-1 disabled:opacity-60 sm:flex-none">
              {t("save")}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
                setDraft(name ?? "");
              }}
              className="btn btn-ghost flex-1 sm:flex-none"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setEditing(true)} className="btn btn-ghost">
            {saved ? <Check className="size-4 text-success" strokeWidth={2} /> : <Pencil className="size-4" strokeWidth={1.8} />}
            {saved ? t("saved") : t("edit")}
          </button>
          <LogoutButton />
        </div>
      )}

      <p className="mt-4 text-xs text-faint">{t("phoneNote")}</p>
    </section>
  );
}
