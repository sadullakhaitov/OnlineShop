import { Heart, House, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { useTranslations } from "next-intl";

const tabs = [
  { key: "home", href: "#", icon: House },
  { key: "catalog", href: "#catalog", icon: LayoutGrid },
  { key: "cart", href: "#popular", icon: ShoppingCart },
  { key: "favorites", href: "#popular", icon: Heart },
  { key: "profile", href: "#support", icon: User },
] as const;

/** Bottom navigation for phones; the same bar will serve the Telegram Mini App. */
export function MobileTabBar() {
  const t = useTranslations("nav");

  return (
    <nav
      aria-label={t("menu")}
      className="fixed inset-x-3 bottom-3 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="glass glass-strong grid grid-cols-5 rounded-[1.5rem] p-1.5">
        {tabs.map(({ key, href, icon: Icon }, index) => (
          <li key={key}>
            <a
              href={href}
              className={`flex flex-col items-center gap-1 rounded-[1.125rem] py-2 text-[0.625rem] font-medium transition-colors duration-300 ${
                index === 0 ? "bg-hairline text-ink" : "text-muted active:text-ink"
              }`}
            >
              <Icon className="size-5" strokeWidth={1.7} />
              {t(key)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
