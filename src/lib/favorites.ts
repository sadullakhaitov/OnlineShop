"use client";

import { useSyncExternalStore } from "react";

/**
 * Favourites live in the browser (localStorage) until customer accounts exist;
 * then they will sync with the account.
 */
const KEY = "multimedia:favorites";
const EVENT = "multimedia:favorites-change";
const EMPTY: string[] = [];

let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function subscribe(callback: () => void) {
  // Another tab changed the list: drop the cache and re-read.
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

export function toggleFavorite(id: string) {
  const current = read();
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked; the change still holds for this page view.
  }
  cache = next;
  window.dispatchEvent(new Event(EVENT));
}

/** Ids of favourite products. Empty during server rendering. */
export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
