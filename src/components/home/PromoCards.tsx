import { ShieldCheck, Truck } from "lucide-react";
import { useTranslations } from "next-intl";
import { enterDelay } from "@/lib/motion";

const cards = [
  { key: "delivery", icon: Truck, primary: true, id: "delivery" },
  { key: "warranty", icon: ShieldCheck, primary: false, id: "warranty" },
] as const;

export function PromoCards() {
  const t = useTranslations("promo");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
      {cards.map(({ key, icon: Icon, primary, id }, i) => (
        <article
          key={key}
          id={id}
          style={enterDelay(100 + i * 90)}
          className="glass glass-sheen lift enter relative flex h-full scroll-mt-28 flex-col items-start overflow-hidden rounded-[1.75rem] p-6"
        >
          <Icon
            className="absolute -bottom-3 -right-3 size-28 text-accent opacity-25"
            strokeWidth={1}
            aria-hidden="true"
          />
          <h2 className="max-w-[13rem] text-lg font-semibold leading-snug">{t(`${key}.title`)}</h2>
          <p className="mt-2 max-w-[13rem] text-sm leading-relaxed text-muted">{t(`${key}.text`)}</p>
          <div className="mt-auto pt-6">
            <a href="#support" className={`btn h-10 px-4 ${primary ? "btn-primary" : "btn-ghost"}`}>
              {t(`${key}.cta`)}
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}
