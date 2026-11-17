import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import type { Db, Tx } from "@/db";
import { promoCodes, type PromoCode } from "@/db/schema";
import { promoDiscount, type PromoTerms } from "@/lib/promo";

export { promoDiscount };

/** Codes are typed in any case and with stray spaces; they are kept upper case. */
export function normalizeCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z0-9_-]{3,30}$/.test(code) ? code : null;
}

export type PromoProblem = "unknown" | "expired" | "used" | "minTotal";

export type PromoCheck =
  | { ok: true; code: string; discount: number; terms: PromoTerms }
  | { ok: false; error: PromoProblem; minTotal?: number };


/** Whether the code can be used for goods worth `subtotal`, and what it saves. */
export function judgePromo(promo: PromoCode | undefined, subtotal: number, now = new Date()): PromoCheck {
  if (!promo || !promo.active) return { ok: false, error: "unknown" };
  if (promo.expiresAt && promo.expiresAt <= now) return { ok: false, error: "expired" };
  if (promo.maxUses !== null && promo.uses >= promo.maxUses) return { ok: false, error: "used" };
  if (subtotal < promo.minTotal) return { ok: false, error: "minTotal", minTotal: promo.minTotal };
  const terms: PromoTerms = { code: promo.code, kind: promo.kind, value: promo.value, minTotal: promo.minTotal };
  return { ok: true, code: promo.code, discount: promoDiscount(promo, subtotal), terms };
}

export async function checkPromo(db: Db | Tx, rawCode: unknown, subtotal: number, now = new Date()): Promise<PromoCheck> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "unknown" };
  const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.code, code)).limit(1);
  return judgePromo(promo, subtotal, now);
}

/**
 * Counts one use inside the order's transaction. False when the last use was
 * taken or the code ran out meanwhile, so two customers cannot share it.
 */
export async function takePromo(tx: Tx, code: string, now = new Date()): Promise<boolean> {
  const taken = await tx
    .update(promoCodes)
    .set({ uses: sql`${promoCodes.uses} + 1` })
    .where(
      and(
        eq(promoCodes.code, code),
        eq(promoCodes.active, true),
        or(isNull(promoCodes.maxUses), lt(promoCodes.uses, promoCodes.maxUses)),
        or(isNull(promoCodes.expiresAt), gt(promoCodes.expiresAt, now)),
      ),
    )
    .returning({ code: promoCodes.code });
  return taken.length > 0;
}

/** A cancelled order gives its use back. */
export async function returnPromo(tx: Tx, code: string | null): Promise<void> {
  if (!code) return;
  await tx
    .update(promoCodes)
    .set({ uses: sql`greatest(${promoCodes.uses} - 1, 0)` })
    .where(eq(promoCodes.code, code));
}
