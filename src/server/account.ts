import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { customers } from "@/db/schema";

export const NAME_LIMITS = { min: 2, max: 60 } as const;

/** A name as the customer typed it, tidied; null when it cannot be used. */
export function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim();
  return name.length >= NAME_LIMITS.min && name.length <= NAME_LIMITS.max ? name : null;
}

/** Changes the name the shop greets the customer with and puts on new orders. */
export async function updateCustomerName(db: Db, customerId: string, name: string): Promise<void> {
  await db.update(customers).set({ name }).where(eq(customers.id, customerId));
}
