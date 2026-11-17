import { ChevronLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDb } from "@/db";
import { Link } from "@/i18n/navigation";
import { kindHints } from "@/server/admin/products";
import { requireAdmin } from "@/server/admin/session";
import { ProductForm } from "@/components/admin/ProductForm";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminNewProductPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const t = await getTranslations("admin.products.form");
  const hints = await kindHints(await getDb());

  return (
    <div className="flex flex-col gap-5">
      <header className="enter">
        <Link
          href="/admin/products"
          className="-ml-1 inline-flex items-center gap-1 text-sm text-muted transition-colors duration-300 hover:text-ink"
        >
          <ChevronLeft className="size-4" strokeWidth={1.8} />
          {t("back")}
        </Link>
        <h1 className="mt-3 text-[1.75rem] font-semibold sm:text-[2rem]">{t("newTitle")}</h1>
      </header>

      <ProductForm product={null} hints={hints} />
    </div>
  );
}
