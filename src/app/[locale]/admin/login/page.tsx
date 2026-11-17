import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { DEV_ADMIN_PASSWORD, MIN_ADMIN_PASSWORD, getAdminPassword } from "@/server/config";
import { isAdmin } from "@/server/admin/session";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminLogo } from "@/components/admin/AdminLogo";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminLoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Already signed in: there is nothing to do here.
  if (await isAdmin().catch(() => false)) redirect({ href: "/admin", locale });

  const t = await getTranslations("admin.login");
  const password = getAdminPassword();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <div className="glass glass-sheen enter rounded-[1.75rem] p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <AdminLogo />
          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            <LocaleSwitcher />
          </div>
        </div>
        <h1 className="mt-7 text-2xl font-semibold sm:text-[1.75rem]">{t("title")}</h1>

        {password.state === "ready" ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t("text")}</p>
            {password.isDefault && (
              <p className="mt-4 rounded-xl bg-accent-soft px-3.5 py-2.5 text-[0.8125rem] leading-snug text-accent">
                {t("devHint", { password: DEV_ADMIN_PASSWORD })}
              </p>
            )}
            <AdminLoginForm />
          </>
        ) : (
          // A public site without a proper password keeps the panel shut.
          <p className="mt-3 text-sm leading-relaxed text-muted">{t(password.state, { min: MIN_ADMIN_PASSWORD })}</p>
        )}
      </div>

      <Link
        href="/"
        className="enter mx-auto mt-6 text-[0.8125rem] text-muted transition-colors duration-300 hover:text-ink"
        style={{ "--enter-delay": "80ms" } as React.CSSProperties}
      >
        {t("toShop")}
      </Link>
    </main>
  );
}
