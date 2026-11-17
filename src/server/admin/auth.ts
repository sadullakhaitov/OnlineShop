import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, count, eq, gt, lt, min } from "drizzle-orm";
import type { Db } from "@/db";
import { adminLoginAttempts, adminSessions } from "@/db/schema";
import { getAdminPassword } from "@/server/config";

/**
 * Signing in to the admin panel with the password from ADMIN_PASSWORD.
 * The cookie only carries a random token; the database keeps its hash.
 */

export const ADMIN_SESSION_LIFETIME = 7 * 24 * 60 * 60_000;

/** Wrong passwords are counted over this long… */
const WINDOW = 15 * 60_000;
/** …and this many are allowed from one address, and from everywhere together. */
const MAX_ATTEMPTS_FROM_ADDRESS = 5;
const MAX_ATTEMPTS_TOTAL = 60;
const DAY = 24 * 60 * 60_000;

const sha256 = (value: string) => createHash("sha256").update(value).digest();
const tokenHash = (token: string) => sha256(token).toString("hex");
/** Not the password itself: only tells whether a session was opened with the current one. */
const passwordFingerprint = (password: string) => sha256(`admin-password:${password}`).toString("hex").slice(0, 32);

export type AdminLoginResult =
  | { ok: true; token: string }
  | { ok: false; error: "password" }
  /** Too many wrong passwords; `retryAfter` is in seconds. */
  | { ok: false; error: "locked"; retryAfter: number }
  /** No usable ADMIN_PASSWORD on this site. */
  | { ok: false; error: "disabled" };

export async function adminLogin(
  db: Db,
  given: string,
  addressHash: string | null,
  now: Date = new Date(),
): Promise<AdminLoginResult> {
  const password = getAdminPassword();
  if (password.state !== "ready") return { ok: false, error: "disabled" };

  const address = addressHash ?? "unknown";
  const since = new Date(now.getTime() - WINDOW);
  await db.delete(adminLoginAttempts).where(lt(adminLoginAttempts.createdAt, new Date(now.getTime() - DAY)));

  // The attempt is written down before the password is looked at, so that a
  // burst of parallel guesses cannot get more tries than allowed.
  const [attempt] = await db
    .insert(adminLoginAttempts)
    .values({ ipHash: address, createdAt: now })
    .returning({ id: adminLoginAttempts.id });

  const recent = gt(adminLoginAttempts.createdAt, since);
  const [fromAddress] = await db
    .select({ value: count(), oldest: min(adminLoginAttempts.createdAt) })
    .from(adminLoginAttempts)
    .where(and(eq(adminLoginAttempts.ipHash, address), recent));
  const [total] = await db
    .select({ value: count(), oldest: min(adminLoginAttempts.createdAt) })
    .from(adminLoginAttempts)
    .where(recent);

  const locked =
    fromAddress.value > MAX_ATTEMPTS_FROM_ADDRESS ? fromAddress : total.value > MAX_ATTEMPTS_TOTAL ? total : null;
  if (locked) {
    // A refused try does not make the wait longer.
    await db.delete(adminLoginAttempts).where(eq(adminLoginAttempts.id, attempt.id));
    const until = (locked.oldest ?? now).getTime() + WINDOW;
    return { ok: false, error: "locked", retryAfter: Math.max(1, Math.ceil((until - now.getTime()) / 1000)) };
  }

  if (!timingSafeEqual(sha256(given), sha256(password.value))) return { ok: false, error: "password" };

  await db.delete(adminLoginAttempts).where(eq(adminLoginAttempts.ipHash, address));
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, now));

  const token = randomBytes(32).toString("base64url");
  await db.insert(adminSessions).values({
    tokenHash: tokenHash(token),
    passwordHash: passwordFingerprint(password.value),
    expiresAt: new Date(now.getTime() + ADMIN_SESSION_LIFETIME),
  });
  return { ok: true, token };
}

/** Is this cookie token a live admin session opened with the current password? */
export async function isAdminToken(db: Db, token: string, now: Date = new Date()): Promise<boolean> {
  const password = getAdminPassword();
  if (password.state !== "ready") return false;

  const [session] = await db
    .select({ passwordHash: adminSessions.passwordHash })
    .from(adminSessions)
    .where(and(eq(adminSessions.tokenHash, tokenHash(token)), gt(adminSessions.expiresAt, now)))
    .limit(1);
  return session?.passwordHash === passwordFingerprint(password.value);
}

export async function adminLogout(db: Db, token: string): Promise<void> {
  await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash(token)));
}
