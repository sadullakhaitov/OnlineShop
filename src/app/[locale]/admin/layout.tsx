import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin.meta" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

/**
 * The admin panel: `/uz/admin` and `/ru/admin`. Nothing in the shop links to
 * it. This layout only adds the panel's texts, which the root layout leaves
 * out of the pages customers open; the sign-in check is in `(panel)`.
 */
export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <NextIntlClientProvider messages={await getMessages()}>{children}</NextIntlClientProvider>;
}
