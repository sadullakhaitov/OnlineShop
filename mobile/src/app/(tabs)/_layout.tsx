import { Tabs, type BottomTabBarProps } from "expo-router/tabs";
import { Heart, House, LayoutGrid, ShoppingCart, User } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tap } from "@/components/ProductCard";
import { Glass } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { useShop } from "@/lib/shop";
import { usePalette } from "@/lib/theme";

const icons = { index: House, catalog: LayoutGrid, cart: ShoppingCart, favorites: Heart, account: User };

/** A floating glass bar, like the website's bar on phones. */
function GlassTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const shop = useShop();
  const labels = { index: t.tabs.home, catalog: t.tabs.catalog, cart: t.tabs.cart, favorites: t.tabs.favorites, account: t.tabs.account };

  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <Glass strong radius={28} style={styles.bar}>
        {state.routes.map((route, index) => {
          const name = route.name as keyof typeof icons;
          const Icon = icons[name];
          if (!Icon) return null;
          const focused = state.index === index;
          const badge = name === "cart" ? shop.cartCount : name === "favorites" ? shop.favorites.length : 0;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={labels[name]}
              onPress={() => {
                tap();
                const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigateToTab(route.key);
              }}
              style={styles.item}
            >
              <View style={[styles.pill, focused && { backgroundColor: c.accentSoft }]}>
                <Icon size={22} color={focused ? c.accent : c.muted} strokeWidth={focused ? 2.1 : 1.7} />
                {badge > 0 && (
                  <View style={[styles.badge, { backgroundColor: name === "cart" ? c.accent : c.danger }]}>
                    <Text style={styles.badgeText}>{badge > 99 ? "99+" : badge}</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 10.5, marginTop: 2, color: focused ? c.text : c.muted, fontWeight: focused ? "600" : "400" }} numberOfLines={1}>
                {labels[name]}
              </Text>
            </Pressable>
          );
        })}
      </Glass>
    </View>
  );
}

export default function TabsLayout() {
  const c = usePalette();
  return (
    <Tabs
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="catalog" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="favorites" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12 },
  bar: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 6 },
  item: { flex: 1, alignItems: "center" },
  pill: { width: 52, height: 32, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -2,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10.5, fontWeight: "700" },
});
