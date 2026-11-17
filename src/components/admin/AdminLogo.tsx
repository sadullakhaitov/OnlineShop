import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** The shop's wordmark with an "admin" mark next to it; leads to the panel's first page. */
export function AdminLogo() {
  const t = useTranslations("admin.nav");

  return (
    <Link href="/admin" className="group flex items-center gap-2 leading-none">
      <span className="text-[1.3rem] font-semibold tracking-[-0.045em] text-ink">
        multi
        <span className="text-accent transition-opacity duration-300 group-hover:opacity-70">media</span>
      </span>
      <span className="rounded-full bg-accent-soft px-2 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-accent">
        {t("label")}
      </span>
    </Link>
  );
}
