"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const labels: Record<string, string> = { uz: "O'z", ru: "Ру" };

export function LocaleSwitcher() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="flex h-9 items-center rounded-full border border-hairline p-0.5 text-xs font-medium"
    >
      {routing.locales.map((item) => {
        const active = item === locale;
        return (
          <button
            key={item}
            type="button"
            lang={item}
            aria-pressed={active}
            onClick={() => router.replace(pathname, { locale: item, scroll: false })}
            className={`h-full rounded-full px-2.5 transition-colors duration-300 ease-smooth ${
              active ? "bg-btn text-btn-text" : "text-muted hover:text-ink"
            }`}
          >
            {labels[item]}
          </button>
        );
      })}
    </div>
  );
}
