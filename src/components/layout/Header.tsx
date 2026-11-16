import { Heart, Search, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { LocaleSwitcher } from "./LocaleSwitcher";

const links = [
  { key: "catalog", href: "#catalog" },
  { key: "brands", href: "#popular" },
  { key: "deals", href: "#deals" },
  { key: "delivery", href: "#delivery" },
  { key: "support", href: "#support" },
] as const;

export function Header() {
  const t = useTranslations("nav");

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6 lg:px-8">
      <div className="glass glass-strong mx-auto flex h-16 max-w-[1280px] items-center gap-4 rounded-[1.375rem] pl-5 pr-3 sm:pl-6">
        <Logo />

        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label={t("menu")}>
          {links.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className="rounded-full px-3 py-2 text-sm text-muted transition-colors duration-300 hover:bg-hairline hover:text-ink"
            >
              {t(link.key)}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <button type="button" className="icon-btn" aria-label={t("search")}>
            <Search className="size-5" strokeWidth={1.7} />
          </button>
          <button type="button" className="icon-btn hidden md:inline-grid" aria-label={t("favorites")}>
            <Heart className="size-5" strokeWidth={1.7} />
          </button>
          <button type="button" className="icon-btn hidden md:inline-grid" aria-label={t("cart")}>
            <ShoppingCart className="size-5" strokeWidth={1.7} />
          </button>
          <ThemeToggle />
          <span className="mx-1 hidden h-5 w-px bg-hairline sm:block" />
          <LocaleSwitcher />
          <button type="button" className="btn btn-ghost ml-2 hidden h-10 px-4 md:inline-flex">
            {t("login")}
          </button>
        </div>
      </div>
    </header>
  );
}
