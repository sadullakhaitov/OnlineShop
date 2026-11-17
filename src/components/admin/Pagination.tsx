import type { ComponentProps } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Props = {
  page: number;
  pages: number;
  /** The address of a page of the same list */
  href: (page: number) => ComponentProps<typeof Link>["href"];
};

/** "Previous · 2 / 5 · Next" under a long list; nothing when there is one page. */
export function Pagination({ page, pages, href }: Props) {
  const t = useTranslations("admin.orders");
  if (pages <= 1) return null;

  const arrow = (target: number, label: string, Icon: typeof ChevronLeft) =>
    target >= 1 && target <= pages ? (
      <Link href={href(target)} className="btn btn-ghost h-10 px-3.5" aria-label={label}>
        <Icon className="size-4" strokeWidth={1.8} />
      </Link>
    ) : (
      <span className="btn btn-ghost h-10 px-3.5 opacity-40" aria-hidden="true">
        <Icon className="size-4" strokeWidth={1.8} />
      </span>
    );

  return (
    <nav aria-label={t("pagination")} className="flex items-center justify-center gap-3">
      {arrow(page - 1, t("prev"), ChevronLeft)}
      <span className="min-w-16 text-center text-sm tabular-nums text-muted">{t("page", { page, pages })}</span>
      {arrow(page + 1, t("next"), ChevronRight)}
    </nav>
  );
}
