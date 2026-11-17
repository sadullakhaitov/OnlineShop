import { useLocalSearchParams } from "expo-router";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Backdrop, Glass, Loading, TopBar, Txt } from "@/components/ui";
import { sum } from "@/lib/format";
import { fill, useT } from "@/lib/i18n";
import { GUTTER } from "@/lib/layout";
import { useShop } from "@/lib/shop";
import { usePalette } from "@/lib/theme";

/** Delivery, warranty, FAQ, about and contacts: the same texts as on the website. */
export default function InfoScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { t, locale } = useT();
  const { config } = useShop();
  const page = config?.pages.find((item) => item.slug === slug);

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <TopBar title={page?.title} />
      {!config || !page ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={{ padding: GUTTER, paddingBottom: insets.bottom + 40, gap: 14 }}>
          <Txt variant="muted">{page.lead}</Txt>

          {slug === "delivery" && (
            <Glass style={{ padding: 18 }}>
              {config.zones.map((zone, index) => (
                <View key={zone.slug} style={{ flexDirection: "row", paddingVertical: 10, borderTopWidth: index ? 1 : 0, borderTopColor: c.hairline }}>
                  <View style={{ flex: 1 }}>
                    <Txt>{zone.name}</Txt>
                    <Txt variant="faint">{fill(t.checkout.days, { n: zone.days })}</Txt>
                  </View>
                  <Txt style={{ fontWeight: "600", color: zone.fee ? c.text : c.accent }}>{zone.fee ? sum(zone.fee, locale) : t.checkout.free}</Txt>
                </View>
              ))}
            </Glass>
          )}

          {slug === "contacts" && (
            <Glass style={{ paddingVertical: 6 }}>
              {[
                { label: t.checkout.phone, value: config.contacts.phone, href: config.contacts.phoneHref },
                { label: "Telegram", value: "Telegram", href: config.contacts.telegram },
                { label: "E-mail", value: config.contacts.email, href: `mailto:${config.contacts.email}` },
                { label: t.checkout.zone, value: config.contacts.address },
                { label: "⏱", value: config.contacts.hours },
              ].map((row, index) => (
                <Pressable
                  key={row.value}
                  disabled={!row.href}
                  onPress={() => row.href && Linking.openURL(row.href)}
                  style={{ paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: index ? 1 : 0, borderTopColor: c.hairline }}
                >
                  <Txt variant="faint">{row.label}</Txt>
                  <Txt style={{ fontWeight: "500", color: row.href ? c.accent : c.text }}>{row.value}</Txt>
                </Pressable>
              ))}
            </Glass>
          )}

          {page.sections.map((section) => (
            <Glass key={section.heading} style={{ padding: 18, gap: 8 }}>
              <Txt variant="h2" style={{ fontSize: 18 }}>
                {section.heading}
              </Txt>
              {section.list.map((item) => (
                <View key={item} style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent, marginTop: 8 }} />
                  <Txt variant="muted" style={{ flex: 1 }}>
                    {item}
                  </Txt>
                </View>
              ))}
              {section.paragraphs.map((text) => (
                <Txt key={text} variant="muted">
                  {text}
                </Txt>
              ))}
            </Glass>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
