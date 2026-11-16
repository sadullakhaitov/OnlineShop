import { ArrowRight, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal";

export function ExtendedWarranty() {
  const t = useTranslations("extended");

  return (
    <Reveal>
      <section className="glass glass-sheen flex flex-col gap-5 rounded-[1.75rem] p-6 sm:flex-row sm:items-center sm:px-8">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <ShieldCheck className="size-7" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("text")}</p>
        </div>
        <a href="#support" className="btn btn-primary group self-start sm:self-auto">
          {t("cta")}
          <ArrowRight className="size-4 transition-transform duration-300 ease-smooth group-hover:translate-x-1" strokeWidth={1.8} />
        </a>
      </section>
    </Reveal>
  );
}
