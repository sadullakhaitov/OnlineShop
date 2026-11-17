import { useWindowDimensions, View } from "react-native";
import type { Product } from "@/lib/api";
import { GUTTER } from "@/lib/layout";
import { ProductCard } from "./ProductCard";

/** Two columns on phones, three on wide screens. */
export function ProductGrid({ products }: { products: Product[] }) {
  const { width } = useWindowDimensions();
  const columns = width >= 700 ? 3 : 2;
  const gap = 12;
  const cardWidth = (Math.min(width, 900) - GUTTER * 2 - gap * (columns - 1)) / columns;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap }}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} width={cardWidth} />
      ))}
    </View>
  );
}
