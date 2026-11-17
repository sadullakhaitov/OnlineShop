import { asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { databaseKind, getDb, type Db, type Tx } from "@/db";
import { installmentPlans } from "@/db/schema";
import { INSTALLMENT_LIMITS, type InstallmentTerms } from "@/lib/installment";
import { CATALOG_TAG } from "@/server/catalog";

export async function listPlans(db: Db | Tx): Promise<InstallmentTerms[]> {
  return db
    .select({ months: installmentPlans.months, markup: installmentPlans.markup })
    .from(installmentPlans)
    .orderBy(asc(installmentPlans.months));
}

const savedPlans = unstable_cache(async () => listPlans(await getDb()), ["installment-plans-v1"], {
  tags: [CATALOG_TAG],
  revalidate: 600,
});

/** The terms for pages prepared ahead; changing them in the admin panel refreshes the shop. */
export async function readPlans(): Promise<InstallmentTerms[]> {
  const kind = databaseKind();
  if (kind === "none") return [];
  return kind === "embedded" ? listPlans(await getDb()) : savedPlans();
}

export type PlanResult = { ok: true } | { ok: false; error: "invalid" };

/** Adds the terms for so many months, or changes their markup. */
export async function savePlan(db: Db, raw: { months?: unknown; markup?: unknown }): Promise<PlanResult> {
  const months = Number(raw.months);
  const markup = Number(raw.markup);
  if (
    !Number.isInteger(months) ||
    months < INSTALLMENT_LIMITS.minMonths ||
    months > INSTALLMENT_LIMITS.maxMonths ||
    !Number.isInteger(markup) ||
    markup < 0 ||
    markup > INSTALLMENT_LIMITS.maxMarkup
  ) {
    return { ok: false, error: "invalid" };
  }
  await db.insert(installmentPlans).values({ months, markup }).onConflictDoUpdate({ target: installmentPlans.months, set: { markup } });
  return { ok: true };
}

export async function deletePlan(db: Db, months: number): Promise<void> {
  await db.delete(installmentPlans).where(eq(installmentPlans.months, months));
}
