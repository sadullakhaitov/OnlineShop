import { and, eq, ne, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { customers, telegramAccounts, type Customer, type TelegramAccount } from "@/db/schema";
import { normalizePhone } from "@/lib/phone";
import { startSession } from "@/server/auth";
import { localeOf, type TelegramUser } from "./init-data";

/** People who use the shop through Telegram, and their link to a customer. */

export async function saveTelegramUser(db: Db, user: TelegramUser, now = new Date()): Promise<TelegramAccount> {
  const [account] = await db
    .insert(telegramAccounts)
    .values({
      id: user.id,
      firstName: user.firstName || null,
      username: user.username ?? null,
      locale: localeOf(user.languageCode),
      createdAt: now,
      updatedAt: now,
    })
    // The language stays as the user chose it in the bot.
    .onConflictDoUpdate({
      target: telegramAccounts.id,
      set: { firstName: user.firstName || null, username: user.username ?? null, updatedAt: now },
    })
    .returning();
  return account;
}

/** The user wrote to the bot, so it may write back; or Telegram said it may not. */
export async function setReachable(db: Db, id: number, reachable: boolean): Promise<void> {
  await db.update(telegramAccounts).set({ reachable, updatedAt: new Date() }).where(eq(telegramAccounts.id, id));
}

export async function setTelegramLocale(db: Db, id: number, locale: "uz" | "ru"): Promise<void> {
  await db.update(telegramAccounts).set({ locale, updatedAt: new Date() }).where(eq(telegramAccounts.id, id));
}

export async function getTelegramAccount(db: Db, id: number): Promise<(TelegramAccount & { phone: string | null }) | null> {
  const [row] = await db
    .select({ account: telegramAccounts, phone: customers.phone })
    .from(telegramAccounts)
    .leftJoin(customers, eq(customers.id, telegramAccounts.customerId))
    .where(eq(telegramAccounts.id, id));
  return row ? { ...row.account, phone: row.phone } : null;
}

export type LinkResult = { ok: true; customer: Customer } | { ok: false; error: "phone" };

/**
 * Links the Telegram user to the customer with the phone number they shared
 * (Telegram has confirmed the number is theirs). A number belongs to one
 * Telegram account at a time, so an older link to it is dropped.
 */
export async function linkTelegramPhone(
  db: Db,
  user: Pick<TelegramUser, "id" | "firstName" | "lastName">,
  sharedPhone: string,
  now = new Date(),
): Promise<LinkResult> {
  // Only Uzbek numbers: the shop delivers in Bukhara and signs in with them.
  const phone = normalizePhone(sharedPhone);
  if (!phone) return { ok: false, error: "phone" };
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim().slice(0, 80);

  const customer = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(customers)
      .values({ phone, name: name || null })
      .onConflictDoUpdate({ target: customers.phone, set: { name: sql`coalesce(${customers.name}, excluded.name)` } })
      .returning();
    await tx
      .update(telegramAccounts)
      .set({ customerId: null, updatedAt: now })
      .where(and(eq(telegramAccounts.customerId, row.id), ne(telegramAccounts.id, user.id)));
    await tx
      .insert(telegramAccounts)
      .values({ id: user.id, customerId: row.id, firstName: user.firstName || null, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: telegramAccounts.id, set: { customerId: row.id, updatedAt: now } });
    return row;
  });
  return { ok: true, customer };
}

/** Starts a session for a Telegram user whose phone number is known. */
export async function signInTelegramUser(db: Db, id: number, now = new Date()) {
  const account = await getTelegramAccount(db, id);
  if (!account?.phone) return null;
  const phone = account.phone;
  return db.transaction((tx) => startSession(tx, phone, now, account.firstName ?? undefined));
}
