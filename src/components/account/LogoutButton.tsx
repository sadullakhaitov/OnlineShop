"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AUTH_EVENT } from "@/lib/auth-hint";

export function LogoutButton({ className = "" }: { className?: string }) {
  const t = useTranslations("account");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Offline: the next page load will show the real state.
    }
    window.dispatchEvent(new Event(AUTH_EVENT));
    router.replace("/");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} disabled={busy} className={`btn btn-ghost disabled:opacity-60 ${className}`}>
      <LogOut className="size-4" strokeWidth={1.8} />
      {t("logout")}
    </button>
  );
}
