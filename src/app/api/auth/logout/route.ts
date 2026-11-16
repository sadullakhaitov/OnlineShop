import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { deleteSession } from "@/server/auth";
import { isSameOrigin } from "@/server/http";
import { clearSessionCookies, getSessionToken } from "@/server/session";

/** Ends the session on this device. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });

  const token = await getSessionToken();
  if (token) {
    try {
      await deleteSession(await getDb(), token);
    } catch (error) {
      // The cookies are cleared either way.
      console.error("Session was not deleted", error);
    }
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
