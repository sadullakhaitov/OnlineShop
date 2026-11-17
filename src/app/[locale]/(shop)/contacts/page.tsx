import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { InfoPageView } from "@/components/info/InfoPageView";
import { infoPages } from "@/data/pages";
import type { Locale } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const page = infoPages.contacts;
  return { title: `${page.title[locale as Locale]} — Multimedia`, description: page.lead[locale as Locale] };
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <InfoPageView slug="contacts" locale={locale as Locale} />;
}
