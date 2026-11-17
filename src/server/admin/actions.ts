"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { getDb } from "@/db";
import type { OrderStatus } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { addressHashOf } from "@/server/http";
import { adminLogin, adminLogout } from "./auth";
import { ORDER_STATUSES, changeOrderPayment, changeOrderStatus, type PaymentAction } from "./orders";
import { clearAdminCookie, getAdminToken, requireAdmin, setAdminCookie } from "./session";

/**
 * Everything the admin panel changes goes through these functions. Each one
 * checks the admin session itself: they can be called from any page.
 */

export type LoginState = {
  error: "password" | "locked" | "disabled" | "server";
  /** For "locked": how long to wait */
  minutes?: number;
} | null;

export async function loginAction(_previous: LoginState, form: FormData): Promise<LoginState> {
  const password = form.get("password");
  if (typeof password !== "string" || !password || password.length > 500) return { error: "password" };

  let token: string;
  try {
    const result = await adminLogin(await getDb(), password, addressHashOf(await headers()));
    if (!result.ok) {
      return { error: result.error, minutes: result.error === "locked" ? Math.ceil(result.retryAfter / 60) : undefined };
    }
    token = result.token;
  } catch (error) {
    console.error("Admin sign-in failed", error);
    return { error: "server" };
  }

  await setAdminCookie(token);
  return redirect({ href: "/admin", locale: await getLocale() });
}

export async function logoutAction(): Promise<void> {
  const token = await getAdminToken();
  if (token) await adminLogout(await getDb(), token).catch((error) => console.error("Admin sign-out failed", error));
  await clearAdminCookie();
  redirect({ href: "/admin/login", locale: await getLocale() });
}

export type AdminActionState = { error: "missing" | "stale" | "forbidden" | "server" } | null;

/** Admin pages are never cached on the server; this makes the open page show the change. */
const refresh = () => revalidatePath("/[locale]/admin", "layout");

const isStatus = (value: unknown): value is OrderStatus => ORDER_STATUSES.includes(value as OrderStatus);
const paymentActions: PaymentAction[] = ["cash", "undo", "refund"];

export async function orderStatusAction(_previous: AdminActionState, form: FormData): Promise<AdminActionState> {
  await requireAdmin();

  const id = form.get("id");
  const from = form.get("from");
  const to = form.get("to");
  if (typeof id !== "string" || !isStatus(from) || !isStatus(to)) return { error: "forbidden" };

  try {
    const result = await changeOrderStatus(await getDb(), id, from, to);
    refresh();
    return result.ok ? null : { error: result.error };
  } catch (error) {
    console.error("Order status was not changed", error);
    return { error: "server" };
  }
}

export async function orderPaymentAction(_previous: AdminActionState, form: FormData): Promise<AdminActionState> {
  await requireAdmin();

  const id = form.get("id");
  const action = form.get("action") as PaymentAction;
  if (typeof id !== "string" || !paymentActions.includes(action)) return { error: "forbidden" };

  try {
    const result = await changeOrderPayment(await getDb(), id, action);
    refresh();
    return result.ok ? null : { error: result.error };
  } catch (error) {
    console.error("Order payment was not changed", error);
    return { error: "server" };
  }
}
