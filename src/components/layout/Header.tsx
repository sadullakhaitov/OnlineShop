import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AccountLink } from "@/components/account/AccountLink";
import { CartLink } from "@/components/cart/CartLink";
import { FavoritesLink } from "@/components/favorites/FavoritesLink";
import { SearchDialog } from "@/components/search/SearchDialog";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { LocaleSwitcher } from "./LocaleSwitcher";

// `wide` links only fit next to the icons on large screens.
const links = [
  { key: "catalog", href: "/catalog", wide: false },
  { key: "deals", href: { pathname: "/catalog", query: { sale: "1" } }, wide: false },
  { key: "delivery", href: "/delivery", wide: true },
  { key: "support", href: "/contacts", wide: true },
] as const;

export function Header() {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6 lg:px-8">
      <div className="glass glass-strong mx-auto flex h-16 max-w-[1280px] items-center gap-4 rounded-[1.375rem] pl-5 pr-3 sm:pl-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex lg:ml-6" aria-label={t("menu")}>
          {links.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={`rounded-full px-3 py-2 text-sm text-muted transition-colors duration-300 hover:bg-hairline hover:text-ink ${
                link.wide ? "hidden lg:block" : ""
              }`}
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <SearchDialog />
          <FavoritesLink />
          <CartLink />
          {/* Inside Telegram the theme follows Telegram's. */}
          <span className="tg-hide contents">
            <ThemeToggle />
          </span>
          <span className="mx-1 hidden h-5 w-px bg-hairline sm:block" />
          <LocaleSwitcher />
          <AccountLink />
        </div>
      </div>
    </header>
  );
}
