"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ProductArt } from "@/components/product/ProductArt";
import type { ArtKind } from "@/data/products";

type Slide = {
  key: "home" | "kitchen" | "climate";
  /** Three products from the shop: back left, centre, front right */
  art: [ArtKind, ArtKind, ArtKind];
  /** Their photos, kept on the site under public/products */
  photos: [string, string, string];
};

const slides: Slide[] = [
  { key: "home", art: ["coffee", "fridge", "washer"], photos: ["/products/p-007.webp", "/products/p-002.webp", "/products/p-039.webp"] },
  { key: "kitchen", art: ["blender", "oven", "airfryer"], photos: ["/products/p-009.webp", "/products/p-044.webp", "/products/p-043.webp"] },
  { key: "climate", art: ["robot", "purifier", "ac"], photos: ["/products/p-021.webp", "/products/p-027.webp", "/products/p-025.webp"] },
];

const AUTOPLAY_MS = 6500;

export function Hero() {
  const t = useTranslations("hero");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const go = useCallback((step: number) => {
    setIndex((current) => (current + step + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => go(1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, go, index]);

  return (
    <div
      className="glass glass-sheen enter relative min-h-[34rem] overflow-hidden rounded-[1.75rem] sm:min-h-[27rem] lg:min-h-[29rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {slides.map((slide, i) => {
        const active = i === index;
        return (
          <div
            key={slide.key}
            aria-hidden={!active}
            inert={!active}
            className={`absolute inset-0 flex flex-col transition-opacity duration-1000 ease-smooth sm:flex-row ${
              active ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div
              className={`relative z-10 flex flex-col items-start p-6 transition-transform duration-1000 ease-smooth sm:w-[52%] sm:justify-center sm:p-10 sm:pb-24 lg:p-12 lg:pb-24 ${
                active ? "translate-y-0" : "translate-y-4"
              }`}
            >
              <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium text-muted">
                <Sparkles className="size-3.5 text-accent" strokeWidth={2} />
                {t(`slides.${slide.key}.eyebrow`)}
              </span>
              <h1 className="mt-5 text-[2rem] font-semibold leading-[1.08] sm:text-[2.5rem] lg:text-[3rem]">
                {t(`slides.${slide.key}.title`)}
              </h1>
              <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                {t(`slides.${slide.key}.text`)}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/catalog" className="btn btn-primary">
                  {t("primary")}
                </Link>
                <Link href={{ pathname: "/catalog", query: { sale: "1" } }} className="btn btn-ghost">
                  {t("secondary")}
                </Link>
              </div>
            </div>

            <div
              className={`relative mb-[4.5rem] mt-auto h-52 transition-transform duration-[1400ms] ease-smooth sm:mb-0 sm:mt-0 sm:h-auto sm:flex-1 ${
                active ? "translate-x-0 scale-100" : "translate-x-6 scale-[0.97]"
              }`}
            >
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-white/25 to-transparent dark:from-white/5" />
              <ProductArt
                kind={slide.art[0]}
                image={slide.photos[0]}
                eager={i === 0}
                className="float absolute bottom-[38%] left-[2%] w-[30%] drop-shadow-xl sm:bottom-[44%] sm:left-0 sm:w-[34%]"
              />
              <ProductArt
                kind={slide.art[1]}
                image={slide.photos[1]}
                eager={i === 0}
                className="absolute bottom-2 right-[4%] w-[46%] drop-shadow-2xl sm:bottom-6 sm:right-[2%] sm:w-[62%]"
              />
              <ProductArt
                kind={slide.art[2]}
                image={slide.photos[2]}
                eager={i === 0}
                className="absolute bottom-0 left-[26%] w-[34%] drop-shadow-2xl sm:bottom-4 sm:left-[6%] sm:w-[44%]"
              />
            </div>
          </div>
        );
      })}

      <div className="absolute bottom-5 left-6 z-20 flex items-center gap-3 sm:bottom-8 sm:left-10 lg:left-12">
        <button type="button" onClick={() => go(-1)} className="icon-btn glass size-10" aria-label={t("prev")}>
          <ChevronLeft className="size-4" strokeWidth={2} />
        </button>
        <span className="min-w-8 text-center text-xs font-medium tabular-nums text-muted" aria-live="polite">
          {index + 1}/{slides.length}
        </span>
        <button type="button" onClick={() => go(1)} className="icon-btn glass size-10" aria-label={t("next")}>
          <ChevronRight className="size-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
