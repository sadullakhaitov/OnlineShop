"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { sortOptions } from "@/lib/catalog";
import { Select } from "@/components/ui/Select";
import { enterDelay } from "@/lib/motion";

type Option = { value: string; label: string; count: number };

type Props = {
  title: string;
  total: number;
  categories: Option[];
  brands: Option[];
  /** The filters in the address; empty in the copy of the page made in advance. */
  searchParams: URLSearchParams;
  children: React.ReactNode;
};

/**
 * Filters change the address in place. The results are worked out in the
 * browser from the address (see CatalogView), so nothing waits for a server.
 */
function setQuery(query: string) {
  const path = window.location.pathname;
  window.history.replaceState(null, "", query ? `${path}?${query}` : path);
}

/** Brands shown before "show all" is pressed. */
const BRAND_LIMIT = 6;

export function CatalogShell({ title, total, categories, brands, searchParams, children }: Props) {
  const t = useTranslations("catalog");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [allBrands, setAllBrands] = useState(false);

  const category = searchParams.get("category") ?? "";
  const selectedBrands = (searchParams.get("brand") ?? "").split(",").filter(Boolean);
  const sort = searchParams.get("sort") ?? "popular";
  const min = searchParams.get("min") ?? "";
  const max = searchParams.get("max") ?? "";
  const sale = searchParams.get("sale") === "1";
  const stock = searchParams.get("stock") === "1";
  const activeCount =
    selectedBrands.length + Number(Boolean(min || max)) + Number(sale) + Number(stock) + Number(Boolean(category));

  // A selected brand stays visible even when the list is collapsed.
  const shownBrands = allBrands
    ? brands
    : brands.filter((brand, index) => index < BRAND_LIMIT || selectedBrands.includes(brand.value));

  /** Updates URL params; every filter change resets to the first page. */
  function update(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    setQuery(params.toString());
  }

  function toggleBrand(name: string) {
    const next = selectedBrands.includes(name)
      ? selectedBrands.filter((item) => item !== name)
      : [...selectedBrands, name];
    update({ brand: next.join(",") || null });
  }

  function reset() {
    const q = searchParams.get("q");
    setQuery(q ? `q=${encodeURIComponent(q)}` : "");
  }

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  const allCount = categories.reduce((sum, item) => sum + item.count, 0);

  const panel = (
    <div className="flex flex-col gap-7">
      <fieldset>
        <legend className="mb-3 text-sm font-semibold">{t("categories")}</legend>
        <ul className="-mx-2 flex flex-col gap-0.5">
          {[{ value: "", label: t("all"), count: allCount }, ...categories].map((item) => {
            const active = item.value === category;
            return (
              <li key={item.value || "all"}>
                <button
                  type="button"
                  aria-pressed={active}
                  // Brands differ per category, so the brand filter is cleared too.
                  onClick={() => update({ category: item.value || null, brand: null })}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors duration-300 ${
                    active ? "bg-btn font-medium text-btn-text" : "text-muted hover:bg-hairline hover:text-ink"
                  }`}
                >
                  {item.label}
                  <span className={`text-xs tabular-nums ${active ? "opacity-70" : "text-faint"}`}>{item.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <form
        key={`${min}-${max}`}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const clean = (value: FormDataEntryValue | null) => String(value ?? "").replace(/\D/g, "");
          update({ min: clean(data.get("min")) || null, max: clean(data.get("max")) || null });
        }}
      >
        <p className="mb-3 text-sm font-semibold">{t("price")}</p>
        <div className="flex items-center gap-2">
          <input name="min" inputMode="numeric" defaultValue={min} placeholder={t("from")} aria-label={t("from")} className="field" />
          <input name="max" inputMode="numeric" defaultValue={max} placeholder={t("to")} aria-label={t("to")} className="field" />
        </div>
        <button type="submit" className="btn btn-ghost mt-2 h-10 w-full">
          {t("apply")}
        </button>
      </form>

      <fieldset>
        <legend className="mb-3 text-sm font-semibold">{t("brands")}</legend>
        <ul className="flex flex-col gap-2.5">
          {shownBrands.map((brand) => (
            <li key={brand.value}>
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="check"
                  checked={selectedBrands.includes(brand.value)}
                  onChange={() => toggleBrand(brand.value)}
                />
                <span className="flex-1">{brand.label}</span>
                <span className="text-xs tabular-nums text-faint">{brand.count}</span>
              </label>
            </li>
          ))}
        </ul>
        {brands.length > BRAND_LIMIT && (
          <button
            type="button"
            aria-expanded={allBrands}
            onClick={() => setAllBrands((value) => !value)}
            className="mt-3 flex items-center gap-1 text-sm font-medium text-accent transition-opacity duration-300 hover:opacity-70"
          >
            {allBrands ? t("showLess") : t("showAllBrands", { count: brands.length })}
            <ChevronDown
              className={`size-4 transition-transform duration-300 ease-smooth ${allBrands ? "rotate-180" : ""}`}
              strokeWidth={1.8}
            />
          </button>
        )}
      </fieldset>

      <div className="flex flex-col gap-2.5 border-t border-hairline pt-5">
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" className="check" checked={sale} onChange={() => update({ sale: sale ? null : "1" })} />
          {t("onlySale")}
        </label>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" className="check" checked={stock} onChange={() => update({ stock: stock ? null : "1" })} />
          {t("onlyInStock")}
        </label>
      </div>

      {activeCount > 0 && (
        <button type="button" onClick={reset} className="btn btn-ghost h-10 w-full text-muted">
          <X className="size-4" strokeWidth={1.8} />
          {t("reset")}
        </button>
      )}
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-1">
        <div className="enter" style={enterDelay(40)}>
          <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-4xl">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{t("found", { count: total })}</p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            style={enterDelay(80)}
            className="btn btn-ghost enter h-11 flex-1 lg:hidden"
          >
            <SlidersHorizontal className="size-4" strokeWidth={1.8} />
            {t("filters")}
            {activeCount > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[0.6875rem] font-semibold leading-5 text-white">
                {activeCount}
              </span>
            )}
          </button>
          <div className="flex-1 sm:flex-none">
            <Select
              aria-label={t("sort")}
              value={sort}
              onValueChange={(value) => update({ sort: value === "popular" ? null : value })}
              style={enterDelay(120)}
              className="btn btn-ghost enter h-11 pl-4 font-medium"
            >
              {sortOptions.map((option) => (
                <option key={option} value={option}>
                  {t(`sortOptions.${option}`)}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside
          style={enterDelay(80)}
          className="glass enter sticky top-24 hidden max-h-[calc(100dvh-7.5rem)] overflow-y-auto rounded-[1.75rem] p-5 lg:block"
        >
          {panel}
        </aside>

        <div>{children}</div>
      </div>

      {sheetOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label={t("filters")}>
            <button
              type="button"
              aria-label={t("close")}
              onClick={() => setSheetOpen(false)}
              className="sheet-backdrop absolute inset-0 cursor-default bg-black/35 backdrop-blur-sm"
            />
            <div className="glass glass-strong sheet-up relative flex max-h-[88dvh] w-full flex-col rounded-t-[1.75rem]">
              <div className="flex items-center justify-between px-5 pb-2 pt-4">
                <h2 className="text-lg font-semibold">{t("filters")}</h2>
                <button type="button" onClick={() => setSheetOpen(false)} className="icon-btn -mr-2" aria-label={t("close")}>
                  <X className="size-5" strokeWidth={1.7} />
                </button>
              </div>
              <div className="overflow-y-auto px-5 pb-4 pt-2">{panel}</div>
              <div className="border-t border-hairline p-4" style={{ paddingBottom: "calc(1rem + max(env(safe-area-inset-bottom), var(--tg-safe-area-inset-bottom, 0px)))" }}>
                <button type="button" onClick={() => setSheetOpen(false)} className="btn btn-primary h-12 w-full">
                  {t("show", { count: total })}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
