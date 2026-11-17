import { randomUUID } from "node:crypto";
import type { PaymentMethod } from "@/db/schema";

/**
 * Everything the server reads from environment variables, in one place.
 * `.env.example` lists the variables and explains each of them.
 */

/**
 * Demo mode stands in for the outside services that are not connected yet:
 * the sign-in code is shown on screen instead of being sent by SMS, and Payme
 * and Click payments are confirmed on a test page. It is on while developing
 * and off in a production build, unless DEMO_MODE says otherwise.
 */
export function isDemoMode(): boolean {
  const flag = process.env.DEMO_MODE;
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export type PaymeConfig = {
  merchantId: string;
  /** Login of the Basic authorisation Payme sends; "Paycom" unless Payme says otherwise. */
  login: string;
  /** The cash-desk key (or the test key while working with the sandbox). */
  key: string;
  /** Name of the account field set up in the Payme cabinet. */
  accountField: string;
  checkoutUrl: string;
};

export function getPaymeConfig(): PaymeConfig | null {
  const merchantId = process.env.PAYME_MERCHANT_ID;
  const key = process.env.PAYME_KEY;
  if (!merchantId || !key) return null;
  return {
    merchantId,
    key,
    login: process.env.PAYME_LOGIN || "Paycom",
    accountField: process.env.PAYME_ACCOUNT_FIELD || "order_id",
    checkoutUrl: (process.env.PAYME_CHECKOUT_URL || "https://checkout.paycom.uz").replace(/\/+$/, ""),
  };
}

export type ClickConfig = {
  serviceId: string;
  merchantId: string;
  secretKey: string;
  merchantUserId?: string;
};

export function getClickConfig(): ClickConfig | null {
  const serviceId = process.env.CLICK_SERVICE_ID;
  const merchantId = process.env.CLICK_MERCHANT_ID;
  const secretKey = process.env.CLICK_SECRET_KEY;
  if (!serviceId || !merchantId || !secretKey) return null;
  return { serviceId, merchantId, secretKey, merchantUserId: process.env.CLICK_MERCHANT_USER_ID || undefined };
}

/**
 * Credentials of the built-in payment simulator. They are random for every
 * server start and never leave the process, so nothing outside can use them.
 */
export const demoPaymeConfig: PaymeConfig = {
  merchantId: "demo",
  login: "Paycom",
  key: randomUUID(),
  accountField: "order_id",
  checkoutUrl: "",
};

export const demoClickConfig: ClickConfig = {
  serviceId: "0",
  merchantId: "0",
  secretKey: randomUUID(),
};

export type OnlineMethod = Exclude<PaymentMethod, "cash">;
export type PaymentMode = "live" | "demo";

/** How each online payment works right now; a missing key means it is switched off. */
export function getPaymentModes(): Partial<Record<OnlineMethod, PaymentMode>> {
  const demo = isDemoMode();
  const modes: Partial<Record<OnlineMethod, PaymentMode>> = {};
  if (getPaymeConfig()) modes.payme = "live";
  else if (demo) modes.payme = "demo";
  if (getClickConfig()) modes.click = "live";
  else if (demo) modes.click = "demo";
  return modes;
}

/** Payment methods a customer may choose at checkout. */
export function getPaymentMethods(): PaymentMethod[] {
  const modes = getPaymentModes();
  const methods: PaymentMethod[] = [];
  if (modes.payme) methods.push("payme");
  if (modes.click) methods.push("click");
  methods.push("cash");
  return methods;
}

export type EskizConfig = { email: string; password: string; from: string };

export function getEskizConfig(): EskizConfig | null {
  const email = process.env.ESKIZ_EMAIL;
  const password = process.env.ESKIZ_PASSWORD;
  if (!email || !password) return null;
  return { email, password, from: process.env.ESKIZ_FROM || "4546" };
}

/** The shortest admin password a public site accepts. */
export const MIN_ADMIN_PASSWORD = 10;
/** Password of the admin panel on a developer's computer when none is set. */
export const DEV_ADMIN_PASSWORD = "admin";

export type AdminPassword =
  | { state: "ready"; value: string; isDefault: boolean }
  /** A public site without ADMIN_PASSWORD: the panel stays closed. */
  | { state: "missing" }
  /** A public site with a password that is too easy to guess. */
  | { state: "weak" };

/**
 * The admin panel shows customers' names, phones and addresses, so a public
 * site never opens it with a default or a short password, not even in demo
 * mode. Only a developer's computer gets the default one.
 */
export function getAdminPassword(): AdminPassword {
  const value = process.env.ADMIN_PASSWORD ?? "";
  const production = process.env.NODE_ENV === "production";
  if (!value) return production ? { state: "missing" } : { state: "ready", value: DEV_ADMIN_PASSWORD, isDefault: true };
  if (production && value.length < MIN_ADMIN_PASSWORD) return { state: "weak" };
  return { state: "ready", value, isDefault: false };
}

/** Public address of the site, without a trailing slash. */
export function getSiteUrl(headers: Headers): string {
  const configured = process.env.SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocol = headers.get("x-forwarded-proto") ?? (local ? "http" : "https");
  return `${protocol}://${host}`;
}
