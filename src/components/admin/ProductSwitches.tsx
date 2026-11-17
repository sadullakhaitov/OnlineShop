"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { productFlagAction } from "@/server/admin/actions";
import type { ProductFlag } from "@/server/admin/products";

type Props = {
  id: string;
  title: string;
  inStock: boolean;
  active: boolean;
};

/**
 * The two switches of a product in the list: "in stock" and "shown in the
 * shop". A switch moves at once and falls back if the server refuses.
 */
export function ProductSwitches({ id, title, inStock, active }: Props) {
  const t = useTranslations("admin.products");
  const [shown, setShown] = useOptimistic({ inStock, active });
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  const change = (flag: ProductFlag, value: boolean) => {
    startTransition(async () => {
      setShown((current) => ({ ...current, [flag]: value }));
      // A dropped connection rejects the call; that is a failure like any other.
      const result = await productFlagAction(id, flag, value).catch(() => ({ ok: false }));
      setFailed(!result.ok);
    });
  };

  return (
    <>
      {(["inStock", "active"] as const).map((flag) => (
        <label key={flag} className="flex items-center gap-2.5 text-[0.8125rem] text-muted lg:justify-center">
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={shown[flag]}
            disabled={pending}
            onChange={(event) => change(flag, event.target.checked)}
            aria-label={`${title}: ${t(flag)}`}
          />
          <span className="lg:hidden" aria-hidden="true">
            {t(`${flag}Short`)}
          </span>
        </label>
      ))}
      {failed && (
        <p role="alert" className="col-span-full text-xs text-danger">
          {t("switchError")}
        </p>
      )}
    </>
  );
}
