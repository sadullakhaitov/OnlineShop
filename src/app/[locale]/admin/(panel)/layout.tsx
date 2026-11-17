import { LogOut, Store } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getDb } from "@/db";
import { Link } from "@/i18n/navigation";
import { logoutAction } from "@/server/admin/actions";
import { countNewOrders } from "@/server/admin/orders";
import { requireAdmin } from "@/server/admin/session";
import { AdminLogo } from "@/components/admin/AdminLogo";
import { AdminNav } from "@/components/admin/AdminNav";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const sideLink =
  "flex h-11 w-full items-center gap-3 rounded-[0.875rem] px-3 text-sm font-medium text-muted transition-colors duration-300 hover:bg-hairline hover:text-ink";

/** The panel's frame: a sidebar on wide screens, a top bar and a tab bar on phones. */
export default async function PanelLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin();

  const t = await getTranslations("admin.nav");
  const fresh = await countNewOrders(await getDb());

  return (
    <div className="mx-auto flex w-full max-w-[1480px] gap-6 px-3 sm:px-6">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 py-4 lg:block">
        <div className="glass glass-strong flex h-full flex-col rounded-[1.75rem] p-3">
          <div className="px-3 pb-6 pt-3">
            <AdminLogo />
          </div>
          <AdminNav fresh={fresh} variant="side" />

          <div className="mt-auto flex flex-col gap-1 border-t border-hairline pt-3">
            <Link href="/" target="_blank" className={sideLink}>
              <Store className="size-[1.125rem] shrink-0" strokeWidth={1.7} />
              {t("shop")}
            </Link>
            <form action={logoutAction}>
              <button type="submit" className={sideLink}>
                <LogOut className="size-[1.125rem] shrink-0" strokeWidth={1.7} />
                {t("logout")}
              </button>
            </form>
            <div className="mt-2 flex items-center justify-between pl-1">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-28 lg:pb-12">
        <header className="sticky top-0 z-40 pt-3 lg:hidden">
          <div className="glass glass-strong flex h-14 items-center gap-2 rounded-[1.25rem] pl-4 pr-1.5">
            <AdminLogo />
            <div className="ml-auto flex items-center gap-0.5">
              <ThemeToggle />
              <LocaleSwitcher />
              <form action={logoutAction}>
                <button type="submit" className="icon-btn" aria-label={t("logout")} title={t("logout")}>
                  <LogOut className="size-5" strokeWidth={1.7} />
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="pt-5 lg:pt-8">{children}</main>
      </div>

      <AdminNav fresh={fresh} variant="bar" />
    </div>
  );
}
