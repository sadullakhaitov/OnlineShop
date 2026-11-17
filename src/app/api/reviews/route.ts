import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { isSameOrigin, readJson } from "@/server/http";
import { allowAttempt } from "@/server/rate-limit";
import { submitReview } from "@/server/reviews";
import { getCurrentCustomer } from "@/server/session";

/** A customer's review of a product from a delivered order. It waits for the admin. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  try {
    const customer = await getCurrentCustomer();
    if (!customer) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    if (!allowAttempt(`review:${customer.id}`, 10, 60 * 60_000)) {
      return NextResponse.json({ ok: false, error: "limit" }, { status: 429 });
    }
    const body = (await readJson(request, 5_000)) as Record<string, unknown> | null;
    const result = await submitReview(await getDb(), customer, body ?? {});
    if (!result.ok) return NextResponse.json(result, { status: result.error === "invalid" ? 400 : 409 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Review was not saved", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
