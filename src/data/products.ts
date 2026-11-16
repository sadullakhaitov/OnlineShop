import type { Locale } from "@/i18n/routing";

export type ArtKind =
  | "coffee"
  | "vacuum"
  | "robot"
  | "blender"
  | "airfryer"
  | "fridge"
  | "washer"
  | "tv"
  | "ac"
  | "oven"
  | "purifier"
  | "microwave";

export type ProductBadge = "hit" | "new";

export type Product = {
  id: string;
  slug: string;
  category: string;
  art: ArtKind;
  /** Product type, e.g. "Coffee machine" */
  type: Record<Locale, string>;
  /** Brand and model, same in every language */
  title: string;
  /** Price in UZS */
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  badge?: ProductBadge;
};

// Sample catalogue. Will be replaced by the database in the catalogue step.
export const products: Product[] = [
  {
    id: "p-001",
    slug: "delonghi-magnifica-s",
    category: "kitchen",
    art: "coffee",
    type: { uz: "Kofemashina", ru: "Кофемашина" },
    title: "DeLonghi Magnifica S",
    price: 6490000,
    oldPrice: 7290000,
    rating: 4.8,
    reviews: 286,
    badge: "hit",
  },
  {
    id: "p-002",
    slug: "dyson-v15-detect",
    category: "small-appliances",
    art: "vacuum",
    type: { uz: "Changyutgich", ru: "Пылесос" },
    title: "Dyson V15 Detect",
    price: 9990000,
    oldPrice: 11750000,
    rating: 4.9,
    reviews: 412,
  },
  {
    id: "p-003",
    slug: "xiaomi-robot-vacuum-s10",
    category: "small-appliances",
    art: "robot",
    type: { uz: "Robot-changyutgich", ru: "Робот-пылесос" },
    title: "Xiaomi Robot Vacuum S10",
    price: 3290000,
    rating: 4.7,
    reviews: 153,
    badge: "new",
  },
  {
    id: "p-004",
    slug: "philips-hr3752",
    category: "kitchen",
    art: "blender",
    type: { uz: "Blender", ru: "Блендер" },
    title: "Philips HR3752/00",
    price: 890000,
    oldPrice: 990000,
    rating: 4.8,
    reviews: 76,
  },
  {
    id: "p-005",
    slug: "tefal-easy-fry-grill",
    category: "kitchen",
    art: "airfryer",
    type: { uz: "Aerogril", ru: "Аэрогриль" },
    title: "Tefal Easy Fry & Grill",
    price: 1590000,
    rating: 4.7,
    reviews: 64,
  },
  {
    id: "p-006",
    slug: "samsung-rb37",
    category: "large-appliances",
    art: "fridge",
    type: { uz: "Muzlatgich", ru: "Холодильник" },
    title: "Samsung RB37 No Frost",
    price: 8990000,
    oldPrice: 9990000,
    rating: 4.9,
    reviews: 198,
    badge: "hit",
  },
  {
    id: "p-007",
    slug: "lg-f2j3",
    category: "large-appliances",
    art: "washer",
    type: { uz: "Kir yuvish mashinasi", ru: "Стиральная машина" },
    title: "LG F2J3 Steam 7 kg",
    price: 5490000,
    rating: 4.8,
    reviews: 231,
  },
  {
    id: "p-008",
    slug: "samsung-crystal-uhd-55",
    category: "tv-audio",
    art: "tv",
    type: { uz: "Televizor", ru: "Телевизор" },
    title: 'Samsung Crystal UHD 55"',
    price: 6790000,
    oldPrice: 7990000,
    rating: 4.8,
    reviews: 342,
  },
  {
    id: "p-009",
    slug: "artel-inverter-12",
    category: "climate",
    art: "ac",
    type: { uz: "Konditsioner", ru: "Кондиционер" },
    title: "Artel Inverter 12",
    price: 4390000,
    rating: 4.6,
    reviews: 119,
    badge: "new",
  },
  {
    id: "p-010",
    slug: "bosch-serie-4-hbf",
    category: "kitchen",
    art: "oven",
    type: { uz: "Duxovka shkafi", ru: "Духовой шкаф" },
    title: "Bosch Serie 4 HBF",
    price: 4990000,
    oldPrice: 5890000,
    rating: 4.9,
    reviews: 88,
  },
];
