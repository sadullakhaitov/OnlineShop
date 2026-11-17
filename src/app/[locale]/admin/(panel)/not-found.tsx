import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function AdminNotFound() {
  const t = useTranslations("admin.notFound");

  return (
    <div className="glass glass-sheen enter mx-auto mt-6 flex max-w-xl flex-col items-center rounded-[1.75rem] px-6 py-14 text-center">
      <p className="text-6xl font-semibold tracking-tighter text-accent">404</p>
      <h1 className="mt-4 text-xl font-semibold">{t("title")}</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{t("text")}</p>
      <Link href="/admin" className="btn btn-primary mt-7">
        {t("back")}
      </Link>
    </div>
  );
}
