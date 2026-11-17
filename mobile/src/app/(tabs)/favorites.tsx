import { router } from "expo-router";
import { Heart } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductGrid } from "@/components/Grid";
import { Backdrop, Button, Empty, Loading, Txt } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { GUTTER, TAB_BAR_SPACE } from "@/lib/layout";
import { useShop } from "@/lib/shop";
import { usePalette } from "@/lib/theme";

export default function Favorites() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const shop = useShop();
  const products = shop.favorites.flatMap((id) => shop.byId(id) ?? []);

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: GUTTER, paddingBottom: TAB_BAR_SPACE + insets.bottom, gap: 16 }}>
        <Txt variant="title">{t.favorites.title}</Txt>
        {shop.favorites.length > 0 && !shop.products ? (
          <Loading />
        ) : products.length === 0 ? (
          <Empty
            icon={<Heart size={28} color={c.accent} />}
            title={t.favorites.empty}
            text={t.favorites.emptyText}
            action={<Button title={t.cart.toCatalog} onPress={() => router.navigate("/catalog")} />}
          />
        ) : (
          <ProductGrid products={products} />
        )}
      </ScrollView>
    </View>
  );
}
