/**
 * The shop running as a Telegram Mini App. Telegram opens the site with its
 * launch data in the address after "#"; the page then loads Telegram's script,
 * which gives `window.Telegram.WebApp`.
 * https://core.telegram.org/bots/webapps
 */

const TELEGRAM_SCRIPT = "https://telegram.org/js/telegram-web-app.js";
/** Set for the whole visit once the page was opened inside Telegram. */
const TELEGRAM_FLAG = "mm_tg";
/** Telegram's colour scheme, remembered for pages loaded later in the visit. */
export const TELEGRAM_DARK = "mm_tg_dark";
/** Room Telegram's floating buttons take at the top in full screen, kept for pages loaded later. */
const TELEGRAM_TOP = "mm_tg_top";

type Callback = () => void;

/** The part of Telegram's API the shop uses. */
export type WebApp = {
  initData: string;
  /** The same data, read without checking; fine for showing, never for trusting. */
  initDataUnsafe?: { user?: { first_name?: string; photo_url?: string } };
  version: string;
  /** "ios", "android", "tdesktop", "weba"… */
  platform?: string;
  /** Bot API 8.0: the app over the whole screen, Telegram's buttons floating on top. */
  requestFullscreen?(): void;
  isFullscreen?: boolean;
  safeAreaInset?: { top: number };
  contentSafeAreaInset?: { top: number };
  colorScheme: "light" | "dark";
  isVersionAtLeast(version: string): boolean;
  ready(): void;
  expand(): void;
  disableVerticalSwipes?(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor?(color: string): void;
  onEvent(event: string, callback: Callback): void;
  offEvent(event: string, callback: Callback): void;
  openLink(url: string): void;
  requestContact(callback: (shared: boolean, result?: { response?: string }) => void): void;
  BackButton: { show(): void; hide(): void; onClick(callback: Callback): void; offClick(callback: Callback): void };
  /** Bot API 8.0: the phone's location, asked through Telegram itself. */
  LocationManager?: {
    isInited: boolean;
    isLocationAvailable: boolean;
    isAccessRequested: boolean;
    isAccessGranted: boolean;
    init(callback?: Callback): void;
    getLocation(callback: (data: { latitude: number; longitude: number } | null) => void): void;
    openSettings(): void;
  };
  HapticFeedback?: { notificationOccurred(type: "error" | "success" | "warning"): void };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp };
  }
}

/**
 * Puts Telegram's marks back on the page: the Mini App flag, its colour
 * scheme and the room for its buttons. Switching the language replaces the
 * page's root element, which drops what the head script set on it.
 */
export function restoreTelegramMarks(): void {
  try {
    const store = sessionStorage;
    if (store.getItem(TELEGRAM_FLAG) !== "1") return;
    const root = document.documentElement;
    root.dataset.tg = "1";
    root.classList.toggle("dark", store.getItem(TELEGRAM_DARK) === "1");
    const top = store.getItem(TELEGRAM_TOP);
    if (top) root.style.setProperty("--mm-tg-top", `${top}px`);
  } catch {
    // Storage blocked: nothing was saved to restore.
  }
}

/** True inside the Telegram Mini App. Known before the first paint (see the layout's script). */
function inTelegram(): boolean {
  return typeof document !== "undefined" && document.documentElement.dataset.tg === "1";
}

/** Telegram's API once its script has loaded; null outside Telegram. */
export function getWebApp(): WebApp | null {
  if (!inTelegram()) return null;
  const app = window.Telegram?.WebApp;
  return app && app.initData ? app : null;
}

/** Waits for Telegram's script, a few seconds at most. */
export function whenWebApp(timeout = 8000): Promise<WebApp | null> {
  return new Promise((resolve) => {
    if (!inTelegram()) return resolve(null);
    const started = Date.now();
    const check = () => {
      const app = getWebApp();
      if (app || Date.now() - started > timeout) resolve(app);
      else setTimeout(check, 50);
    };
    check();
  });
}

/**
 * Opens a page of another site (Payme, Click). Inside Telegram it opens in
 * the browser, so the Mini App stays where it is; elsewhere the tab moves on.
 */
export function openExternal(url: string): void {
  const app = getWebApp();
  const external = /^https?:\/\//.test(url) && new URL(url).origin !== window.location.origin;
  if (app && external) app.openLink(url);
  else window.location.assign(url);
}

/**
 * Runs in <head> before the first paint, as a string for the inline script.
 * Inside Telegram it marks the page, loads Telegram's script and picks the
 * colour scheme Telegram uses, so nothing flashes in the wrong theme.
 * Telegram's loading screen is closed as soon as its script arrives, not
 * after the whole page has started, so the shop shows up sooner. On phones
 * the shop then fills the whole screen (Telegram 8.0 and newer). The room
 * Telegram's floating buttons take is remembered for the visit, because a
 * page loaded later (another language) is not told it again at once.
 */
export const telegramScript = `(function(){try{var s=sessionStorage,h=location.hash,p=new URLSearchParams(h.slice(1));
if(!p.get("tgWebAppData")&&!s.getItem("${TELEGRAM_FLAG}"))return;
s.setItem("${TELEGRAM_FLAG}","1");var d=document.documentElement;d.dataset.tg="1";
var t=p.get("tgWebAppThemeParams");if(t){var c=(JSON.parse(t).bg_color||"#ffffff").replace("#","");
var r=parseInt(c.substr(0,2),16),g=parseInt(c.substr(2,2),16),b=parseInt(c.substr(4,2),16);
s.setItem("${TELEGRAM_DARK}",Math.sqrt(.299*r*r+.587*g*g+.114*b*b)<120?"1":"0")}
d.classList.toggle("dark",s.getItem("${TELEGRAM_DARK}")==="1");
var top=s.getItem("${TELEGRAM_TOP}");if(top)d.style.setProperty("--mm-tg-top",top+"px");
var e=document.createElement("script");e.src="${TELEGRAM_SCRIPT}";
e.onload=function(){var w=window.Telegram&&Telegram.WebApp;if(!w)return;w.ready();w.expand();
var room=function(){var t=((w.safeAreaInset||{}).top||0)+((w.contentSafeAreaInset||{}).top||0);
if(t>0||!w.isFullscreen){d.style.setProperty("--mm-tg-top",t+"px");s.setItem("${TELEGRAM_TOP}",String(t))}};
room();w.onEvent("safeAreaChanged",room);w.onEvent("contentSafeAreaChanged",room);w.onEvent("fullscreenChanged",room);
if(/^(ios|android)$/.test(w.platform)&&w.isVersionAtLeast("8.0")&&w.requestFullscreen)try{w.requestFullscreen()}catch(x){}};document.head.appendChild(e)}catch(x){}})()`;
