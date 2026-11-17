import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { Check, Heart, Plus, Star } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { Product } from "@/lib/api";
import { discountPercent, sum } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { usePalette } from "@/lib/theme";
import { Glass, ProductImage } from "./ui";

export function tap() {
  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
}

export function ProductCard({ product, width }: { product: Product; width?: number }) {
  const c = usePalette();
  const { t, locale } = useT();
  const shop = useShop();
  const favorite = shop.favorites.includes(product.id);
  const inCart = shop.cart.some((line) => line.id === product.id);
  const discount = discountPercent(product.price, product.oldPrice);

  return (
    <View style={{ width }}>
    <Link href={{ pathname: "/product/[slug]", params: { slug: product.slug } }} asChild>
      <Pressable>
        <Glass style={{ padding: 8 }} radius={24}>
          <View>
            <ProductImage art={product.art} image={product.image} style={{ aspectRatio: 1, width: "100%", opacity: product.inStock ? 1 : 0.55 }} />
            <View style={styles.badges}>
              {discount > 0 && <Badge text={`−${discount}%`} color={c.danger} />}
              {product.badge === "hit" && <Badge text={t.common.hit} color={c.accent} />}
              {product.badge === "new" && <Badge text={t.common.new} color={c.success} />}
            </View>
            <Pressable
              accessibilityLabel={t.tabs.favorites}
              hitSlop={6}
              onPress={(event) => {
                event.preventDefault();
                tap();
                shop.toggleFavorite(product.id);
              }}
              style={styles.heart}
            >
              <Glass radius={999} style={styles.heartInner}>
                <Heart size={17} color={favorite ? c.danger : c.text} fill={favorite ? c.danger : "transparent"} strokeWidth={1.8} />
              </Glass>
            </Pressable>
            {product.inStock && (
              <Pressable
                accessibilityLabel={inCart ? t.product.inCart : t.product.addToCart}
                hitSlop={6}
                onPress={(event) => {
                  event.preventDefault();
                  tap();
                  if (!inCart) shop.addToCart(product.id);
                }}
                style={[styles.add, styles.addOnImage, { backgroundColor: inCart ? c.accent : c.btn }]}
              >
                {inCart ? <Check size={18} color="#fff" strokeWidth={2.4} /> : <Plus size={18} color={c.btnText} strokeWidth={2.4} />}
              </Pressable>
            )}
          </View>

          <View style={{ paddingHorizontal: 6, paddingTop: 10, paddingBottom: 4, gap: 3 }}>
            <Text style={{ color: c.faint, fontSize: 12 }} numberOfLines={1}>
              {product.kind}
            </Text>
            <Text style={{ color: c.text, fontSize: 14.5, fontWeight: "600", minHeight: 38 }} numberOfLines={2}>
              {product.title}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Star size={12} color={c.accent} fill={c.accent} />
              <Text style={{ color: c.muted, fontSize: 12 }}>
                {product.rating.toFixed(1)} · {product.reviews}
              </Text>
            </View>
            <View style={{ marginTop: 4 }}>
              <View>
                {product.oldPrice ? (
                  <Text style={{ color: c.faint, fontSize: 12, textDecorationLine: "line-through" }}>{sum(product.oldPrice, locale)}</Text>
                ) : null}
                <Text style={{ color: c.text, fontSize: 16, fontWeight: "700", letterSpacing: -0.3 }} numberOfLines={1}>
                  {sum(product.price, locale)}
                </Text>
              </View>
            </View>
            {!product.inStock && <Text style={{ color: c.faint, fontSize: 12, marginTop: 2 }}>{t.common.outOfStock}</Text>}
          </View>
        </Glass>
      </Pressable>
    </Link>
    </View>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ backgroundColor: color, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badges: { position: "absolute", top: 8, left: 8, gap: 4, alignItems: "flex-start" },
  heart: { position: "absolute", top: 8, right: 8 },
  heartInner: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  add: { width: 38, height: 38, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  addOnImage: { position: "absolute", right: 8, bottom: 8 },
});
