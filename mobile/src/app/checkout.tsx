import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Field } from "@/components/Field";
import { tap } from "@/components/ProductCard";
import { Backdrop, Button, Chip, Glass, Loading, TopBar, Txt } from "@/components/ui";
import { absoluteUrl, api, ApiError, type PaymentMethod } from "@/lib/api";
import { formatLocalPhone, sum } from "@/lib/format";
import { fill, useT } from "@/lib/i18n";
import { GUTTER } from "@/lib/layout";
import { useShop } from "@/lib/shop";
import { usePalette } from "@/lib/theme";

type Errors = Partial<Record<"name" | "phone" | "zone" | "address" | "form", string>>;

export default function Checkout() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { t, locale } = useT();
  const shop = useShop();
  const config = shop.config;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [zone, setZone] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);

  // A signed-in customer does not type their name and phone again.
  useEffect(() => {
    if (!shop.token) return;
    api
      .me(locale)
      .then(({ customer }) => {
        setName((current) => current || customer.name || "");
        setPhone((current) => current || customer.phone.replace(/^\+998/, ""));
      })
      .catch(() => {});
  }, [shop.token, locale]);

  useEffect(() => {
    if (config && !config.paymentMethods.includes(method)) setMethod(config.paymentMethods[0]);
  }, [config, method]);

  const lines = shop.cart.flatMap((line) => {
    const product = shop.byId(line.id);
    return product?.inStock ? [{ ...line, product }] : [];
  });
  const subtotal = lines.reduce((total, line) => total + line.product.price * line.quantity, 0);
  const chosenZone = config?.zones.find((z) => z.slug === zone);
  const fee =
    deliveryType === "pickup" || !chosenZone || !config ? 0 : subtotal >= config.freeDeliveryFrom ? 0 : chosenZone.fee;
  const total = subtotal + fee;

  async function submit() {
    const digits = phone.replace(/\D/g, "");
    const next: Errors = {};
    if (name.trim().length < 2) next.name = t.checkout.errors.name;
    if (digits.length !== 9) next.phone = t.checkout.errors.phone;
    if (deliveryType === "delivery" && !zone) next.zone = t.checkout.errors.zone;
    if (deliveryType === "delivery" && address.trim().length < 3) next.address = t.checkout.errors.address;
    setErrors(next);
    if (Object.keys(next).length) return;

    tap();
    setSending(true);
    try {
      const result = await api.placeOrder({
        items: lines.map((line) => ({ id: line.id, quantity: line.quantity })),
        name: name.trim(),
        phone: `+998${digits}`,
        deliveryType,
        zone: deliveryType === "delivery" ? zone : undefined,
        address: deliveryType === "delivery" ? address.trim() : undefined,
        comment: comment.trim() || undefined,
        paymentMethod: method,
        locale,
        expectedTotal: total,
      });
      shop.clearCart();
      router.replace({ pathname: "/order/[id]", params: { id: result.id, placed: "1" } });
      if (result.payUrl) WebBrowser.openBrowserAsync(absoluteUrl(result.payUrl)).catch(() => {});
    } catch (error) {
      const body = error instanceof ApiError ? error.body : null;
      const code = body?.error;
      const message =
        code === "unavailable"
          ? t.checkout.errors.unavailable
          : code === "changed"
            ? fill(t.checkout.errors.changed, { total: sum(Number(body?.total ?? 0), locale) })
            : code === "payment"
              ? t.checkout.errors.payment
              : t.checkout.errors.server;
      if (code === "changed") shop.reload();
      setErrors({ form: message });
    } finally {
      setSending(false);
    }
  }

  if (!config || !shop.products) {
    return (
      <View style={{ flex: 1 }}>
        <Backdrop />
        <TopBar title={t.checkout.title} />
        <Loading />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <TopBar title={t.checkout.title} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: GUTTER, paddingBottom: insets.bottom + 40, gap: 14 }}>
          <Glass style={{ padding: 18, gap: 14 }}>
            <Txt variant="h2">{t.checkout.contact}</Txt>
            <Field label={t.checkout.name} value={name} onChangeText={setName} autoComplete="name" error={errors.name} />
            <Field
              label={t.checkout.phone}
              prefix="+998"
              value={formatLocalPhone(phone)}
              onChangeText={(text) => setPhone(text.replace(/\D/g, "").slice(0, 9))}
              keyboardType="phone-pad"
              placeholder="90 123 45 67"
              error={errors.phone}
            />
          </Glass>

          <Glass style={{ padding: 18, gap: 14 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Chip label={t.checkout.delivery} active={deliveryType === "delivery"} onPress={() => setDeliveryType("delivery")} />
              <Chip label={t.checkout.pickup} active={deliveryType === "pickup"} onPress={() => setDeliveryType("pickup")} />
            </View>
            {deliveryType === "pickup" ? (
              <Txt variant="muted">
                {config.contacts.address} · {config.contacts.hours}
              </Txt>
            ) : (
              <>
                <Txt variant="small">{t.checkout.chooseZone}</Txt>
                <View style={{ borderRadius: 16, borderWidth: 1, borderColor: errors.zone ? c.danger : c.hairline, overflow: "hidden" }}>
                  {config.zones.map((item, index) => {
                    const active = zone === item.slug;
                    const zoneFee = subtotal >= config.freeDeliveryFrom ? 0 : item.fee;
                    return (
                      <Pressable
                        key={item.slug}
                        onPress={() => setZone(item.slug)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          gap: 10,
                          borderTopWidth: index ? 1 : 0,
                          borderTopColor: c.hairline,
                          backgroundColor: active ? c.accentSoft : "transparent",
                        }}
                      >
                        <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: active ? c.accent : c.faint, alignItems: "center", justifyContent: "center", backgroundColor: active ? c.accent : "transparent" }}>
                          {active && <Check size={12} color="#fff" strokeWidth={3} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Txt style={{ fontSize: 15 }}>{item.name}</Txt>
                          <Txt variant="faint">{fill(t.checkout.days, { n: item.days })}</Txt>
                        </View>
                        <Txt style={{ fontWeight: "600", fontSize: 14, color: zoneFee ? c.text : c.accent }}>
                          {zoneFee ? sum(zoneFee, locale) : t.checkout.free}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </View>
                {errors.zone ? <Txt style={{ color: c.danger, fontSize: 13 }}>{errors.zone}</Txt> : null}
                <Field label={t.checkout.address} value={address} onChangeText={setAddress} autoComplete="street-address" error={errors.address} />
              </>
            )}
            <Field label={t.checkout.comment} value={comment} onChangeText={setComment} multiline maxLength={500} />
          </Glass>

          <Glass style={{ padding: 18, gap: 12 }}>
            <Txt variant="h2">{t.checkout.payment}</Txt>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {config.paymentMethods.map((item) => (
                <Chip
                  key={item}
                  label={item === "cash" ? t.checkout.cash : item === "payme" ? "Payme" : "Click"}
                  active={method === item}
                  onPress={() => setMethod(item)}
                />
              ))}
            </View>
          </Glass>

          <Glass strong style={{ padding: 18, gap: 10 }}>
            {lines.map((line) => (
              <View key={line.id} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <Txt variant="small" style={{ flex: 1 }} numberOfLines={1}>
                  {line.product.title} × {line.quantity}
                </Txt>
                <Txt variant="small">{sum(line.product.price * line.quantity, locale)}</Txt>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: c.hairline, marginVertical: 2 }} />
            <Row label={t.cart.subtotal} value={sum(subtotal, locale)} />
            {deliveryType === "delivery" && (
              <Row label={t.checkout.deliveryFee} value={chosenZone ? (fee ? sum(fee, locale) : t.checkout.free) : "—"} />
            )}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              <Txt style={{ fontSize: 17, fontWeight: "600" }}>{t.checkout.total}</Txt>
              <Txt style={{ fontSize: 20, fontWeight: "700", letterSpacing: -0.4 }}>{sum(total, locale)}</Txt>
            </View>
            {errors.form ? <Txt style={{ color: c.danger, fontSize: 14 }}>{errors.form}</Txt> : null}
            <Button title={t.checkout.place} loading={sending} disabled={lines.length === 0} onPress={submit} style={{ marginTop: 6 }} />
          </Glass>
        </ScrollView>
      </KeyboardAvoidingView>
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
