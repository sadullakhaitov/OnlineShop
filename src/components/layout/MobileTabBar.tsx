"use client";

import { Heart, House, LayoutGrid, ShoppingCart, User, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useCartCount } from "@/lib/cart";
import { useFavorites } from "@/lib/favorites";
import { useSignedIn } from "@/components/account/AccountLink";

type TabKey = "home" | "catalog" | "cart" | "favorites" | "profile";

const tabs: { key: TabKey; icon: LucideIcon; href: string; active: (pathname: string) => boolean }[] = [
  { key: "home", icon: House, href: "/", active: (path) => path === "/" },
  {
    key: "catalog",
    icon: LayoutGrid,
    href: "/catalog",
    active: (path) => path.startsWith("/catalog") || path.startsWith("/product"),
  },
  {
    key: "cart",
    icon: ShoppingCart,
    href: "/cart",
    active: (path) => path.startsWith("/cart") || path.startsWith("/checkout"),
  },
  { key: "favorites", icon: Heart, href: "/favorites", active: (path) => path.startsWith("/favorites") },
  {
    key: "profile",
    icon: User,
    href: "/account",
    active: (path) => path.startsWith("/account") || path.startsWith("/login") || path.startsWith("/order"),
  },
];

const tabClass =
  "relative flex w-full flex-col items-center gap-1 rounded-[1.125rem] py-2 text-[0.625rem] font-medium transition-colors duration-300";

/** Bottom navigation for phones; the same bar will serve the Telegram Mini App. */
export function MobileTabBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const counts: Partial<Record<TabKey, number>> = {
    cart: useCartCount(),
    favorites: useFavorites().length,
  };
  const signedIn = useSignedIn();

  return (
    <nav
      aria-label={t("menu")}
      className="fixed inset-x-3 bottom-3 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="glass glass-strong grid grid-cols-5 rounded-[1.5rem] p-1.5">
        {tabs.map(({ key, href, icon: Icon, active }) => {
          const current = active(pathname);
          const count = counts[key] ?? 0;
          return (
            <li key={key}>
              <Link
                // Guests go straight to the sign-in page.
                href={key === "profile" && !signedIn ? "/login" : href}
                aria-current={current ? "page" : undefined}
                className={`${tabClass} ${current ? "bg-hairline text-ink" : "text-muted active:text-ink"}`}
              >
                <Icon className="size-5" strokeWidth={1.7} />
                {count > 0 && (
                  <span key={count} className="badge absolute left-1/2 top-1 ml-1.5">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
