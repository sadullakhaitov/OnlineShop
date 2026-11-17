import type { OrderWithItems } from "@/server/orders";
import { categories } from "@/data/categories";
import { kinds, type Product } from "@/data/products";
import type { Locale } from "@/i18n/routing";
import type { Catalog } from "@/lib/catalog";

/**
 * What the mobile app receives. The shapes are kept flat and already in the
 * customer's language, so the app does no lookups of its own.
 */

export type MobileProduct = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  category: string;
  brand: string;
  art: string;
  price: number;
  oldPrice: number | null;
  badge: "hit" | "new" | null;
  rating: number;
  reviews: number;
  inStock: boolean;
  /** Product photo link, or null: the app then shows the drawing of `art`. */
  image: string | null;
};

export function toMobileProduct(product: Product, locale: Locale): MobileProduct {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    kind: kinds[product.art].name[locale],
    category: product.category,
    brand: product.brand,
    art: product.art,
    price: product.price,
    oldPrice: product.oldPrice ?? null,
    badge: product.badge ?? null,
    rating: product.rating,
    reviews: product.reviews,
    inStock: product.inStock,
    image: product.image ?? null,
  };
}

export function mobileCatalog(catalog: Catalog, locale: Locale) {
  const counts = catalog.categoryCounts();
  return {
    categories: categories
      .filter((category) => counts[category.slug])
      .map((category) => ({ slug: category.slug, icon: category.icon, name: category.name[locale], count: counts[category.slug] })),
    // Already in the shop's "popular" order; the app sorts and filters on the phone.
    products: catalog.find({ sort: "popular" }).map((product) => toMobileProduct(product, locale)),
  };
}

export function mobileOrder(order: OrderWithItems, payUrl: string | null) {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    deliveryType: order.deliveryType,
    zone: order.zone,
    address: order.address,
    name: order.name,
    phone: order.phone,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    createdAt: order.createdAt.toISOString(),
    payUrl,
    items: order.items.map((item) => ({
      productId: item.productId,
      slug: item.slug,
      title: item.title,
      art: item.art,
      price: item.price,
      quantity: item.quantity,
    })),
  };
}

export function localeParam(value: string | null): Locale {
  return value === "ru" ? "ru" : "uz";
}
