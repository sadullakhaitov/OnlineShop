import { router, useLocalSearchParams } from "expo-router";
import { Heart, ShieldCheck, ShoppingCart, Star } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard, tap } from "@/components/ProductCard";
import { Backdrop, Button, Glass, LoadError, Loading, ProductImage, RoundButton, TopBar, Txt } from "@/components/ui";
import { api, ApiError, type Product, type ProductDetail } from "@/lib/api";
import { discountPercent, sum } from "@/lib/format";
import { fill, useT } from "@/lib/i18n";
import { GUTTER } from "@/lib/layout";
import { useShop } from "@/lib/shop";
import { usePalette } from "@/lib/theme";

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { t, locale } = useT();
  const shop = useShop();
  const [data, setData] = useState<{ product: ProductDetail; related: Product[] } | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "failed">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    api
      .product(slug, locale)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setState("ready");
      })
      .catch((error) => !cancelled && setState(error instanceof ApiError && error.status === 404 ? "missing" : "failed"));
    return () => {
      cancelled = true;
    };
  }, [slug, locale, attempt]);

  const product = data?.product;
  const favorite = product ? shop.favorites.includes(product.id) : false;
  const inCart = product ? shop.cart.some((line) => line.id === product.id) : false;
  const discount = product ? discountPercent(product.price, product.oldPrice) : 0;

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <TopBar
        right={
          product && (
            <RoundButton
              label={t.tabs.favorites}
              onPress={() => {
                tap();
                shop.toggleFavorite(product.id);
              }}
            >
              <Heart size={20} color={favorite ? c.danger : c.text} fill={favorite ? c.danger : "transparent"} strokeWidth={1.8} />
            </RoundButton>
          )
        }
      />
      {state === "loading" ? (
        <Loading />
      ) : state === "failed" ? (
        <View style={{ padding: GUTTER }}>
          <LoadError onRetry={() => setAttempt((n) => n + 1)} />
        </View>
      ) : state === "missing" || !product ? (
        <View style={{ padding: GUTTER }}>
          <Txt variant="h2">{t.product.notFound}</Txt>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 130 + insets.bottom, gap: 16 }}>
            <Glass style={{ padding: 10 }}>
              <ProductImage art={product.art} style={{ width: "100%", aspectRatio: 1.1 }} />
            </Glass>

            <View style={{ gap: 6 }}>
              <Txt variant="small">
                {product.kind} · {product.brand}
              </Txt>
              <Txt variant="title" style={{ fontSize: 26 }}>
                {product.title}
              </Txt>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Star size={14} color={c.accent} fill={c.accent} />
                <Txt variant="small">
                  {product.rating.toFixed(1)} · {fill(t.common.reviews, { n: product.reviews })}
                </Txt>
                <Txt variant="small" style={{ color: product.inStock ? c.success : c.faint, marginLeft: 8 }}>
                  ● {product.inStock ? t.common.inStock : t.common.outOfStock}
                </Txt>
              </View>
            </View>

            <Glass style={{ padding: 18, gap: 4 }}>
              {product.oldPrice ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Txt variant="small" style={{ textDecorationLine: "line-through" }}>
                    {sum(product.oldPrice, locale)}
                  </Txt>
                  <View style={{ backgroundColor: c.danger, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Txt style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>−{discount}%</Txt>
                  </View>
                </View>
              ) : null}
              <Txt style={{ fontSize: 28, fontWeight: "700", letterSpacing: -0.6 }}>{sum(product.price, locale)}</Txt>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
                <ShieldCheck size={18} color={c.accent} strokeWidth={1.8} />
                <Txt variant="small">
                  {t.product.warranty}: {fill(t.product.warrantyValue, { n: product.warranty })} · {t.product.color}: {product.color}
                </Txt>
              </View>
            </Glass>

            <Glass style={{ padding: 18, gap: 8 }}>
              <Txt variant="h2">{t.product.about}</Txt>
              <Txt variant="muted">{product.about}</Txt>
            </Glass>

            {product.specs.length > 0 && (
              <Glass style={{ padding: 18 }}>
                <Txt variant="h2" style={{ marginBottom: 6 }}>
                  {t.product.specs}
                </Txt>
                {product.specs.map((spec, index) => (
                  <View
                    key={spec.label}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: 16,
                      paddingVertical: 11,
                      borderTopWidth: index ? 1 : 0,
                      borderTopColor: c.hairline,
                    }}
                  >
                    <Txt variant="small" style={{ flex: 1 }}>
                      {spec.label}
                    </Txt>
                    <Txt style={{ flex: 1, textAlign: "right", fontSize: 14, fontWeight: "500" }}>{spec.value}</Txt>
                  </View>
                ))}
              </Glass>
            )}

            {data!.related.length > 0 && (
              <View style={{ gap: 12 }}>
                <Txt variant="h2">{t.product.related}</Txt>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -GUTTER }} contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 12 }}>
                  {data!.related.map((item) => (
                    <ProductCard key={item.id} product={item} width={172} />
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          <View style={{ position: "absolute", left: 12, right: 12, bottom: Math.max(insets.bottom, 12) }}>
            <Glass strong radius={30} style={{ padding: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Txt variant="faint">{product.title}</Txt>
                <Txt style={{ fontSize: 17, fontWeight: "700" }}>{sum(product.price, locale)}</Txt>
              </View>
              {product.inStock ? (
                <Button
                  title={inCart ? t.product.goToCart : t.product.addToCart}
                  variant={inCart ? "accent" : "primary"}
                  icon={<ShoppingCart size={18} color={inCart ? "#fff" : c.btnText} strokeWidth={2} />}
                  onPress={() => {
                    tap();
                    if (inCart) router.navigate("/cart");
                    else shop.addToCart(product.id);
                  }}
                />
              ) : (
                <Txt variant="small" style={{ paddingRight: 14 }}>
                  {t.product.unavailable}
                </Txt>
              )}
            </Glass>
          </View>
        </>
      )}
    </View>
  );
}
