"use client";

import { ClipboardList, LayoutDashboard, MessageSquareText, Package, Send, type LucideIcon, TicketPercent } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

type Item = { key: "dashboard" | "orders" | "products" | "promo" | "reviews" | "telegram"; href: string; icon: LucideIcon };

const items: Item[] = [
  { key: "dashboard", href: "/admin", icon: LayoutDashboard },
  { key: "orders", href: "/admin/orders", icon: ClipboardList },
  { key: "products", href: "/admin/products", icon: Package },
  { key: "promo", href: "/admin/promo", icon: TicketPercent },
  { key: "reviews", href: "/admin/reviews", icon: MessageSquareText },
  { key: "telegram", href: "/admin/telegram", icon: Send },
];

type Props = {
  /** Orders waiting for the shop's answer */
  fresh: number;
  /** Reviews waiting for approval */
  waiting: number;
  /** A column for the desktop sidebar, a bar for the bottom of a phone screen */
  variant: "side" | "bar";
};

export function AdminNav({ fresh, waiting, variant }: Props) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const isCurrent = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  const shown = (n: number) => (n > 99 ? "99+" : String(n));
  // The orders waiting for an answer, or the reviews waiting for approval.
  const badge = (key: Item["key"]) =>
    key === "orders" && fresh > 0
      ? { text: shown(fresh), label: t("newOrders", { count: fresh }) }
      : key === "reviews" && waiting > 0
        ? { text: shown(waiting), label: t("waitingReviews", { count: waiting }) }
        : null;

  if (variant === "bar") {
    return (
      <nav
        aria-label={t("menu")}
        className="fixed inset-x-3 bottom-3 z-40 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="glass glass-strong mx-auto grid max-w-md auto-cols-fr grid-flow-col rounded-[1.5rem] p-1.5">
          {items.map(({ key, href, icon: Icon }) => {
            const current = isCurrent(href);
            const mark = badge(key);
            return (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={`relative flex w-full flex-col items-center gap-1 rounded-[1.125rem] py-2 text-[0.625rem] font-medium transition-colors duration-300 ${
                    current ? "bg-btn text-btn-text" : "text-muted"
                  }`}
                >
                  <span className="relative">
                    <Icon className="size-5" strokeWidth={1.7} />
                    {mark && (
                      <span className="badge absolute -right-2.5 -top-1.5" aria-label={mark.label}>
                        {mark.text}
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate px-0.5">{t(`short.${key}`)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label={t("menu")}>
      <ul className="flex flex-col gap-1">
        {items.map(({ key, href, icon: Icon }) => {
          const current = isCurrent(href);
          const mark = badge(key);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`flex h-11 items-center gap-3 rounded-[0.875rem] px-3 text-sm font-medium transition-colors duration-300 ${
                  current ? "bg-btn text-btn-text" : "text-muted hover:bg-hairline hover:text-ink"
                }`}
              >
                <Icon className="size-[1.125rem] shrink-0" strokeWidth={1.7} />
                {t(key)}
                {mark && (
                  <span
                    className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[0.6875rem] font-semibold text-btn-text"
                    aria-label={mark.label}
                  >
                    {mark.text}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
