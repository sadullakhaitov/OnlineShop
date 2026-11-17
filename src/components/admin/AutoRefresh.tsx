"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";

/**
 * Keeps a page that is left open up to date: new orders appear by themselves.
 * Nothing is asked from the server while the tab is in the background.
 */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const timer = setInterval(refresh, seconds * 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, seconds]);

  return null;
}
