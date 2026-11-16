import {
  CookingPot,
  LayoutGrid,
  Refrigerator,
  Smartphone,
  Sparkles,
  Tv,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { categories, type CategoryIcon } from "@/data/categories";
import type { Locale } from "@/i18n/routing";
import { Reveal } from "@/components/ui/Reveal";

const icons: Record<CategoryIcon, LucideIcon> = {
  large: Refrigerator,
  small: Zap,
  kitchen: CookingPot,
  climate: Wind,
  tv: Tv,
  beauty: Sparkles,
  gadgets: Smartphone,
};

export function CategoryChips() {
  const t = useTranslations("categories");
  const locale = useLocale() as Locale;

  return (
    <Reveal>
      <nav id="catalog" aria-label={t("label")} className="-mx-3 scroll-mt-28 sm:-mx-6 lg:mx-0">
        <ul className="no-scrollbar flex gap-2.5 overflow-x-auto px-3 py-1 sm:px-6 lg:px-0">
          <li className="shrink-0">
            <a href="#popular" className="btn btn-primary h-12 rounded-full px-5">
              <LayoutGrid className="size-4" strokeWidth={1.8} />
              {t("all")}
            </a>
          </li>
          {categories.map((category) => {
            const Icon = icons[category.icon];
            return (
              <li key={category.slug} className="shrink-0">
                <a href="#popular" className="btn btn-ghost h-12 rounded-full px-5 font-medium">
                  <Icon className="size-4 text-muted" strokeWidth={1.8} />
                  {category.name[locale]}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </Reveal>
  );
}
