"use client";

import { whenWebApp } from "./telegram";

export type Spot = { lat: number; lng: number };
export type LocateResult = { ok: true; spot: Spot } | { ok: false; reason: "denied" | "unavailable" };

/**
 * The customer's own spot. Inside Telegram the app asks through Telegram,
 * which phones allow more readily; elsewhere, and when that fails, the browser asks.
 */
export async function locate(): Promise<LocateResult> {
  const app = window.Telegram?.WebApp ? await whenWebApp(1500) : null;
  const manager = app?.isVersionAtLeast("8.0") ? app.LocationManager : undefined;
  if (manager) {
    const viaTelegram = await new Promise<LocateResult | null>((resolve) => {
      const ask = () => {
        if (!manager.isLocationAvailable) return resolve(null);
        manager.getLocation((data) =>
          resolve(data ? { ok: true, spot: { lat: data.latitude, lng: data.longitude } } : { ok: false, reason: "denied" }),
        );
      };
      if (manager.isInited) ask();
      else manager.init(ask);
      setTimeout(() => resolve(null), 20_000);
    });
    if (viaTelegram) return viaTelegram;
  }

  if (!("geolocation" in navigator)) return { ok: false, reason: "unavailable" };
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ ok: true, spot: { lat: position.coords.latitude, lng: position.coords.longitude } }),
      (error) => resolve({ ok: false, reason: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  });
}
