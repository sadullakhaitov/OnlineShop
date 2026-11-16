"use client";

import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { MAX_QUANTITY } from "@/lib/limits";

type Props = {
  quantity: number;
  onChange: (quantity: number) => void;
};

const buttonClass =
  "grid size-9 place-items-center rounded-full text-muted transition-colors duration-300 hover:text-ink active:scale-90 disabled:opacity-30 disabled:hover:text-muted";

export function QuantityStepper({ quantity, onChange }: Props) {
  const t = useTranslations("cart");

  return (
    <div className="inline-flex h-9 items-center rounded-full border border-hairline bg-[var(--glass)]" role="group" aria-label={t("quantity")}>
      <button
        type="button"
        aria-label={t("decrease")}
        disabled={quantity <= 1}
        onClick={() => onChange(quantity - 1)}
        className={buttonClass}
      >
        <Minus className="size-3.5" strokeWidth={2} />
      </button>
      <span className="w-6 text-center text-sm font-medium tabular-nums" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        aria-label={t("increase")}
        disabled={quantity >= MAX_QUANTITY}
        onClick={() => onChange(quantity + 1)}
        className={buttonClass}
      >
        <Plus className="size-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
