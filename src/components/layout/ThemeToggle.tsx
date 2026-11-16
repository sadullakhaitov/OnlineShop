"use client";

import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { applyTheme, prefersDark, saveTheme } from "@/lib/theme";

export function ThemeToggle() {
  const t = useTranslations("nav");

  useEffect(() => {
    // The inline script in <head> sets the theme before the first paint. Pages
    // that React renders entirely in the browser (the 404 page) never run that
    // script, so the same rule is applied here too.
    applyTheme(prefersDark());

    // Follow the system setting live for visitors who have not picked a theme.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(prefersDark());
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    const dark = !document.documentElement.classList.contains("dark");
    applyTheme(dark);
    saveTheme(dark);
  }

  return (
    <button type="button" onClick={toggle} className="icon-btn" aria-label={t("theme")} title={t("theme")}>
      <span className="relative grid size-5 place-items-center">
        <Sun
          className="absolute size-5 rotate-0 scale-100 transition-all duration-500 ease-smooth dark:-rotate-90 dark:scale-0"
          strokeWidth={1.7}
        />
        <Moon
          className="absolute size-5 rotate-90 scale-0 transition-all duration-500 ease-smooth dark:rotate-0 dark:scale-100"
          strokeWidth={1.7}
        />
      </span>
    </button>
  );
}
