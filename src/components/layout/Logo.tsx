import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function Logo() {
  const t = useTranslations("brand");
  return (
    <Link href="/" className="group flex flex-col leading-none" aria-label={t("name")}>
      <span className="text-[1.3rem] font-semibold tracking-[-0.045em] text-ink">
        multi
        <span className="text-accent transition-opacity duration-300 group-hover:opacity-70">
          media
        </span>
      </span>
      <span className="mt-1 text-[0.625rem] font-medium tracking-[0.02em] text-muted">
        {t("tagline")}
      </span>
    </Link>
  );
}
