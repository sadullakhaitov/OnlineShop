import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Data that Telegram signs with the bot's token: the Mini App's launch data
 * (`initData`) and the phone number a user shares from the Mini App.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

export type TelegramUser = {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  /** The user allowed the bot to write to them. */
  allowsWriteToPm?: boolean;
};

/** Launch data stays valid for a day: long enough for a Mini App left open. */
const INIT_DATA_MAX_AGE = 24 * 60 * 60;

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

/**
 * The fields of signed data, or null when the signature is wrong or the data
 * is too old. `now` is in milliseconds.
 */
export function verifySignedData(raw: string, token: string, now = Date.now(), maxAge = INIT_DATA_MAX_AGE): Map<string, string> | null {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 8192) return null;
  const fields = new Map<string, string>();
  for (const [key, value] of new URLSearchParams(raw)) {
    if (fields.has(key)) return null;
    fields.set(key, value);
  }
  const hash = fields.get("hash");
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return null;

  const secret = hmac("WebAppData", token);
  const checkString = (skip: string[]) =>
    [...fields]
      .filter(([key]) => !skip.includes(key))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
  const given = Buffer.from(hash, "hex");
  const matches = (skip: string[]) => timingSafeEqual(hmac(secret, checkString(skip)), given);
  // Newer clients add a `signature` field; it is part of the signed string,
  // but some versions leave it out. Both variants need the bot's token.
  if (!matches(["hash"]) && !(fields.has("signature") && matches(["hash", "signature"]))) return null;

  const authDate = Number(fields.get("auth_date"));
  const seconds = now / 1000;
  if (!Number.isInteger(authDate) || authDate > seconds + 300 || seconds - authDate > maxAge) return null;
  return fields;
}

function readJson(value: string | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const data: unknown = JSON.parse(value);
    return typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const text = (value: unknown, max = 128) => (typeof value === "string" && value ? value.slice(0, max) : undefined);

export function toTelegramUser(data: Record<string, unknown> | null): TelegramUser | null {
  if (!data || !Number.isSafeInteger(data.id) || (data.id as number) <= 0 || data.is_bot === true) return null;
  return {
    id: data.id as number,
    firstName: text(data.first_name) ?? "",
    lastName: text(data.last_name),
    username: text(data.username, 64),
    languageCode: text(data.language_code, 16),
    allowsWriteToPm: data.allows_write_to_pm === true,
  };
}

/** The user who opened the Mini App. */
export function parseInitData(raw: string, token: string, now = Date.now()): TelegramUser | null {
  const fields = verifySignedData(raw, token, now);
  return fields ? toTelegramUser(readJson(fields.get("user"))) : null;
}

export type SharedContact = { userId: number; phone: string; firstName?: string; lastName?: string };

/**
 * The phone number a user shared from the Mini App, as Telegram returns it
 * to the page (signed like the launch data). Minutes old at most.
 */
export function parseSharedContact(raw: string, token: string, now = Date.now()): SharedContact | null {
  const fields = verifySignedData(raw, token, now, 10 * 60);
  const contact = readJson(fields?.get("contact"));
  if (!contact || !Number.isSafeInteger(contact.user_id) || typeof contact.phone_number !== "string") return null;
  return {
    userId: contact.user_id as number,
    phone: contact.phone_number,
    firstName: text(contact.first_name),
    lastName: text(contact.last_name),
  };
}

/** "ru" for Russian speakers, Uzbek for everyone else. */
export function localeOf(languageCode: string | undefined): "uz" | "ru" {
  return languageCode?.toLowerCase().startsWith("ru") ? "ru" : "uz";
}
