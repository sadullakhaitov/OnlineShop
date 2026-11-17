"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { DeliveryType, OrderStatus } from "@/db/schema";
import { orderPaymentAction, orderStatusAction } from "@/server/admin/actions";
import type { PaymentAction } from "@/server/admin/orders";

const forward: OrderStatus[] = ["new", "confirmed", "delivering", "delivered"];

type StatusProps = {
  id: string;
  status: OrderStatus;
  deliveryType: DeliveryType;
  /** Statuses this order may move to, as the server allows right now */
  allowed: OrderStatus[];
  paid: boolean;
};

/** Buttons that move an order to its next status, one step back, or cancel it. */
export function OrderStatusActions({ id, status, deliveryType, allowed, paid }: StatusProps) {
  const t = useTranslations("admin");
  const [state, action, pending] = useActionState(orderStatusAction, null);
  // Remembers which status the question was asked about, so that it closes
  // by itself once the order has moved on.
  const [asking, setAsking] = useState<OrderStatus | null>(null);

  const pickup = deliveryType === "pickup";
  const name = (value: OrderStatus) => t(`status.${value === "delivering" && pickup ? "readyForPickup" : value}`);

  const position = forward.indexOf(status);
  const next = allowed.find((to) => position >= 0 && forward.indexOf(to) === position + 1);
  const back = allowed.find((to) => position >= 0 && forward.indexOf(to) === position - 1);
  const restore = status === "cancelled" ? allowed[0] : undefined;
  const canCancel = allowed.includes("cancelled");
  const nextLabel =
    next === "confirmed"
      ? t("order.actions.confirm")
      : next === "delivering"
        ? t(pickup ? "order.actions.ready" : "order.actions.handOver")
        : t("order.actions.deliver");

  if (allowed.length === 0) return <p className="text-sm leading-relaxed text-muted">{t("order.closed")}</p>;

  return (
    <form action={action} className="flex flex-col gap-2.5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="from" value={status} />

      {next && (
        <button type="submit" name="to" value={next} disabled={pending} className="btn btn-primary h-12 w-full disabled:opacity-60">
          {pending ? t("order.actions.working") : nextLabel}
        </button>
      )}
      {restore && (
        <button type="submit" name="to" value={restore} disabled={pending} className="btn btn-primary h-12 w-full disabled:opacity-60">
          {pending ? t("order.actions.working") : t("order.actions.restore")}
        </button>
      )}

      {asking === status ? (
        <div className="rounded-2xl border border-hairline p-3.5">
          <p className="text-sm font-medium">{t("order.actions.cancelQuestion")}</p>
          {paid && <p className="mt-1 text-xs leading-relaxed text-muted">{t("order.actions.cancelPaid")}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              name="to"
              value="cancelled"
              disabled={pending}
              className="btn h-10 flex-1 bg-danger px-3 text-white disabled:opacity-60"
            >
              {t("order.actions.cancelYes")}
            </button>
            <button type="button" onClick={() => setAsking(null)} disabled={pending} className="btn btn-ghost h-10 px-4">
              {t("order.actions.cancelNo")}
            </button>
          </div>
        </div>
      ) : (
        (back || canCancel) && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-1 text-[0.8125rem]">
            {back ? (
              <button
                type="submit"
                name="to"
                value={back}
                disabled={pending}
                className="text-muted transition-colors duration-300 hover:text-ink disabled:opacity-60"
              >
                {t("order.actions.stepBack", { status: name(back) })}
              </button>
            ) : (
              <span />
            )}
            {canCancel && (
              <button
                type="button"
                onClick={() => setAsking(status)}
                disabled={pending}
                className="text-danger transition-opacity duration-300 hover:opacity-70 disabled:opacity-60"
              >
                {t("order.actions.cancel")}
              </button>
            )}
          </div>
        )
      )}

      {state && (
        <p role="alert" className="text-xs leading-relaxed text-danger">
          {t(`order.errors.${state.error}`)}
        </p>
      )}
    </form>
  );
}

type PaymentProps = {
  id: string;
  /** What the shop may do with the payment right now */
  actions: PaymentAction[];
  /** An explanation shown under the button */
  hint?: string;
};

/** Writing down money received by hand, taking that note back, or a refund. */
export function OrderPaymentActions({ id, actions, hint }: PaymentProps) {
  const t = useTranslations("admin.order");
  const [state, action, pending] = useActionState(orderPaymentAction, null);

  return (
    <form action={action} className="flex flex-col gap-2.5">
      <input type="hidden" name="id" value={id} />
      {actions.map((item) => (
        <button
          key={item}
          type="submit"
          name="action"
          value={item}
          disabled={pending}
          className={`btn h-11 w-full disabled:opacity-60 ${item === "undo" ? "btn-ghost" : "btn-accent"}`}
        >
          {pending ? t("actions.working") : t(`payActions.${item}`)}
        </button>
      ))}
      {hint && <p className="text-xs leading-relaxed text-muted">{hint}</p>}
      {state && (
        <p role="alert" className="text-xs leading-relaxed text-danger">
          {t(`errors.${state.error}`)}
        </p>
      )}
    </form>
  );
}
