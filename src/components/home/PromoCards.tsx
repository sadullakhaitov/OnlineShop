import { ShieldCheck, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal";

const cards = [
  { key: "delivery", icon: Truck, primary: true, id: "delivery" },
  { key: "warranty", icon: ShieldCheck, primary: false, id: "warranty" },
] as const;

export function PromoCards() {
  const t = useTranslations("promo");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
      {cards.map(({ key, icon: Icon, primary, id }, i) => (
        <Reveal key={key} delay={120 + i * 100} className="h-full">
          <article
            id={id}
            className="glass glass-sheen lift relative flex h-full scroll-mt-28 flex-col items-start overflow-hidden rounded-[1.75rem] p-6"
          >
            <Icon
              className="absolute -bottom-3 -right-3 size-28 text-accent opacity-25"
              strokeWidth={1}
              aria-hidden="true"
            />
            <h2 className="max-w-[13rem] text-lg font-semibold leading-snug">{t(`${key}.title`)}</h2>
            <p className="mt-2 max-w-[13rem] text-sm leading-relaxed text-muted">{t(`${key}.text`)}</p>
            <a
              href="#support"
              className={`btn mt-auto h-10 px-4 ${primary ? "btn-primary" : "btn-ghost"}`}
              style={{ marginTop: "1.5rem" }}
            >
              {t(`${key}.cta`)}
            </a>
          </article>
        </Reveal>
      ))}
    </div>
  );
}
