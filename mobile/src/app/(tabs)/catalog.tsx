import { useLocalSearchParams } from "expo-router";
import { Search, SearchX, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View, type TextInputInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductGrid } from "@/components/Grid";
import { Backdrop, Button, Chip, Empty, Glass, LoadError, Loading, Txt } from "@/components/ui";
import type { Product } from "@/lib/api";
import { fill, useT } from "@/lib/i18n";
import { GUTTER, TAB_BAR_SPACE } from "@/lib/layout";
import { useShop } from "@/lib/shop";
import { usePalette } from "@/lib/theme";

const sorts = ["popular", "price-asc", "price-desc", "rating", "new"] as const;
type Sort = (typeof sorts)[number];

const sorters: Record<Sort, (a: Product, b: Product) => number> = {
  popular: () => 0, // the server sends them in this order
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
  new: (a, b) => Number(b.badge === "new") - Number(a.badge === "new"),
};

/** Same matching as the website: every word must appear, apostrophes unified. */
const normalize = (text: string) => text.toLowerCase().replace(/[ʻʼ‘’`´]/g, "'");

export default function Catalog() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const shop = useShop();
  const params = useLocalSearchParams<{ category?: string; sale?: string; focus?: string }>();
  const input = useRef<TextInputInstance>(null);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>(params.category);
  const [sale, setSale] = useState(params.sale === "1");
  const [inStock, setInStock] = useState(false);
  const [sort, setSort] = useState<Sort>("popular");

  // Opened from the home screen with a section, "deals" or the search field.
  useEffect(() => {
    if (params.category !== undefined) setCategory(params.category);
    if (params.sale !== undefined) setSale(params.sale === "1");
    if (params.focus) setTimeout(() => input.current?.focus(), 300);
  }, [params.category, params.sale, params.focus]);

  const results = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    const categoryNames = new Map(shop.categories.map((item) => [item.slug, item.name]));
    return (shop.products ?? [])
      .filter((p) => {
        if (category && p.category !== category) return false;
        if (sale && !p.oldPrice) return false;
        if (inStock && !p.inStock) return false;
        if (words.length) {
          const haystack = normalize(`${p.title} ${p.kind} ${categoryNames.get(p.category) ?? ""}`);
          if (!words.every((word) => haystack.includes(word))) return false;
        }
        return true;
      })
      .sort(sorters[sort]);
  }, [shop.products, shop.categories, query, category, sale, inStock, sort]);

  const clear = () => {
    setQuery("");
    setCategory(undefined);
    setSale(false);
    setInStock(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <Backdrop />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: TAB_BAR_SPACE + insets.bottom }}
      >
        <Txt variant="title" style={{ paddingHorizontal: GUTTER, marginBottom: 12 }}>
          {t.catalog.title}
        </Txt>

        <View style={{ paddingHorizontal: GUTTER, paddingBottom: 10 }}>
          <Glass strong radius={999} style={{ height: 50, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 10 }}>
            <Search size={19} color={c.muted} strokeWidth={1.9} />
            <TextInput
              ref={input}
              value={query}
              onChangeText={setQuery}
              placeholder={t.catalog.search}
              placeholderTextColor={c.faint}
              returnKeyType="search"
              autoCorrect={false}
              style={{ flex: 1, fontSize: 16, color: c.text, height: "100%" }}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityLabel={t.catalog.clear}>
                <X size={18} color={c.muted} />
              </Pressable>
            ) : null}
          </Glass>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 8 }}>
          <Chip label={t.catalog.all} active={!category} onPress={() => setCategory(undefined)} />
          {shop.categories.map((item) => (
            <Chip key={item.slug} label={item.name} active={category === item.slug} onPress={() => setCategory(item.slug)} />
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 8, paddingTop: 8 }}
        >
          <Chip label={t.catalog.sale} active={sale} onPress={() => setSale(!sale)} />
          <Chip label={t.catalog.inStock} active={inStock} onPress={() => setInStock(!inStock)} />
          <View style={{ width: 1, backgroundColor: c.hairline, marginHorizontal: 4 }} />
          {sorts.map((key) => (
            <Chip key={key} label={t.catalog.sort[key]} active={sort === key} onPress={() => setSort(key)} />
          ))}
        </ScrollView>

        <View style={{ paddingHorizontal: GUTTER, paddingTop: 16, gap: 12 }}>
          {shop.failed && !shop.products ? (
            <LoadError onRetry={shop.reload} />
          ) : !shop.products ? (
            <Loading />
          ) : results.length === 0 ? (
            <Empty
              icon={<SearchX size={28} color={c.accent} />}
              title={t.catalog.empty}
              text={t.catalog.emptyText}
              action={<Button title={t.catalog.clear} variant="secondary" onPress={clear} />}
            />
          ) : (
            <>
              <Txt variant="small">{fill(t.catalog.count, { n: results.length })}</Txt>
              <ProductGrid products={results} />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
