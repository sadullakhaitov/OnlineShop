"use client";

import { useSyncExternalStore } from "react";
import { MAX_LINES, MAX_QUANTITY } from "./limits";

/**
 * The cart lives in the browser (localStorage), so it works without an
 * account. It only stores product ids and quantities: names and prices always
 * come fresh from the server.
 */
export type CartItem = { id: string; quantity: number };

const KEY = "multimedia:cart";
const EVENT = "multimedia:cart-change";
const EMPTY: CartItem[] = [];

let cache: CartItem[] | null = null;

const clamp = (quantity: number) => Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity)));

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed)
      ? parsed
          .filter(
            (item): item is CartItem =>
              typeof item === "object" &&
              item !== null &&
              typeof item.id === "string" &&
              Number.isFinite(item.quantity),
          )
          .slice(0, MAX_LINES)
          .map((item) => ({ id: item.id, quantity: clamp(item.quantity) }))
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked; the change still holds for this page view.
  }
  cache = next;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  // Another tab changed the cart: drop the cache and re-read.
  const onStorage = () => {
    cache = null;
    callback();
  };
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function addToCart(id: string, quantity = 1) {
  const current = read();
  const existing = current.find((item) => item.id === id);
  if (existing) {
    setCartQuantity(id, existing.quantity + quantity);
  } else if (current.length < MAX_LINES) {
    write([...current, { id, quantity: clamp(quantity) }]);
  }
}

export function setCartQuantity(id: string, quantity: number) {
  write(read().map((item) => (item.id === id ? { id, quantity: clamp(quantity) } : item)));
}

export function removeFromCart(ids: string | string[]) {
  const gone = new Set(typeof ids === "string" ? [ids] : ids);
  write(read().filter((item) => !gone.has(item.id)));
}

/** Lines of the cart. Empty during server rendering. */
export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** How many pieces are in the cart. */
export function useCartCount(): number {
  return useCart().reduce((sum, item) => sum + item.quantity, 0);
}
