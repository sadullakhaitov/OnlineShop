import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** The shop's logo: red and black by day, red and white in the dark theme. */
export function Logo() {
  const t = useTranslations("brand");
  return (
    <Link href="/" className="group flex flex-col leading-none" aria-label={t("name")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a small fixed picture, two versions for the themes */}
      <img src="/logo.png" alt="" width={640} height={79} className="h-[1.375rem] w-auto transition-opacity duration-300 group-hover:opacity-80 dark:hidden sm:h-6" />
      {/* eslint-disable-next-line @next/next/no-img-element -- the same logo for the dark theme */}
      <img src="/logo-dark.png" alt="" width={640} height={79} className="hidden h-[1.375rem] w-auto transition-opacity duration-300 group-hover:opacity-80 dark:block sm:h-6" />
      <span className="mt-1.5 text-[0.625rem] font-medium tracking-[0.02em] text-muted">{t("tagline")}</span>
    </Link>
  );
}
