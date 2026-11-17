import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentCustomer } from "@/server/session";
import { LoginForm } from "@/components/account/LoginForm";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: `${t("title")} — Multimedia`, robots: { index: false } };
}

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Already signed in: there is nothing to do here.
  const customer = await getCurrentCustomer().catch(() => null);
  if (customer) redirect({ href: "/account", locale });

  return (
    <div className="mx-auto w-full max-w-md pt-8 sm:pt-14">
      <div className="glass glass-sheen enter rounded-[1.75rem] p-6 sm:p-8">
        <LoginForm />
      </div>
    </div>
  );
}
