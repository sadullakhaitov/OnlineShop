import { useTranslations } from "next-intl";
import { ProductArt } from "@/components/product/ProductArt";
import type { ArtKind } from "@/data/products";
import { Reveal } from "@/components/ui/Reveal";

const items: { key: "kitchen" | "clean" | "climate"; art: ArtKind }[] = [
  { key: "kitchen", art: "oven" },
  { key: "clean", art: "vacuum" },
  { key: "climate", art: "ac" },
];

export function Collections() {
  const t = useTranslations("collections");

  return (
    <section id="deals" className="grid scroll-mt-28 gap-4 md:grid-cols-3">
      {items.map(({ key, art }, i) => (
        <Reveal key={key} delay={i * 90} className="h-full">
          <article className="glass glass-sheen lift group relative flex h-full min-h-44 overflow-hidden rounded-[1.75rem] p-6">
            <div className="relative z-10 flex max-w-[58%] flex-col items-start">
              <h3 className="text-lg font-semibold leading-snug">{t(`${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t(`${key}.text`)}</p>
              <a href="#popular" className="btn btn-ghost mt-auto h-10 px-4" style={{ marginTop: "1.25rem" }}>
                {t("cta")}
              </a>
            </div>
            <ProductArt
              kind={art}
              className="absolute -bottom-3 -right-3 w-[46%] drop-shadow-xl transition-transform duration-700 ease-smooth group-hover:-translate-y-1 group-hover:scale-105"
            />
          </article>
        </Reveal>
      ))}
    </section>
  );
}
