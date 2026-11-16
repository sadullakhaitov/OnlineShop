/** Theme helpers shared by the toggle button and the inline script in the layout. */

export const THEME_KEY = "theme";

/**
 * Runs in <head> before the first paint so the saved theme never flashes.
 * It is a string because it has to execute before any bundle loads.
 */
export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

/** The visitor's saved choice, or the system setting when nothing is saved. */
export function prefersDark(): boolean {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved === "dark";
  } catch {
    // Storage can be blocked (private mode); fall back to the system setting.
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
}

export function saveTheme(dark: boolean) {
  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    // Not saved, but the theme still switches for this visit.
  }
}
