import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { and, count, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { customers, orders, otpCodes, sessions, type Customer } from "@/db/schema";

/**
 * Signing in with a phone number and a one-time SMS code.
 * The cookie only carries a random token; the database keeps its hash.
 */

export const CODE_LENGTH = 6;
/** A code works for 5 minutes and survives 5 wrong guesses. */
const CODE_LIFETIME = 5 * 60_000;
const MAX_ATTEMPTS = 5;
/** A new code may be requested once a minute, 5 times an hour per phone. */
export const RESEND_AFTER = 60;
const MAX_CODES_PER_HOUR = 5;
const MAX_CODES_PER_HOUR_FROM_ADDRESS = 20;
const HOUR = 60 * 60_000;

export const SESSION_LIFETIME = 30 * 24 * HOUR;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const hashCode = (phone: string, code: string) => sha256(`${phone}:${code}`);

export type RequestCodeResult =
  | { ok: true; code: string }
  /** Asked again too soon; `retryAfter` is in seconds. */
  | { ok: false; error: "wait"; retryAfter: number }
  | { ok: false; error: "limit" };

/** Creates a sign-in code for the phone. Sending it is the caller's job. */
export async function requestCode(
  db: Db,
  phone: string,
  addressHash: string | null,
  now: Date = new Date(),
): Promise<RequestCodeResult> {
  const hourAgo = new Date(now.getTime() - HOUR);

  // Old codes are of no use to anyone.
  await db.delete(otpCodes).where(lt(otpCodes.createdAt, new Date(now.getTime() - 24 * HOUR)));

  const recent = await db
    .select({ createdAt: otpCodes.createdAt })
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), gt(otpCodes.createdAt, hourAgo)))
    .orderBy(desc(otpCodes.createdAt));

  if (recent.length > 0) {
    const elapsed = (now.getTime() - recent[0].createdAt.getTime()) / 1000;
    if (elapsed < RESEND_AFTER) return { ok: false, error: "wait", retryAfter: Math.ceil(RESEND_AFTER - elapsed) };
  }
  if (recent.length >= MAX_CODES_PER_HOUR) return { ok: false, error: "limit" };

  if (addressHash) {
    const [fromAddress] = await db
      .select({ value: count() })
      .from(otpCodes)
      .where(and(eq(otpCodes.ipHash, addressHash), gt(otpCodes.createdAt, hourAgo)));
    if (fromAddress.value >= MAX_CODES_PER_HOUR_FROM_ADDRESS) return { ok: false, error: "limit" };
  }

  const code = String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
  await db.insert(otpCodes).values({
    phone,
    codeHash: hashCode(phone, code),
    ipHash: addressHash,
    createdAt: now,
    expiresAt: new Date(now.getTime() + CODE_LIFETIME),
  });
  return { ok: true, code };
}

export type VerifyCodeResult =
  | { ok: true; token: string; customer: Customer }
  | { ok: false; error: "invalid" | "expired" | "attempts" };

/** Checks the code and, when it is right, signs the customer in. */
export async function verifyCode(
  db: Db,
  phone: string,
  code: string,
  now: Date = new Date(),
): Promise<VerifyCodeResult> {
  // Only the newest code counts.
  const [latest] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), isNull(otpCodes.usedAt)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!latest || latest.expiresAt <= now) return { ok: false, error: "expired" };

  // Count the attempt first, in one statement, so that parallel guesses
  // cannot get more tries than allowed.
  const [counted] = await db
    .update(otpCodes)
    .set({ attempts: sql`${otpCodes.attempts} + 1` })
    .where(and(eq(otpCodes.id, latest.id), lt(otpCodes.attempts, MAX_ATTEMPTS), isNull(otpCodes.usedAt)))
    .returning({ attempts: otpCodes.attempts });
  if (!counted) return { ok: false, error: "attempts" };

  const given = Buffer.from(hashCode(phone, code));
  const expected = Buffer.from(latest.codeHash);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, error: counted.attempts >= MAX_ATTEMPTS ? "attempts" : "invalid" };
  }

  return db.transaction(async (tx) => {
    await tx.update(otpCodes).set({ usedAt: now }).where(eq(otpCodes.id, latest.id));

    // The first sign-in creates the customer.
    let [customer] = await tx
      .insert(customers)
      .values({ phone })
      .onConflictDoUpdate({ target: customers.phone, set: { phone } })
      .returning();

    // Orders placed with this phone before signing in now belong to the account,
    // and the newest of them tells us how to address the customer.
    const adopted = await tx
      .update(orders)
      .set({ customerId: customer.id })
      .where(and(eq(orders.phone, phone), isNull(orders.customerId)))
      .returning({ name: orders.name, createdAt: orders.createdAt });
    if (!customer.name && adopted.length > 0) {
      const newest = adopted.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
      [customer] = await tx
        .update(customers)
        .set({ name: newest.name })
        .where(eq(customers.id, customer.id))
        .returning();
    }

    await tx.delete(sessions).where(and(eq(sessions.customerId, customer.id), lt(sessions.expiresAt, now)));

    const token = randomBytes(32).toString("base64url");
    await tx.insert(sessions).values({
      tokenHash: sha256(token),
      customerId: customer.id,
      expiresAt: new Date(now.getTime() + SESSION_LIFETIME),
    });
    return { ok: true as const, token, customer };
  });
}

/** The customer this cookie token belongs to, if the session is still alive. */
export async function getCustomerByToken(db: Db, token: string, now: Date = new Date()): Promise<Customer | null> {
  const [row] = await db
    .select({ customer: customers })
    .from(sessions)
    .innerJoin(customers, eq(customers.id, sessions.customerId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, now)))
    .limit(1);
  return row?.customer ?? null;
}

export async function deleteSession(db: Db, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}

/** A one-way fingerprint of a network address, for rate limits only. */
export function hashAddress(address: string): string {
  return sha256(`address:${address}`).slice(0, 32);
}
