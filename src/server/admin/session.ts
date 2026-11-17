import { cache } from "react";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { getDb } from "@/db";
import { redirect } from "@/i18n/navigation";
import { ADMIN_SESSION_LIFETIME, isAdminToken } from "./auth";

/** The admin sign-in cookie. JavaScript in the page cannot read it. */
const ADMIN_COOKIE = "mm_admin";

const options = {
  path: "/",
  httpOnly: true,
  // Lax, not Strict: a link to an order in a Telegram message must open the
  // panel without asking for the password again. Changes are only made by
  // POST requests, which browsers never send with this cookie from other sites.
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export async function getAdminToken(): Promise<string | null> {
  return (await cookies()).get(ADMIN_COOKIE)?.value ?? null;
}

/** Checked once per request, however many components ask. */
export const isAdmin = cache(async (): Promise<boolean> => {
  const token = await getAdminToken();
  if (!token) return false;
  return isAdminToken(await getDb(), token);
});

/**
 * Every admin page and every admin action starts with this call: the check in
 * the layout alone would not protect them.
 */
export async function requireAdmin(): Promise<void> {
  if (await isAdmin()) return;
  redirect({ href: "/admin/login", locale: await getLocale() });
}

export async function setAdminCookie(token: string) {
  (await cookies()).set(ADMIN_COOKIE, token, { ...options, maxAge: ADMIN_SESSION_LIFETIME / 1000 });
}

export async function clearAdminCookie() {
  (await cookies()).set(ADMIN_COOKIE, "", { ...options, maxAge: 0 });
}
