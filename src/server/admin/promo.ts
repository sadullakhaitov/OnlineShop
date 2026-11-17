import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db";
import { promoCodes, type PromoCode } from "@/db/schema";
import { normalizeCode } from "@/server/promo";

export type PromoField = "code" | "value" | "minTotal" | "maxUses" | "expiresAt";

const schema = z
  .object({
    code: z.string(),
    kind: z.enum(["percent", "amount"]),
    value: z.coerce.number().int().min(1).max(1_000_000_000),
    minTotal: z.coerce.number().int().min(0).max(1_000_000_000),
    maxUses: z.coerce.number().int().min(1).max(1_000_000).nullable(),
    /** A day, "2026-12-31": the code works through the end of it (Tashkent time). */
    expiresAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "percent" && value.value > 90) ctx.addIssue({ code: "custom", path: ["value"], message: "percent" });
  });

export type PromoResult = { ok: true } | { ok: false; error: "invalid"; fields: PromoField[] } | { ok: false; error: "taken" };

/** Adds a code from the admin form. */
export async function createPromo(db: Db, raw: Record<string, unknown>, now = new Date()): Promise<PromoResult> {
  const code = normalizeCode(raw.code);
  const parsed = schema.safeParse({
    ...raw,
    maxUses: raw.maxUses === "" || raw.maxUses == null ? null : raw.maxUses,
    expiresAt: raw.expiresAt === "" || raw.expiresAt == null ? null : raw.expiresAt,
  });
  const fields = new Set<PromoField>(parsed.success ? [] : parsed.error.issues.map((issue) => issue.path[0] as PromoField));
  if (!code) fields.add("code");
  // End of the chosen day in Tashkent (UTC+5).
  const expiresAt = parsed.success && parsed.data.expiresAt ? new Date(`${parsed.data.expiresAt}T23:59:59+05:00`) : null;
  if (expiresAt && expiresAt <= now) fields.add("expiresAt");
  if (!parsed.success || !code || fields.size > 0) return { ok: false, error: "invalid", fields: [...fields] };

  const inserted = await db
    .insert(promoCodes)
    .values({ ...parsed.data, code, expiresAt })
    .onConflictDoNothing()
    .returning({ code: promoCodes.code });
  return inserted.length > 0 ? { ok: true } : { ok: false, error: "taken" };
}

export async function listPromos(db: Db): Promise<PromoCode[]> {
  return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
}

export async function setPromoActive(db: Db, code: string, active: boolean): Promise<void> {
  await db.update(promoCodes).set({ active }).where(eq(promoCodes.code, code));
}

/** Orders keep the code's name, so deleting it changes no order. */
export async function deletePromo(db: Db, code: string): Promise<void> {
  await db.delete(promoCodes).where(eq(promoCodes.code, code));
}
