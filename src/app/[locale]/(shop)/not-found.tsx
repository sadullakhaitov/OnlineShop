import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="glass glass-sheen enter mx-auto mt-8 flex max-w-xl flex-col items-center rounded-[1.75rem] px-6 py-16 text-center sm:mt-14">
      <p className="text-7xl font-semibold tracking-tighter text-accent">404</p>
      <h1 className="mt-4 text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{t("text")}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/catalog" className="btn btn-primary">
          {t("catalog")}
        </Link>
        <Link href="/" className="btn btn-ghost">
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
