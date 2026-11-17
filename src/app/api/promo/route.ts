import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { addressHash, isSameOrigin, readJson } from "@/server/http";
import { checkPromo } from "@/server/promo";
import { allowAttempt } from "@/server/rate-limit";

/**
 * Checks a promo code at checkout. The order checks it again when placed;
 * this only lets the customer see the discount before sending.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  // Guessing codes one after another is slowed down.
  if (!allowAttempt(`promo:${addressHash(request) ?? "unknown"}`, 20, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "limit" }, { status: 429 });
  }
  const body = (await readJson(request, 2_000)) as { code?: unknown; subtotal?: unknown } | null;
  const subtotal = typeof body?.subtotal === "number" && body.subtotal >= 0 ? Math.floor(body.subtotal) : 0;
  try {
    const result = await checkPromo(await getDb(), body?.code, subtotal);
    if (!result.ok) return NextResponse.json(result, { status: 422 });
    return NextResponse.json({ ok: true, terms: result.terms });
  } catch (error) {
    console.error("Promo code was not checked", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
