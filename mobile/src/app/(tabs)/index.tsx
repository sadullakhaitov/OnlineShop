import { router } from "expo-router";
import { Search, ShieldCheck, Truck } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductGrid } from "@/components/Grid";
import { ProductCard } from "@/components/ProductCard";
import { Backdrop, Glass, LoadError, Loading, Txt } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { GUTTER, TAB_BAR_SPACE } from "@/lib/layout";
import { useShop } from "@/lib/shop";
import { usePalette } from "@/lib/theme";

export default function Home() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const shop = useShop();
  const products = shop.products ?? [];
  const deals = products.filter((p) => p.oldPrice && p.inStock).slice(0, 8);

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: TAB_BAR_SPACE + insets.bottom, gap: 22 }}>
        <View style={{ paddingHorizontal: GUTTER, gap: 8 }}>
          <Txt variant="title">
            multi<Txt variant="title" style={{ color: c.accent }}>media</Txt>
          </Txt>
          <Txt variant="h2" style={{ marginTop: 6 }}>
            {t.home.hello}
          </Txt>
          <Txt variant="muted">{t.home.lead}</Txt>
        </View>

        <Pressable onPress={() => router.push({ pathname: "/catalog", params: { focus: "1" } })} style={{ paddingHorizontal: GUTTER }}>
          <Glass radius={999} style={{ height: 50, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, gap: 10 }}>
            <Search size={19} color={c.muted} strokeWidth={1.9} />
            <Txt variant="muted">{t.home.search}</Txt>
          </Glass>
        </Pressable>

        <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: GUTTER }}>
          {[
            { icon: Truck, title: t.home.delivery, text: t.home.deliveryText, page: "delivery" },
            { icon: ShieldCheck, title: t.home.warranty, text: t.home.warrantyText, page: "warranty" },
          ].map(({ icon: Icon, title, text, page }) => (
            <Pressable key={page} style={{ flex: 1 }} onPress={() => router.push({ pathname: "/info/[slug]", params: { slug: page } })}>
              <Glass style={{ padding: 14, gap: 8 }} radius={22}>
                <Icon size={22} color={c.accent} strokeWidth={1.8} />
                <Txt style={{ fontWeight: "600", fontSize: 14 }}>{title}</Txt>
                <Txt variant="small">{text}</Txt>
              </Glass>
            </Pressable>
          ))}
        </View>

        {shop.failed && !shop.products ? (
          <View style={{ paddingHorizontal: GUTTER }}>
            <LoadError onRetry={shop.reload} />
          </View>
        ) : !shop.products ? (
          <Loading />
        ) : (
          <>
            <Section title={t.home.categories}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 10 }}>
                {shop.categories.map((category) => (
                  <Pressable
                    key={category.slug}
                    onPress={() => router.push({ pathname: "/catalog", params: { category: category.slug } })}
                  >
                    <Glass radius={20} style={{ paddingVertical: 14, paddingHorizontal: 16, minWidth: 128, gap: 4 }}>
                      <Txt style={{ fontWeight: "600", fontSize: 14.5 }}>{category.name}</Txt>
                      <Txt variant="faint">{category.count}</Txt>
                    </Glass>
                  </Pressable>
                ))}
              </ScrollView>
            </Section>

            {deals.length > 0 && (
              <Section title={t.home.deals} onSeeAll={() => router.push({ pathname: "/catalog", params: { sale: "1" } })}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 12 }}>
                  {deals.map((product) => (
                    <ProductCard key={product.id} product={product} width={172} />
                  ))}
                </ScrollView>
              </Section>
            )}

            <Section title={t.home.popular} onSeeAll={() => router.push("/catalog")}>
              <View style={{ paddingHorizontal: GUTTER }}>
                <ProductGrid products={products.slice(0, 8)} />
              </View>
            </Section>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ title, onSeeAll, children }: { title: string; onSeeAll?: () => void; children: React.ReactNode }) {
  const c = usePalette();
  const { t } = useT();
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: GUTTER }}>
        <Txt variant="h2">{title}</Txt>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} hitSlop={8}>
            <Txt style={{ color: c.accent, fontWeight: "600", fontSize: 14 }}>{t.common.seeAll}</Txt>
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}
