import type { Metadata } from "next";
import { ChevronLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireAdmin } from "@/server/admin/session";
import { ProductImport } from "@/components/admin/ProductImport";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.import" });
  return { title: `${t("title")} — Multimedia admin` };
}

export default async function AdminImportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();
  const t = await getTranslations("admin");

  return (
    <div className="flex flex-col gap-5">
      <header className="enter">
        <Link
          href="/admin/products"
          className="-ml-1 inline-flex items-center gap-1 text-sm text-muted transition-colors duration-300 hover:text-ink"
        >
          <ChevronLeft className="size-4" strokeWidth={1.8} />
          {t("products.form.back")}
        </Link>
        <h1 className="mt-3 text-[1.75rem] font-semibold sm:text-[2rem]">{t("import.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("import.subtitle")}</p>
      </header>
      <ProductImport />
    </div>
  );
}
