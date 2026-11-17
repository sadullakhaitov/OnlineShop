import { View } from "react-native";
import type { Order } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { usePalette } from "@/lib/theme";
import { Txt } from "./ui";

export function statusLabel(order: Order, t: ReturnType<typeof useT>["t"]): string {
  if (order.status === "delivering" && order.deliveryType === "pickup") return t.order.ready;
  return t.order.status[order.status];
}

export function StatusBadge({ order }: { order: Order }) {
  const c = usePalette();
  const { t } = useT();
  const color = order.status === "cancelled" ? c.danger : order.status === "delivered" ? c.success : c.accent;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      <Txt style={{ fontSize: 13, fontWeight: "600" }}>{statusLabel(order, t)}</Txt>
    </View>
  );
}

const steps = ["new", "confirmed", "delivering", "delivered"] as const;

/** The four steps of an order, the current one lit. */
export function Steps({ order }: { order: Order }) {
  const c = usePalette();
  const { t } = useT();
  if (order.status === "cancelled") return null;
  const current = steps.indexOf(order.status);
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {steps.map((step, index) => (
        <View key={step} style={{ flex: 1, gap: 6 }}>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: index <= current ? c.accent : c.hairline }} />
          <Txt variant="faint" style={{ color: index <= current ? c.text : c.faint, fontSize: 11 }} numberOfLines={1}>
            {step === "delivering" && order.deliveryType === "pickup" ? t.order.ready : t.order.status[step]}
          </Txt>
        </View>
      ))}
    </View>
  );
}
