"use client";

import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

/**
 * False on the server and during hydration, true afterwards. Data kept in the
 * browser (cart, favourites) is only known once this turns true.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}
