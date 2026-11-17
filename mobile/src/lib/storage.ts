import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/** Plain settings: language, theme, cart, favourites. */
export async function loadJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown) {
  AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});
}

/**
 * The sign-in token lives in the phone's keychain. The web preview has no
 * keychain, so there it falls back to ordinary storage.
 */
export const secret = {
  async get(key: string): Promise<string | null> {
    try {
      return Platform.OS === "web" ? await AsyncStorage.getItem(key) : await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string | null) {
    try {
      if (Platform.OS === "web") {
        await (value ? AsyncStorage.setItem(key, value) : AsyncStorage.removeItem(key));
      } else {
        await (value ? SecureStore.setItemAsync(key, value) : SecureStore.deleteItemAsync(key));
      }
    } catch {
      // Not remembered: the customer signs in again next time.
    }
  },
};
