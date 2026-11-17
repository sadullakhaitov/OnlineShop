import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setApiToken, type Category, type Product, type ShopConfig } from "./api";
import { useSettings } from "./settings";
import { loadJson, saveJson, secret } from "./storage";

export type CartLine = { id: string; quantity: number };

export const MAX_QUANTITY = 10;

type Shop = {
  products: Product[] | null;
  categories: Category[];
  config: ShopConfig | null;
  failed: boolean;
  reload: () => void;
  byId: (id: string) => Product | undefined;

  cart: CartLine[];
  addToCart: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;

  favorites: string[];
  toggleFavorite: (id: string) => void;

  token: string | null;
  authReady: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
};

const ShopContext = createContext<Shop | null>(null);

/**
 * Everything the screens share: the catalogue (loaded once per language),
 * the cart and favourites (kept on the phone) and the sign-in token.
 */
export function ShopProvider({ children }: { children: ReactNode }) {
  const { locale } = useSettings();
  const [catalog, setCatalog] = useState<{ products: Product[]; categories: Category[] } | null>(null);
  const [config, setConfig] = useState<ShopConfig | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [stored, setStored] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    Promise.all([api.catalog(locale), api.config(locale)])
      .then(([nextCatalog, nextConfig]) => {
        if (cancelled) return;
        setCatalog(nextCatalog);
        setConfig(nextConfig);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [locale, attempt]);

  useEffect(() => {
    Promise.all([loadJson<CartLine[]>("cart", []), loadJson<string[]>("favorites", []), secret.get("token")]).then(
      ([savedCart, savedFavorites, savedToken]) => {
        setCart(savedCart);
        setFavorites(savedFavorites);
        setApiToken(savedToken);
        setToken(savedToken);
        setStored(true);
        setAuthReady(true);
      },
    );
  }, []);

  useEffect(() => {
    if (stored) saveJson("cart", cart);
  }, [cart, stored]);
  useEffect(() => {
    if (stored) saveJson("favorites", favorites);
  }, [favorites, stored]);

  const byIdMap = useMemo(() => new Map((catalog?.products ?? []).map((p) => [p.id, p])), [catalog]);

  const signIn = useCallback((value: string) => {
    setApiToken(value);
    setToken(value);
    secret.set("token", value);
  }, []);

  const signOut = useCallback(() => {
    api.logout().catch(() => {});
    setApiToken(null);
    setToken(null);
    secret.set("token", null);
  }, []);

  const value: Shop = {
    products: catalog?.products ?? null,
    categories: catalog?.categories ?? [],
    config,
    failed,
    reload: () => setAttempt((n) => n + 1),
    byId: (id) => byIdMap.get(id),

    cart,
    addToCart: (id) =>
      setCart((lines) =>
        lines.some((line) => line.id === id)
          ? lines.map((line) => (line.id === id ? { ...line, quantity: Math.min(MAX_QUANTITY, line.quantity + 1) } : line))
          : [...lines, { id, quantity: 1 }],
      ),
    setQuantity: (id, quantity) =>
      setCart((lines) =>
        quantity <= 0
          ? lines.filter((line) => line.id !== id)
          : lines.map((line) => (line.id === id ? { ...line, quantity: Math.min(MAX_QUANTITY, quantity) } : line)),
      ),
    clearCart: () => setCart([]),
    cartCount: cart.reduce((total, line) => total + line.quantity, 0),

    favorites,
    toggleFavorite: (id) => setFavorites((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids])),

    token,
    authReady,
    signIn,
    signOut,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): Shop {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error("useShop outside ShopProvider");
  return shop;
}
