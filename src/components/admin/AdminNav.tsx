"use client";

import { ClipboardList, LayoutDashboard, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

type Item = { key: "dashboard" | "orders" | "products"; href: string; icon: LucideIcon };

const items: Item[] = [
  { key: "dashboard", href: "/admin", icon: LayoutDashboard },
  { key: "orders", href: "/admin/orders", icon: ClipboardList },
];

type Props = {
  /** Orders waiting for the shop's answer */
  fresh: number;
  /** A column for the desktop sidebar, a bar for the bottom of a phone screen */
  variant: "side" | "bar";
};

export function AdminNav({ fresh, variant }: Props) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const isCurrent = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  const count = fresh > 99 ? "99+" : String(fresh);

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
                    {key === "orders" && fresh > 0 && (
                      <span className="badge absolute -right-2.5 -top-1.5" aria-label={t("newOrders", { count: fresh })}>
                        {count}
                      </span>
                    )}
                  </span>
                  {t(key)}
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
                {key === "orders" && fresh > 0 && (
                  <span
                    className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[0.6875rem] font-semibold text-btn-text"
                    aria-label={t("newOrders", { count: fresh })}
                  >
                    {count}
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
