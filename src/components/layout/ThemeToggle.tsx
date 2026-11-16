"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

export function ThemeToggle() {
  const t = useTranslations("nav");

  function toggle() {
    const root = document.documentElement;
    const dark = !root.classList.contains("dark");
    root.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      // Storage can be blocked (private mode); the theme still switches.
    }
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
