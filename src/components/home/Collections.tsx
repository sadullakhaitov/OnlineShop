import { useTranslations } from "next-intl";
import type { ArtKind } from "@/data/products";
import { Link } from "@/i18n/navigation";
import { ProductArt } from "@/components/product/ProductArt";
import { Reveal } from "@/components/ui/Reveal";

// Each card shows a real product from its section, kept on the site under public/products.
const items: { key: "kitchen" | "clean" | "climate"; art: ArtKind; photo: string; category: string }[] = [
  { key: "kitchen", art: "coffee", photo: "/products/p-042.webp", category: "kitchen" },
  { key: "clean", art: "vacuum", photo: "/products/p-048.webp", category: "small-appliances" },
  { key: "climate", art: "purifier", photo: "/products/p-052.webp", category: "climate" },
];

export function Collections() {
  const t = useTranslations("collections");

  return (
    <section id="deals" className="grid scroll-mt-28 gap-4 md:grid-cols-3">
      {items.map(({ key, art, photo, category }, i) => (
        <Reveal
          key={key}
          as="article"
          delay={i * 90}
          className="glass glass-sheen lift group relative flex h-full min-h-44 overflow-hidden rounded-[1.75rem] p-6"
        >
          <div className="relative z-10 flex max-w-[58%] flex-col items-start">
            <h3 className="text-lg font-semibold leading-snug">{t(`${key}.title`)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t(`${key}.text`)}</p>
            <div className="mt-auto pt-5">
              <Link href={{ pathname: "/catalog", query: { category } }} className="btn btn-ghost h-10 px-4">
                {t("cta")}
              </Link>
            </div>
          </div>
          <ProductArt
            kind={art}
            image={photo}
            className="absolute -bottom-3 -right-3 w-[46%] drop-shadow-xl transition-transform duration-700 ease-smooth group-hover:-translate-y-1 group-hover:scale-105"
          />
        </Reveal>
      ))}
    </section>
  );
}
