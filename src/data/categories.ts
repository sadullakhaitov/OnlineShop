import type { Locale } from "@/i18n/routing";

export type CategoryIcon =
  | "large"
  | "small"
  | "kitchen"
  | "climate"
  | "tv"
  | "beauty"
  | "gadgets";

export type Category = {
  slug: string;
  icon: CategoryIcon;
  name: Record<Locale, string>;
};

export const categories: Category[] = [
  {
    slug: "large-appliances",
    icon: "large",
    name: { uz: "Yirik texnika", ru: "Крупная техника" },
  },
  {
    slug: "small-appliances",
    icon: "small",
    name: { uz: "Kichik texnika", ru: "Мелкая техника" },
  },
  {
    slug: "kitchen",
    icon: "kitchen",
    name: { uz: "Oshxona", ru: "Кухня" },
  },
  {
    slug: "climate",
    icon: "climate",
    name: { uz: "Iqlim texnikasi", ru: "Климат" },
  },
  {
    slug: "tv-audio",
    icon: "tv",
    name: { uz: "TV va audio", ru: "ТВ и аудио" },
  },
  {
    slug: "beauty-health",
    icon: "beauty",
    name: { uz: "Go'zallik va salomatlik", ru: "Красота и здоровье" },
  },
  {
    slug: "gadgets",
    icon: "gadgets",
    name: { uz: "Gadjetlar", ru: "Гаджеты" },
  },
];
