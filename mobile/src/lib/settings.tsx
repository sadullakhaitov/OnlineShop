import { getLocales } from "expo-localization";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Locale } from "./i18n";
import { loadJson, saveJson } from "./storage";

export type ThemeChoice = "system" | "light" | "dark";

type Settings = {
  locale: Locale;
  theme: ThemeChoice;
  ready: boolean;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemeChoice) => void;
};

/** Russian for phones set to Russian, Uzbek for everyone else. */
function deviceLocale(): Locale {
  try {
    return getLocales()[0]?.languageCode === "ru" ? "ru" : "uz";
  } catch {
    return "uz";
  }
}

const SettingsContext = createContext<Settings>({
  locale: "uz",
  theme: "system",
  ready: false,
  setLocale: () => {},
  setTheme: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ locale: Locale; theme: ThemeChoice; ready: boolean }>({
    locale: deviceLocale(),
    theme: "system",
    ready: false,
  });

  useEffect(() => {
    loadJson<{ locale?: Locale; theme?: ThemeChoice }>("settings", {}).then((saved) =>
      setState((current) => ({ locale: saved.locale ?? current.locale, theme: saved.theme ?? current.theme, ready: true })),
    );
  }, []);

  const value = useMemo<Settings>(
    () => ({
      ...state,
      setLocale: (locale) =>
        setState((current) => {
          saveJson("settings", { locale, theme: current.theme });
          return { ...current, locale };
        }),
      setTheme: (theme) =>
        setState((current) => {
          saveJson("settings", { locale: current.locale, theme });
          return { ...current, theme };
        }),
    }),
    [state],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => useContext(SettingsContext);
