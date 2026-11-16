"use client";

import { Heart, House, LayoutGrid, ShoppingCart, User, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useFavorites } from "@/lib/favorites";

type TabKey = "home" | "catalog" | "cart" | "favorites" | "profile";

// Tabs without `href` (cart, account) become links in the checkout step.
const tabs: { key: TabKey; icon: LucideIcon; href?: string }[] = [
  { key: "home", icon: House, href: "/" },
  { key: "catalog", icon: LayoutGrid, href: "/catalog" },
  { key: "cart", icon: ShoppingCart },
  { key: "favorites", icon: Heart, href: "/favorites" },
  { key: "profile", icon: User },
];

const tabClass =
  "relative flex w-full flex-col items-center gap-1 rounded-[1.125rem] py-2 text-[0.625rem] font-medium transition-colors duration-300";

/** Bottom navigation for phones; the same bar will serve the Telegram Mini App. */
export function MobileTabBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const favorites = useFavorites().length;

  function isActive(key: TabKey) {
    if (key === "home") return pathname === "/";
    if (key === "catalog") return pathname.startsWith("/catalog") || pathname.startsWith("/product");
    if (key === "favorites") return pathname.startsWith("/favorites");
    return false;
  }

  return (
    <nav
      aria-label={t("menu")}
      className="fixed inset-x-3 bottom-3 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="glass glass-strong grid grid-cols-5 rounded-[1.5rem] p-1.5">
        {tabs.map(({ key, href, icon: Icon }) => {
          const active = isActive(key);
          const content = (
            <>
              <Icon className="size-5" strokeWidth={1.7} />
              {key === "favorites" && favorites > 0 && (
                <span className="absolute left-1/2 top-1 ml-1.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.5625rem] font-semibold leading-4 text-white">
                  {favorites}
                </span>
              )}
              {t(key)}
            </>
          );
          return (
            <li key={key}>
              {href ? (
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`${tabClass} ${active ? "bg-hairline text-ink" : "text-muted active:text-ink"}`}
                >
                  {content}
                </Link>
              ) : (
                <button type="button" className={`${tabClass} text-muted`}>
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
