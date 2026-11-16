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
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { enterDelay } from "@/lib/motion";

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
    <nav id="catalog" aria-label={t("label")} className="-mx-3 scroll-mt-28 sm:-mx-6 lg:mx-0">
      <ul className="no-scrollbar flex gap-2.5 overflow-x-auto px-3 py-1 sm:px-6 lg:px-0">
        <li className="shrink-0">
          <Link href="/catalog" style={enterDelay(220)} className="btn btn-primary enter h-12 rounded-full px-5">
            <LayoutGrid className="size-4" strokeWidth={1.8} />
            {t("all")}
          </Link>
        </li>
        {categories.map((category, i) => {
          const Icon = icons[category.icon];
          return (
            <li key={category.slug} className="shrink-0">
              <Link
                href={{ pathname: "/catalog", query: { category: category.slug } }}
                style={enterDelay(255 + i * 35)}
                className="btn btn-ghost enter h-12 rounded-full px-5 font-medium"
              >
                <Icon className="size-4 text-muted" strokeWidth={1.8} />
                {category.name[locale]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
