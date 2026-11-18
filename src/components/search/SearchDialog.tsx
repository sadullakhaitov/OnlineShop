"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { SearchHit } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { reportSearch } from "@/lib/search-track";
import { ProductArt } from "@/components/product/ProductArt";

const popular = ["Samsung", "Artel", "Xiaomi", "Dyson", "LG"];

export function SearchDialog() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searched, setSearched] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const text = query.trim();
  const ready = text.length >= 2;

  // Live results, debounced.
  useEffect(() => {
    if (!open || !ready) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(text)}&locale=${locale}`,
          { signal: controller.signal },
        );
        const data: { hits: SearchHit[] } = await response.json();
        setHits(data.hits);
        setSearched(text);
      } catch {
        // Aborted or offline: keep the previous results.
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, ready, text, locale]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    setHits([]);
    setSearched("");
  }

  function goToCatalog(value: string) {
    close();
    router.push({ pathname: "/catalog", query: { q: value } });
  }

  const visibleHits = ready ? hits : [];

  return (
    <>
      <button type="button" className="icon-btn" aria-label={t("nav.search")} onClick={() => setOpen(true)}>
        <Search className="size-5" strokeWidth={1.7} />
      </button>

      {open &&
        createPortal(
          <div className="tg-top fixed inset-0 z-50 flex items-start justify-center px-3 pt-3 sm:pt-20" role="dialog" aria-modal="true" aria-label={t("nav.search")}>
            <button
              type="button"
              aria-label={t("search.close")}
              onClick={close}
              className="sheet-backdrop absolute inset-0 cursor-default bg-black/30 backdrop-blur-sm"
            />
            <div className="glass glass-strong sheet-panel relative w-full max-w-xl overflow-hidden rounded-[1.75rem]">
              <form
                className="flex items-center gap-3 border-b border-hairline px-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (text) goToCatalog(text);
                }}
              >
                <Search className="size-5 shrink-0 text-muted" strokeWidth={1.7} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("search.placeholder")}
                  maxLength={80}
                  enterKeyHint="search"
                  className="h-16 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-faint"
                />
                <button type="button" onClick={close} className="icon-btn -mr-2" aria-label={t("search.close")}>
                  <X className="size-5" strokeWidth={1.7} />
                </button>
              </form>

              <div className="max-h-[60dvh] overflow-y-auto p-3">
                {!ready && (
                  <div className="p-2">
                    <p className="text-xs font-medium text-muted">{t("search.popular")}</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {popular.map((item) => (
                        <li key={item}>
                          <button type="button" onClick={() => goToCatalog(item)} className="btn btn-ghost h-9 rounded-full px-4 text-[0.8125rem] font-medium">
                            {item}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {ready && visibleHits.length === 0 && searched === text && (
                  <p className="px-2 py-6 text-center text-sm text-muted">{t("search.nothing")}</p>
                )}

                {visibleHits.length > 0 && (
                  <>
                    <ul>
                      {visibleHits.map((hit) => (
                        <li key={hit.slug}>
                          <Link
                            href={`/product/${hit.slug}`}
                            onClick={() => {
                              reportSearch({ slug: hit.slug });
                              close();
                            }}
                            className="flex items-center gap-3 rounded-2xl p-2 transition-colors duration-200 hover:bg-hairline"
                          >
                            <span className="tile grid size-14 shrink-0 place-items-center rounded-xl">
                              <ProductArt kind={hit.art} image={hit.image} className="size-11" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-xs text-muted">{hit.kind}</span>
                              <span className="block truncate text-sm font-medium">{hit.title}</span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums">
                              {formatPrice(hit.price)}{" "}
                              <span className="text-xs font-medium text-muted">{t("product.currency")}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => goToCatalog(text)}
                      className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-2xl p-3 text-sm font-medium text-muted transition-colors duration-200 hover:bg-hairline hover:text-ink"
                    >
                      {t("search.showAll")}
                      <ArrowRight className="size-4" strokeWidth={1.8} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
