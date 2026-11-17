import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { normalizePhone } from "@/lib/phone";
import { CODE_LENGTH, verifyCode } from "@/server/auth";
import { readJson } from "@/server/http";

/**
 * Sign-in for the mobile app: like the website's, but the session token comes
 * back in the answer. The app keeps it in the phone's secure storage and sends
 * it as "Authorization: Bearer". The code itself is asked for at /api/auth/code.
 */
export async function POST(request: Request) {
  // Browsers always send Origin with a POST; the app sends none. A web page
  // must never receive a token it could read.
  if (request.headers.get("origin")) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const body = (await readJson(request)) as { phone?: unknown; code?: unknown } | null;
  const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : null;
  const code = typeof body?.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (!phone || code.length !== CODE_LENGTH) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 422 });
  }

  try {
    const result = await verifyCode(await getDb(), phone, code);
    if (!result.ok) return NextResponse.json(result, { status: 422 });
    return NextResponse.json({ ok: true, token: result.token });
  } catch (error) {
    console.error("Mobile sign-in failed", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
