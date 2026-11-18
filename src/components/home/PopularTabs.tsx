"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  CookingPot,
  LayoutGrid,
  Refrigerator,
  Smartphone,
  Sparkles,
  Tv,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { CategoryIcon } from "@/data/categories";
import { Link } from "@/i18n/navigation";
import { enterDelay } from "@/lib/motion";
import { Reveal } from "@/components/ui/Reveal";

const icons: Record<CategoryIcon, LucideIcon> = {
  large: Refrigerator,
  small: Zap,
  kitchen: CookingPot,
  climate: Wind,
  tv: Tv,
  beauty: Sparkles,
  gadgets: Smartphone,
};

type Tab = { slug: string; name?: string; icon?: CategoryIcon; panel: ReactNode };

/** A drag that moves more than this many pixels scrolls the row instead of picking a chip. */
const DRAG_THRESHOLD = 6;

export function PopularTabs({ tabs }: { tabs: Tab[] }) {
  const t = useTranslations();
  const [active, setActive] = useState("all");
  const row = useRef<HTMLUListElement>(null);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  // Fingers scroll the row natively; a mouse drags it like a finger would.
  function onPointerDown(event: React.PointerEvent) {
    if (event.pointerType !== "mouse" || event.button !== 0 || !row.current) return;
    drag.current = { x: event.clientX, left: row.current.scrollLeft, moved: false };
  }

  function onPointerMove(event: React.PointerEvent) {
    const state = drag.current;
    if (!state || !row.current) return;
    const dx = event.clientX - state.x;
    if (!state.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
    if (!state.moved) {
      state.moved = true;
      row.current.setPointerCapture(event.pointerId);
      row.current.dataset.dragging = "";
    }
    row.current.scrollLeft = state.left - dx;
  }

  function endDrag(event: React.PointerEvent) {
    const state = drag.current;
    drag.current = null;
    if (!state?.moved || !row.current) return;
    suppressClick.current = true;
    delete row.current.dataset.dragging;
    if (row.current.hasPointerCapture(event.pointerId)) row.current.releasePointerCapture(event.pointerId);
  }

  function pick(slug: string, target: HTMLElement) {
    setActive(slug);
    target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }

  const current = tabs.find((tab) => tab.slug === active) ?? tabs[0]!;
  const catalogHref =
    current.slug === "all" ? "/catalog" : { pathname: "/catalog" as const, query: { category: current.slug } };

  return (
    <div className="flex flex-col gap-10 sm:gap-14">
      <nav id="catalog" aria-label={t("categories.label")} className="-mx-3 scroll-mt-28 sm:-mx-6 lg:mx-0">
        <ul
          ref={row}
          role="tablist"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={(event) => {
            if (suppressClick.current) {
              suppressClick.current = false;
              event.preventDefault();
              event.stopPropagation();
            }
          }}
          onDragStart={(event) => event.preventDefault()}
          className="drag-row no-scrollbar flex cursor-grab gap-2.5 overflow-x-auto px-3 py-1 select-none sm:px-6 lg:px-0"
        >
          {tabs.map((tab, i) => {
            const Icon = tab.icon ? icons[tab.icon] : LayoutGrid;
            const selected = tab.slug === active;
            return (
              <li key={tab.slug} className="shrink-0" role="presentation">
                <button
                  type="button"
                  role="tab"
                  id={`popular-tab-${tab.slug}`}
                  aria-selected={selected}
                  aria-controls={`popular-panel-${tab.slug}`}
                  onClick={(event) => pick(tab.slug, event.currentTarget)}
                  style={enterDelay(220 + i * 35)}
                  className={`btn enter h-12 rounded-full px-5 ${selected ? "btn-primary" : "btn-ghost font-medium"}`}
                >
                  <Icon className={`size-4 ${selected ? "" : "text-muted"}`} strokeWidth={1.8} />
                  {tab.name ?? t("categories.all")}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section id="popular" className="scroll-mt-28">
        <Reveal>
          <div className="mb-5 flex items-end justify-between gap-4 px-1">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold sm:text-[1.75rem]">
                {t("popular.title")}
                {current.name && <span className="text-muted"> · {current.name}</span>}
              </h2>
              <p className="mt-1 text-sm text-muted">{t("popular.hint")}</p>
            </div>
            <Link
              href={catalogHref}
              className="group inline-flex shrink-0 items-center gap-1.5 pb-1 text-sm font-medium text-muted transition-colors duration-300 hover:text-ink"
            >
              {t("popular.all")}
              <ArrowRight className="size-4 transition-transform duration-300 ease-smooth group-hover:translate-x-1" strokeWidth={1.8} />
            </Link>
          </div>
        </Reveal>
        {tabs.map((tab) => (
          <div
            key={tab.slug}
            role="tabpanel"
            id={`popular-panel-${tab.slug}`}
            aria-labelledby={`popular-tab-${tab.slug}`}
            hidden={tab.slug !== active}
            className={tab.slug === active ? "fade-in" : undefined}
          >
            {tab.panel}
          </div>
        ))}
      </section>
    </div>
  );
}
