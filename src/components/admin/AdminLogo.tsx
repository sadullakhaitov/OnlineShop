import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** The shop's wordmark with an "admin" mark under it; leads to the panel's first page. */
export function AdminLogo() {
  const t = useTranslations("admin.nav");

  return (
    <Link href="/admin" className="group flex min-w-0 flex-col items-start gap-1.5 leading-none">
      {/* eslint-disable-next-line @next/next/no-img-element -- the shop's logo, one version per theme */}
      <img src="/logo.png" alt="Multimedia" width={640} height={79} className="h-[1.125rem] w-auto max-w-full dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element -- the same logo for the dark theme */}
      <img src="/logo-dark.png" alt="Multimedia" width={640} height={79} className="hidden h-[1.125rem] w-auto max-w-full dark:block" />
      <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.08em] text-accent">
        {t("label")}
      </span>
    </Link>
  );
}
