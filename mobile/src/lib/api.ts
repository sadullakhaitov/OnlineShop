import Constants from "expo-constants";
import type { Locale } from "./i18n";

/**
 * The shop's server. Set EXPO_PUBLIC_API_URL while developing (for example
 * http://192.168.1.10:3000); the release build uses `extra.apiUrl` in app.json.
 */
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  "http://localhost:3000"
).replace(/\/+$/, "");

export type Product = {
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
};

export type ProductDetail = Product & {
  about: string;
  color: string;
  warranty: number;
  specs: { label: string; value: string }[];
};

export type Category = { slug: string; icon: string; name: string; count: number };

export type Zone = { slug: string; name: string; fee: number; days: number };

export type PaymentMethod = "payme" | "click" | "cash";

export type InfoPage = {
  slug: string;
  title: string;
  lead: string;
  sections: { heading: string; paragraphs: string[]; list: string[] }[];
};

export type ShopConfig = {
  zones: Zone[];
  freeDeliveryFrom: number;
  paymentMethods: PaymentMethod[];
  contacts: { phone: string; phoneHref: string; email: string; telegram: string; address: string; hours: string };
  pages: InfoPage[];
};

export type OrderStatus = "new" | "confirmed" | "delivering" | "delivered" | "cancelled";

export type Order = {
  id: string;
  number: number;
  status: OrderStatus;
  paymentStatus: "unpaid" | "paid" | "refunded";
  paymentMethod: PaymentMethod;
  deliveryType: "delivery" | "pickup";
  zone: string | null;
  address: string | null;
  name: string;
  phone: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
  payUrl: string | null;
  items: { productId: string; slug: string; title: string; art: string; price: number; quantity: number }[];
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown> | null,
  ) {
    super(`API ${status}`);
  }
}

let token: string | null = null;

/** The session token the requests carry; set by the auth provider. */
export function setApiToken(value: string | null) {
  token = value;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (init.body) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(API_URL + path, { ...init, headers: { ...headers, ...(init.headers as object) } });
  let body: Record<string, unknown> | null = null;
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

const post = <T,>(path: string, data: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data) });

export const api = {
  catalog: (locale: Locale) => request<{ categories: Category[]; products: Product[] }>(`/api/mobile/catalog?locale=${locale}`),
  product: (slug: string, locale: Locale) =>
    request<{ product: ProductDetail; related: Product[] }>(`/api/mobile/products/${encodeURIComponent(slug)}?locale=${locale}`),
  config: (locale: Locale) => request<ShopConfig>(`/api/mobile/config?locale=${locale}`),
  requestCode: (phone: string, locale: Locale) =>
    post<{ ok: true; resendAfter: number; demoCode?: string }>("/api/auth/code", { phone, locale }),
  verifyCode: (phone: string, code: string) => post<{ ok: true; token: string }>("/api/mobile/auth/verify", { phone, code }),
  logout: () => post<{ ok: true }>("/api/auth/logout", {}),
  me: (locale: Locale) =>
    request<{ customer: { name: string | null; phone: string }; orders: Order[] }>(`/api/mobile/me?locale=${locale}`),
  order: (id: string, locale: Locale) => request<{ order: Order }>(`/api/mobile/orders/${id}?locale=${locale}`),
  placeOrder: (data: unknown) => post<{ ok: true; id: string; number: number; payUrl: string | null }>("/api/orders", data),
};

/** The product drawing until real photos are uploaded. */
export function artUrl(art: string): string {
  return `${API_URL}/art/${art}.svg`;
}

/** Pay links of the demo mode are relative to the site. */
export function absoluteUrl(url: string): string {
  return url.startsWith("/") ? API_URL + url : url;
}
