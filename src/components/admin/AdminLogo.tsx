import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** The shop's wordmark with an "admin" mark next to it; leads to the panel's first page. */
export function AdminLogo() {
  const t = useTranslations("admin.nav");

  return (
    <Link href="/admin" className="group flex items-center gap-2 leading-none">
      {/* eslint-disable-next-line @next/next/no-img-element -- the shop's logo, one version per theme */}
      <img src="/logo.png" alt="Multimedia" width={640} height={79} className="h-5 w-auto dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element -- the same logo for the dark theme */}
      <img src="/logo-dark.png" alt="Multimedia" width={640} height={79} className="hidden h-5 w-auto dark:block" />
      <span className="rounded-full bg-accent-soft px-2 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-accent">
        {t("label")}
      </span>
    </Link>
  );
}
