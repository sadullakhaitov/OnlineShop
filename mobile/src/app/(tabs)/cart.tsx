import { Link, router } from "expo-router";
import { ShoppingCart, Trash2 } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tap } from "@/components/ProductCard";
import { Quantity } from "@/components/Quantity";
import { Backdrop, Button, Empty, Glass, Loading, ProductImage, Txt } from "@/components/ui";
import { sum } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { GUTTER, TAB_BAR_SPACE } from "@/lib/layout";
import { useShop } from "@/lib/shop";
import { usePalette } from "@/lib/theme";

export default function Cart() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { t, locale } = useT();
  const shop = useShop();

  const lines = shop.cart.map((line) => ({ ...line, product: shop.byId(line.id) }));
  const available = lines.filter((line) => line.product?.inStock);
  const subtotal = available.reduce((total, line) => total + line.product!.price * line.quantity, 0);

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: GUTTER, paddingBottom: TAB_BAR_SPACE + insets.bottom + 90, gap: 12 }}>
        <Txt variant="title" style={{ marginBottom: 4 }}>
          {t.cart.title}
        </Txt>
        {shop.cart.length === 0 ? (
          <Empty
            icon={<ShoppingCart size={28} color={c.accent} />}
            title={t.cart.empty}
            text={t.cart.emptyText}
            action={<Button title={t.cart.toCatalog} onPress={() => router.navigate("/catalog")} />}
          />
        ) : !shop.products ? (
          <Loading />
        ) : (
          lines.map(({ id, quantity, product }) => (
            <Glass key={id} style={{ padding: 10, flexDirection: "row", gap: 12, opacity: product?.inStock ? 1 : 0.6 }}>
              {product ? (
                <Link href={{ pathname: "/product/[slug]", params: { slug: product.slug } }} asChild>
                  <Pressable>
                    <ProductImage art={product.art} image={product.image} size={88} />
                  </Pressable>
                </Link>
              ) : (
                <View style={{ width: 88, height: 88 }} />
              )}
              <View style={{ flex: 1, gap: 4, justifyContent: "space-between" }}>
                <View>
                  <Txt variant="faint">{product?.kind}</Txt>
                  <Txt style={{ fontWeight: "600", fontSize: 14.5 }} numberOfLines={2}>
                    {product?.title ?? id}
                  </Txt>
                </View>
                {product?.inStock ? (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Txt style={{ fontWeight: "700", fontSize: 15 }}>{sum(product.price * quantity, locale)}</Txt>
                    <Quantity value={quantity} onChange={(value) => shop.setQuantity(id, value)} />
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Txt variant="small" style={{ color: c.danger }}>
                      {t.cart.gone}
                    </Txt>
                    <Pressable accessibilityLabel={t.cart.remove} onPress={() => shop.setQuantity(id, 0)} hitSlop={8}>
                      <Trash2 size={18} color={c.muted} />
                    </Pressable>
                  </View>
                )}
              </View>
            </Glass>
          ))
        )}
      </ScrollView>

      {available.length > 0 && (
        <View style={{ position: "absolute", left: 12, right: 12, bottom: Math.max(insets.bottom, 10) + 78 }}>
          <Glass strong radius={30} style={{ padding: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Txt variant="faint">{t.cart.subtotal}</Txt>
              <Txt style={{ fontSize: 17, fontWeight: "700" }}>{sum(subtotal, locale)}</Txt>
            </View>
            <Button
              title={t.cart.checkout}
              onPress={() => {
                tap();
                router.push("/checkout");
              }}
            />
          </Glass>
        </View>
      )}
    </View>
  );
}
