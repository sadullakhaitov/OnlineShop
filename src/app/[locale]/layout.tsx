import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import "@fontsource-variable/inter";
import "../globals.css";
import { routing } from "@/i18n/routing";
import { themeScript } from "@/lib/theme";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3eee8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
};

/**
 * The frame every page shares: fonts, theme, the ambient background and the
 * translations. The shop's header and footer live in `(shop)/layout.tsx`, the
 * admin panel's menu in `admin/(panel)/layout.tsx`.
 */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // The admin panel's texts are not sent with the pages customers open;
  // the admin layout adds them back for its own pages.
  const messages = { ...(await getMessages()) };
  delete messages.admin;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {/* Scroll reveals need JavaScript; without it everything is simply visible. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-dvh">
        <div className="ambient" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
