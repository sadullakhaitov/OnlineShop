import { useTranslations } from "next-intl";
import type { DeliveryType, OrderStatus } from "@/db/schema";

// "New" is the loud one: it is the status that waits for the shop.
const tones: Record<OrderStatus, string> = {
  new: "bg-accent text-btn-text",
  confirmed: "bg-accent-soft text-accent",
  delivering: "border border-hairline bg-[var(--glass)] text-ink",
  delivered: "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success",
  cancelled: "bg-hairline text-muted",
};

type Props = { status: OrderStatus; deliveryType?: DeliveryType; className?: string };

/** The status as the shop reads it; a pickup order "on the way" is waiting in the shop. */
export function AdminStatusBadge({ status, deliveryType, className = "" }: Props) {
  const t = useTranslations("admin.status");
  const key = status === "delivering" && deliveryType === "pickup" ? "readyForPickup" : status;

  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-xs font-semibold ${tones[status]} ${className}`}
    >
      {t(key)}
    </span>
  );
}
