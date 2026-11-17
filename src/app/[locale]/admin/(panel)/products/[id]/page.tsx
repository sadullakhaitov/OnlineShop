import { ChevronLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDateTime } from "@/lib/format";
import { getAdminProduct, kindHints, productState } from "@/server/admin/products";
import { requireAdmin } from "@/server/admin/session";
import { ProductForm } from "@/components/admin/ProductForm";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminProductPage({ params, searchParams }: Props) {
  const { locale: rawLocale, id } = await params;
  const locale = rawLocale as Locale;
  setRequestLocale(locale);
  await requireAdmin();

  const db = await getDb();
  const product = await getAdminProduct(db, id);
  if (!product) notFound();

  const t = await getTranslations("admin.products");
  const hints = await kindHints(db);
  const state = productState(product);
  const added = (await searchParams).added === "1";

  const details: [string, string][] = [
    [t("form.codeLabel"), product.id.toUpperCase()],
    ...(product.reviews > 0
      ? [[t("form.rating"), t("form.ratingValue", { rating: product.rating.toFixed(1), count: product.reviews })] as [string, string]]
      : []),
    [t("form.created"), formatDateTime(product.createdAt, locale)],
    ...(product.updatedAt.getTime() !== product.createdAt.getTime()
      ? [[t("form.updated"), formatDateTime(product.updatedAt, locale)] as [string, string]]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="enter">
        <Link
          href="/admin/products"
          className="-ml-1 inline-flex items-center gap-1 text-sm text-muted transition-colors duration-300 hover:text-ink"
        >
          <ChevronLeft className="size-4" strokeWidth={1.8} />
          {t("form.back")}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-[1.75rem] font-semibold sm:text-[2rem]">
            {product.brand} {product.model}
          </h1>
          <span className="flex h-7 items-center rounded-full border border-hairline px-3 text-[0.8125rem] font-medium text-muted">
            {t(`state.${state}`)}
          </span>
        </div>
      </header>

      <ProductForm product={product} hints={hints} added={added}>
        <section className="glass rounded-[1.5rem] p-5 sm:p-6">
          <h2 className="text-[0.9375rem] font-semibold">{t("form.info")}</h2>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            {details.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </ProductForm>
    </div>
  );
}
