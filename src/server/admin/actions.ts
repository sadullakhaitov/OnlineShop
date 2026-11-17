"use server";

import { headers } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { getLocale } from "next-intl/server";
import { getDb } from "@/db";
import type { OrderStatus, ProductRow } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import type { ProductField } from "@/lib/product-input";
import { addressHashOf } from "@/server/http";
import { adminLogin, adminLogout } from "./auth";
import { ORDER_STATUSES, changeOrderPayment, changeOrderStatus, type PaymentAction } from "./orders";
import { createProduct, setProductFlag, updateProduct, type ProductFlag } from "./products";
import { CATALOG_TAG } from "@/server/catalog";
import { getSiteUrl, getTelegramConfig } from "@/server/config";
import { isPublicUrl } from "@/server/telegram/api";
import { connectBot, sendTelegramLater, sendTestMessage } from "@/server/telegram/setup";
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
    sendTelegramLater(await headers());
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
    sendTelegramLater(await headers());
    return result.ok ? null : { error: result.error };
  } catch (error) {
    console.error("Order payment was not changed", error);
    return { error: "server" };
  }
}

/**
 * The shop keeps its product pages ready between visits. A change in the
 * catalogue makes all of them fresh, and the admin pages beneath the same
 * layout with them.
 */
const refreshShop = () => {
  updateTag(CATALOG_TAG);
  revalidatePath("/[locale]", "layout");
};

export type ProductSaveResult =
  | { ok: true; product: ProductRow }
  | { ok: false; error: "invalid"; fields: ProductField[] }
  | { ok: false; error: "missing" | "stale" | "server" };

/**
 * Saves the product form: a new product when `id` is null, otherwise the
 * product with that code, as long as it still has the version the admin saw.
 */
export async function saveProductAction(id: string | null, version: number, input: unknown): Promise<ProductSaveResult> {
  await requireAdmin();
  if ((id !== null && typeof id !== "string") || !Number.isInteger(version)) return { ok: false, error: "missing" };

  let result: Awaited<ReturnType<typeof createProduct>>;
  try {
    const db = await getDb();
    result = id === null ? await createProduct(db, input) : await updateProduct(db, id, version, input);
  } catch (error) {
    console.error("Product was not saved", error);
    return { ok: false, error: "server" };
  }
  if (result.ok) refreshShop();
  return result;
}

const productFlags: ProductFlag[] = ["inStock", "active"];

export type ProductFlagResult = { ok: true } | { ok: false; error: "missing" | "server" };

/** The switches in the product list. */
export async function productFlagAction(id: string, flag: ProductFlag, value: boolean): Promise<ProductFlagResult> {
  await requireAdmin();
  if (typeof id !== "string" || !productFlags.includes(flag) || typeof value !== "boolean") {
    return { ok: false, error: "missing" };
  }

  try {
    const result = await setProductFlag(await getDb(), id, flag, value);
    refreshShop();
    return result.ok ? { ok: true } : { ok: false, error: "missing" };
  } catch (error) {
    console.error("Product was not changed", error);
    return { ok: false, error: "server" };
  }
}

export type TelegramActionState = { ok: true; done: "connected" | "tested" } | { ok: false; error: string } | null;

/** Registers the webhook, the menu button, the commands and the descriptions with Telegram. */
export async function connectTelegramAction(): Promise<TelegramActionState> {
  await requireAdmin();
  const config = getTelegramConfig();
  if (!config) return { ok: false, error: "token" };
  const siteUrl = getSiteUrl(await headers());
  if (!isPublicUrl(siteUrl)) return { ok: false, error: "site" };
  try {
    await connectBot(config, siteUrl);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "server" };
  }
  revalidatePath("/[locale]/admin/telegram", "page");
  return { ok: true, done: "connected" };
}

/** Sends a short message to the shop's chat, to see that orders will arrive there. */
export async function testTelegramAction(): Promise<TelegramActionState> {
  await requireAdmin();
  const config = getTelegramConfig();
  if (!config) return { ok: false, error: "token" };
  if (!config.adminChatId) return { ok: false, error: "chat" };
  try {
    await sendTestMessage(config);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "server" };
  }
  return { ok: true, done: "tested" };
}
