import type { Localized } from "./products";

/**
 * Where we deliver: Bukhara city and the districts of Bukhara region.
 * The fees and the free-delivery threshold are placeholders until the shop
 * sets its real tariffs.
 */
export type DeliveryZone = {
  slug: string;
  name: Localized;
  /** Delivery fee in so'm */
  fee: number;
  /** Delivery time in days, at most */
  days: number;
};

export const deliveryZones: DeliveryZone[] = [
  { slug: "buxoro-shahri", name: { uz: "Buxoro shahri", ru: "г. Бухара" }, fee: 0, days: 1 },
  { slug: "kogon-shahri", name: { uz: "Kogon shahri", ru: "г. Каган" }, fee: 30_000, days: 1 },
  { slug: "buxoro-tumani", name: { uz: "Buxoro tumani", ru: "Бухарский район" }, fee: 30_000, days: 1 },
  { slug: "kogon-tumani", name: { uz: "Kogon tumani", ru: "Каганский район" }, fee: 30_000, days: 1 },
  { slug: "vobkent", name: { uz: "Vobkent tumani", ru: "Вабкентский район" }, fee: 40_000, days: 2 },
  { slug: "jondor", name: { uz: "Jondor tumani", ru: "Жондорский район" }, fee: 40_000, days: 2 },
  { slug: "romitan", name: { uz: "Romitan tumani", ru: "Ромитанский район" }, fee: 40_000, days: 2 },
  { slug: "gijduvon", name: { uz: "G'ijduvon tumani", ru: "Гиждуванский район" }, fee: 50_000, days: 2 },
  { slug: "shofirkon", name: { uz: "Shofirkon tumani", ru: "Шафирканский район" }, fee: 50_000, days: 2 },
  { slug: "peshku", name: { uz: "Peshku tumani", ru: "Пешкунский район" }, fee: 50_000, days: 2 },
  { slug: "qorakol", name: { uz: "Qorako'l tumani", ru: "Каракульский район" }, fee: 60_000, days: 2 },
  { slug: "qorovulbozor", name: { uz: "Qorovulbozor tumani", ru: "Караулбазарский район" }, fee: 60_000, days: 2 },
  { slug: "olot", name: { uz: "Olot tumani", ru: "Алатский район" }, fee: 70_000, days: 2 },
];

/** Orders from this amount are delivered free of charge to any zone. */
export const FREE_DELIVERY_FROM = 5_000_000;

export function getDeliveryZone(slug?: string | null): DeliveryZone | undefined {
  return deliveryZones.find((zone) => zone.slug === slug);
}

export function deliveryFee(zone: DeliveryZone, subtotal: number): number {
  return subtotal >= FREE_DELIVERY_FROM ? 0 : zone.fee;
}
