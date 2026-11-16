import { CreditCard, ShieldCheck, Truck, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal";

const items = [
  { key: "delivery", icon: Truck },
  { key: "payment", icon: CreditCard },
  { key: "warranty", icon: ShieldCheck },
  { key: "install", icon: Wrench },
] as const;

export function Benefits() {
  const t = useTranslations("benefits");

  return (
    <Reveal>
      <ul className="glass grid grid-cols-2 gap-y-6 rounded-[1.75rem] p-6 lg:grid-cols-4 lg:divide-x lg:divide-hairline lg:px-2">
        {items.map(({ key, icon: Icon }) => (
          <li key={key} className="flex items-center gap-3.5 lg:px-6">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Icon className="size-5" strokeWidth={1.7} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-snug">{t(`${key}.title`)}</span>
              <span className="mt-0.5 block text-xs text-muted">{t(`${key}.text`)}</span>
            </span>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
