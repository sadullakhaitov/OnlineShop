import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { getDb } from "@/db";
import type { Customer } from "@/db/schema";
import { AUTH_HINT_COOKIE } from "@/lib/auth-hint";
import { SESSION_LIFETIME, getCustomerByToken } from "./auth";

/** The sign-in cookie. JavaScript in the page cannot read it. */
export const SESSION_COOKIE = "mm_session";

const base = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_LIFETIME / 1000,
};

export async function getSessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** The signed-in customer, or null. Does not touch the database for guests. */
export async function getCurrentCustomer(): Promise<Customer | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return getCustomerByToken(await getDb(), token);
}

export function setSessionCookies(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, { ...base, httpOnly: true });
  // A readable marker with no secret in it, so the header can say "Kabinet"
  // on pages that are served from the cache.
  response.cookies.set(AUTH_HINT_COOKIE, "1", base);
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...base, httpOnly: true, maxAge: 0 });
  response.cookies.set(AUTH_HINT_COOKIE, "", { ...base, maxAge: 0 });
}
