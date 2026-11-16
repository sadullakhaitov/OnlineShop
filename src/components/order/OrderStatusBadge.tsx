import { useTranslations } from "next-intl";
import type { OrderStatus } from "@/db/schema";

const tones: Record<OrderStatus, string> = {
  new: "bg-accent-soft text-accent",
  confirmed: "bg-accent-soft text-accent",
  delivering: "bg-accent-soft text-accent",
  delivered: "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success",
  cancelled: "bg-hairline text-muted",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations("order.status");

  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[status]}`}>
      {t(status)}
    </span>
  );
}
