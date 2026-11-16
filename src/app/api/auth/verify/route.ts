import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { normalizePhone } from "@/lib/phone";
import { CODE_LENGTH, verifyCode } from "@/server/auth";
import { isSameOrigin, readJson } from "@/server/http";
import { setSessionCookies } from "@/server/session";

/** Checks the sign-in code and starts a session. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const body = (await readJson(request)) as { phone?: unknown; code?: unknown } | null;
  const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : null;
  const code = typeof body?.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (!phone || code.length !== CODE_LENGTH) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 422 });
  }

  try {
    const result = await verifyCode(await getDb(), phone, code);
    if (!result.ok) return NextResponse.json(result, { status: 422 });

    const response = NextResponse.json({ ok: true });
    setSessionCookies(response, result.token);
    return response;
  } catch (error) {
    console.error("Sign-in failed", error);
    return NextResponse.json({ ok: false, error: "server" }, { status: 500 });
  }
}
