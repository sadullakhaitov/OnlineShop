import { Link, router, useFocusEffect } from "expo-router";
import { ChevronRight, LogOut, Package, Phone, Send, UserRound } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBadge } from "@/components/OrderBits";
import { Backdrop, Button, Chip, Glass, ProductImage, Txt } from "@/components/ui";
import { api, ApiError, type Order } from "@/lib/api";
import { formatDate, formatPhone, sum } from "@/lib/format";
import { fill, useT } from "@/lib/i18n";
import { GUTTER, TAB_BAR_SPACE } from "@/lib/layout";
import { useSettings } from "@/lib/settings";
import { useShop } from "@/lib/shop";
import { usePalette } from "@/lib/theme";

export default function Account() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { t, locale } = useT();
  const settings = useSettings();
  const shop = useShop();
  const [me, setMe] = useState<{ customer: { name: string | null; phone: string }; orders: Order[] } | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!shop.token) {
        setMe(null);
        return;
      }
      api
        .me(locale)
        .then(setMe)
        .catch((error) => {
          // The session ended on the server: sign out here too.
          if (error instanceof ApiError && error.status === 401) shop.signOut();
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shop.token, locale]),
  );

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: GUTTER, paddingBottom: TAB_BAR_SPACE + insets.bottom, gap: 14 }}>
        <Txt variant="title">{t.account.title}</Txt>

        {!shop.token ? (
          <Glass style={{ padding: 20, gap: 10 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
              <UserRound size={26} color={c.accent} strokeWidth={1.8} />
            </View>
            <Txt variant="h2">{t.account.signInTitle}</Txt>
            <Txt variant="muted">{t.account.signInText}</Txt>
            <Button title={t.account.signIn} onPress={() => router.push("/login")} style={{ marginTop: 6 }} />
          </Glass>
        ) : (
          <>
            <Glass style={{ padding: 18, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.accentSoft, alignItems: "center", justifyContent: "center" }}>
                <UserRound size={24} color={c.accent} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt style={{ fontWeight: "600", fontSize: 16 }}>{me?.customer.name ?? " "}</Txt>
                <Txt variant="small">{me ? formatPhone(me.customer.phone) : " "}</Txt>
              </View>
              <Pressable accessibilityLabel={t.account.logout} onPress={shop.signOut} hitSlop={10}>
                <LogOut size={20} color={c.muted} />
              </Pressable>
            </Glass>

            <Txt variant="h2" style={{ marginTop: 6 }}>
              {t.account.orders}
            </Txt>
            {me && me.orders.length === 0 && (
              <Glass style={{ padding: 20, alignItems: "center", gap: 8 }}>
                <Package size={26} color={c.accent} strokeWidth={1.7} />
                <Txt variant="muted">{t.account.noOrders}</Txt>
              </Glass>
            )}
            {me?.orders.map((order) => (
              <Link key={order.id} href={{ pathname: "/order/[id]", params: { id: order.id } }} asChild>
                <Pressable>
                  <Glass style={{ padding: 16, gap: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View>
                        <Txt style={{ fontWeight: "600", fontSize: 16 }}>{fill(t.order.title, { n: order.number })}</Txt>
                        <Txt variant="faint">{formatDate(order.createdAt, locale)}</Txt>
                      </View>
                      <StatusBadge order={order} />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      {order.items.slice(0, 4).map((item) => (
                        <ProductImage key={item.productId} art={item.art} size={48} style={{ borderRadius: 14 }} />
                      ))}
                      {order.items.length > 4 && <Txt variant="small">+{order.items.length - 4}</Txt>}
                      <Txt style={{ marginLeft: "auto", fontWeight: "700", fontSize: 15 }}>{sum(order.total, locale)}</Txt>
                    </View>
                  </Glass>
                </Pressable>
              </Link>
            ))}
          </>
        )}

        <Txt variant="h2" style={{ marginTop: 6 }}>
          {t.account.settings}
        </Txt>
        <Glass style={{ padding: 18, gap: 14 }}>
          <Txt variant="small">{t.account.language}</Txt>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Chip label="O'zbekcha" active={settings.locale === "uz"} onPress={() => settings.setLocale("uz")} />
            <Chip label="Русский" active={settings.locale === "ru"} onPress={() => settings.setLocale("ru")} />
          </View>
          <Txt variant="small">{t.account.theme}</Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(["system", "light", "dark"] as const).map((key) => (
              <Chip key={key} label={t.account.themes[key]} active={settings.theme === key} onPress={() => settings.setTheme(key)} />
            ))}
          </View>
        </Glass>

        <Txt variant="h2" style={{ marginTop: 6 }}>
          {t.account.info}
        </Txt>
        <Glass style={{ paddingVertical: 6 }}>
          {shop.config?.pages.map((page, index) => (
            <Link key={page.slug} href={{ pathname: "/info/[slug]", params: { slug: page.slug } }} asChild>
              <Pressable style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: index ? 1 : 0, borderTopColor: c.hairline }}>
                <Txt style={{ flex: 1 }}>{page.title}</Txt>
                <ChevronRight size={18} color={c.faint} />
              </Pressable>
            </Link>
          ))}
        </Glass>

        {shop.config && (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              title={shop.config.contacts.phone}
              variant="secondary"
              style={{ flex: 1, paddingHorizontal: 12 }}
              icon={<Phone size={17} color={c.text} />}
              onPress={() => Linking.openURL(shop.config!.contacts.phoneHref)}
            />
            <Button
              title="Telegram"
              variant="secondary"
              icon={<Send size={17} color={c.text} />}
              onPress={() => Linking.openURL(shop.config!.contacts.telegram)}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
