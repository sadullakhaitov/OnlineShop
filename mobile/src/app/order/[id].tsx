import { useFocusEffect, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { CircleCheck } from "lucide-react-native";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge, Steps } from "@/components/OrderBits";
import { Backdrop, Button, Glass, LoadError, Loading, ProductImage, TopBar, Txt } from "@/components/ui";
import { api, type Order } from "@/lib/api";
import { formatDate, formatPhone, sum } from "@/lib/format";
import { fill, useT } from "@/lib/i18n";
import { GUTTER } from "@/lib/layout";
import { useShop } from "@/lib/shop";
import { usePalette } from "@/lib/theme";

export default function OrderScreen() {
  const { id, placed } = useLocalSearchParams<{ id: string; placed?: string }>();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { t, locale } = useT();
  const shop = useShop();
  const [order, setOrder] = useState<Order | null>(null);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    return api
      .order(id, locale)
      .then(({ order: next }) => setOrder(next))
      .catch(() => setFailed(true));
  }, [id, locale]);

  // Fresh on every visit, also when the customer comes back from paying.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const zone = order?.zone ? shop.config?.zones.find((z) => z.slug === order.zone)?.name : null;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <TopBar title={order ? fill(t.order.title, { n: order.number }) : ""} />
      {!order ? (
        failed ? (
          <View style={{ padding: GUTTER }}>
            <LoadError onRetry={load} />
          </View>
        ) : (
          <Loading />
        )
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: GUTTER, paddingBottom: insets.bottom + 40, gap: 14 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={c.accent}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
            />
          }
        >
          {placed && (
            <Glass style={{ padding: 18, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <CircleCheck size={28} color={c.success} strokeWidth={1.8} />
              <Txt variant="h2" style={{ flex: 1 }}>
                {t.order.thanks}
              </Txt>
            </Glass>
          )}

          <Glass style={{ padding: 18, gap: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <StatusBadge order={order} />
              <Txt variant="faint">{formatDate(order.createdAt, locale)}</Txt>
            </View>
            <Steps order={order} />
          </Glass>

          {order.payUrl && (
            <Glass strong style={{ padding: 18, gap: 10 }}>
              <Button
                title={fill(t.order.pay, { m: t.order.method[order.paymentMethod] })}
                variant="accent"
                onPress={async () => {
                  await WebBrowser.openBrowserAsync(order.payUrl!).catch(() => {});
                  load();
                }}
              />
              <Txt variant="small" style={{ textAlign: "center" }}>
                {t.order.payHint}
              </Txt>
            </Glass>
          )}

          <Glass style={{ padding: 18, gap: 12 }}>
            <Txt variant="h2">{t.order.items}</Txt>
            {order.items.map((item) => (
              <View key={item.productId} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <ProductImage art={item.art} size={56} />
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontWeight: "600", fontSize: 14 }} numberOfLines={2}>
                    {item.title}
                  </Txt>
                  <Txt variant="small">
                    {item.quantity} × {sum(item.price, locale)}
                  </Txt>
                </View>
              </View>
            ))}
          </Glass>

          <Glass style={{ padding: 18, gap: 8 }}>
            <Info label={order.deliveryType === "pickup" ? t.order.pickup : t.order.delivery} value={order.deliveryType === "pickup" ? shop.config?.contacts.address ?? "" : [zone, order.address].filter(Boolean).join(", ")} />
            <Info label={order.name} value={formatPhone(order.phone)} />
            <Info label={t.order.payment} value={`${t.order.method[order.paymentMethod]} · ${t.order.paymentStatus[order.paymentStatus]}`} />
            <View style={{ height: 1, backgroundColor: c.hairline, marginVertical: 4 }} />
            <Row label={t.cart.subtotal} value={sum(order.subtotal, locale)} />
            {order.deliveryType === "delivery" && (
              <Row label={t.checkout.deliveryFee} value={order.deliveryFee ? sum(order.deliveryFee, locale) : t.checkout.free} />
            )}
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Txt style={{ fontSize: 17, fontWeight: "600" }}>{t.order.total}</Txt>
              <Txt style={{ fontSize: 20, fontWeight: "700" }}>{sum(order.total, locale)}</Txt>
            </View>
          </Glass>
        </ScrollView>
      )}
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Txt variant="faint">{label}</Txt>
      <Txt style={{ fontSize: 15 }}>{value}</Txt>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Txt variant="muted">{label}</Txt>
      <Txt>{value}</Txt>
    </View>
  );
}
