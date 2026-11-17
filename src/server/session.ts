import { cookies, headers } from "next/headers";
import type { NextResponse } from "next/server";
import { getDb } from "@/db";
import type { Customer } from "@/db/schema";
import { AUTH_HINT_COOKIE } from "@/lib/auth-hint";
import { SESSION_LIFETIME, getCustomerByToken } from "./auth";

/** The sign-in cookie. JavaScript in the page cannot read it. */
const SESSION_COOKIE = "mm_session";

const base = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_LIFETIME / 1000,
};

/**
 * The session token: from the cookie on the website, or from an
 * "Authorization: Bearer" header sent by the mobile app.
 */
export async function getSessionToken(): Promise<string | null> {
  const bearer = (await headers()).get("authorization")?.match(/^Bearer\s+([A-Za-z0-9_-]{16,200})$/)?.[1];
  return bearer ?? (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** The signed-in customer, or null. Does not touch the database for guests. */
export async function getCurrentCustomer(): Promise<Customer | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return getCustomerByToken(await getDb(), token);
}

/**
 * Inside Telegram the shop may run in a frame of web.telegram.org, where a
 * browser only keeps cookies marked for that: sent from any site, but stored
 * separately for the page around the frame ("partitioned").
 */
const embedded = { sameSite: "none" as const, secure: true, partitioned: true };

export function setSessionCookies(response: NextResponse, token: string, options: { telegram?: boolean } = {}) {
  const attributes = options.telegram && process.env.NODE_ENV === "production" ? { ...base, ...embedded } : base;
  response.cookies.set(SESSION_COOKIE, token, { ...attributes, httpOnly: true });
  // A readable marker with no secret in it, so the header can say "Kabinet"
  // on pages that are served from the cache.
  response.cookies.set(AUTH_HINT_COOKIE, "1", attributes);
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...base, httpOnly: true, maxAge: 0 });
  response.cookies.set(AUTH_HINT_COOKIE, "", { ...base, maxAge: 0 });
}
