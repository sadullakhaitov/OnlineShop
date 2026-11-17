"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useRouter as useNextRouter } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { AUTH_EVENT, AUTH_HINT_COOKIE } from "@/lib/auth-hint";
import { TELEGRAM_DARK, restoreTelegramMarks, whenWebApp, type WebApp } from "@/lib/telegram";
import { applyTheme } from "@/lib/theme";

/** The page backgrounds of the two themes (`--bg` in globals.css). */
const BACKGROUND = { light: "#f3eee8", dark: "#0b0b0d" };
/** Checked once per visit: is this Telegram user a known customer? */
const SIGN_IN_TRIED = "mm_tg_signin";

function paint(app: WebApp) {
  const dark = app.colorScheme === "dark";
  try {
    sessionStorage.setItem(TELEGRAM_DARK, dark ? "1" : "0");
  } catch {}
  applyTheme(dark);
  // Telegram's own header and bottom bar take the page's colour.
  const color = BACKGROUND[dark ? "dark" : "light"];
  if (app.isVersionAtLeast("6.1")) {
    app.setHeaderColor(color);
    app.setBackgroundColor(color);
  }
  if (app.isVersionAtLeast("7.10")) app.setBottomBarColor?.(color);
}

/** Signs in a Telegram user whose phone number the shop already knows. */
async function signInQuietly(app: WebApp): Promise<boolean> {
  try {
    if (sessionStorage.getItem(SIGN_IN_TRIED) || document.cookie.split("; ").includes(`${AUTH_HINT_COOKIE}=1`)) return false;
    sessionStorage.setItem(SIGN_IN_TRIED, "1");
    const response = await fetch("/api/auth/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData: app.initData }),
    });
    const data = (await response.json().catch(() => null)) as { signedIn?: boolean } | null;
    return Boolean(data?.signedIn);
  } catch {
    return false;
  }
}

/**
 * Makes the shop feel at home inside Telegram: full height, Telegram's colour
 * scheme, Telegram's back button instead of the browser's, and signing in
 * without a code. Renders nothing and does nothing on the normal website.
 */
export function TelegramBridge() {
  const pathname = usePathname();
  const router = useRouter();
  const nextRouter = useNextRouter();
  const app = useRef<WebApp | null>(null);
  /** Pages opened inside the app since it started, so "back" knows where it can go. */
  const depth = useRef(0);
  const popping = useRef(false);
  const pathnameRef = useRef(pathname);

  // Before the page shows: a language switch may have dropped Telegram's marks.
  useLayoutEffect(() => {
    restoreTelegramMarks();
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    const onTheme = () => app.current && paint(app.current);
    const onPop = () => {
      popping.current = true;
    };
    window.addEventListener("popstate", onPop);

    whenWebApp().then(async (webApp) => {
      if (!webApp || cancelled) return;
      app.current = webApp;
      webApp.ready();
      webApp.expand();
      // Scrolling a long catalogue must not pull the app closed.
      if (webApp.isVersionAtLeast("7.7")) webApp.disableVerticalSwipes?.();
      paint(webApp);
      webApp.onEvent("themeChanged", onTheme);
      updateBackButton();
      if (await signInQuietly(webApp)) {
        window.dispatchEvent(new Event(AUTH_EVENT));
        nextRouter.refresh();
      }
    });
    return () => {
      cancelled = true;
      window.removeEventListener("popstate", onPop);
      app.current?.offEvent("themeChanged", onTheme);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateBackButton() {
    const button = app.current?.BackButton;
    if (!button) return;
    if (pathnameRef.current !== "/" || depth.current > 0) button.show();
    else button.hide();
  }

  useEffect(() => {
    // Effects may run twice for one page (React's development mode): only a new address counts.
    if (pathname !== pathnameRef.current) {
      pathnameRef.current = pathname;
      if (popping.current) depth.current = Math.max(0, depth.current - 1);
      else depth.current += 1;
    }
    popping.current = false;
    updateBackButton();
  }, [pathname]);

  useEffect(() => {
    const onBack = () => {
      if (depth.current > 0) window.history.back();
      else router.replace("/");
    };
    let attached: WebApp | null = null;
    let cancelled = false;
    whenWebApp().then((webApp) => {
      if (cancelled || !webApp) return;
      attached = webApp;
      webApp.BackButton.onClick(onBack);
    });
    return () => {
      cancelled = true;
      attached?.BackButton.offClick(onBack);
    };
  }, [router]);

  return null;
}
