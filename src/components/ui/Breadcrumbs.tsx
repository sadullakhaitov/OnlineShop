import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type Crumb = {
  label: string;
  href?: React.ComponentProps<typeof Link>["href"];
};

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useTranslations("nav");

  return (
    <nav aria-label={t("breadcrumbs")} className="no-scrollbar enter overflow-x-auto">
      <ol className="flex items-center gap-1.5 whitespace-nowrap px-1 text-[0.8125rem] text-muted">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {index > 0 && <ChevronRight className="size-3.5 text-faint" strokeWidth={2} />}
            {item.href ? (
              <Link href={item.href} className="transition-colors duration-300 hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
