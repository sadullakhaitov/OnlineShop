"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AUTH_EVENT, AUTH_HINT_COOKIE } from "@/lib/auth-hint";

function subscribe(callback: () => void) {
  window.addEventListener(AUTH_EVENT, callback);
  return () => window.removeEventListener(AUTH_EVENT, callback);
}

const isSignedIn = () => document.cookie.split("; ").includes(`${AUTH_HINT_COOKIE}=1`);

/** True when this browser holds a sign-in. Known only in the browser. */
export function useSignedIn(): boolean {
  return useSyncExternalStore(subscribe, isSignedIn, () => false);
}

/** "Kirish" for guests, "Kabinet" for signed-in customers. */
export function AccountLink() {
  const t = useTranslations("nav");
  const signedIn = useSignedIn();

  return (
    <Link href={signedIn ? "/account" : "/login"} className="btn btn-ghost ml-2 hidden h-10 px-4 md:inline-flex">
      {signedIn ? t("profile") : t("login")}
    </Link>
  );
}
