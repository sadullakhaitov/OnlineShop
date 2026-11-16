import type { Order } from "@/db/schema";
import {
  getClickConfig,
  getPaymeConfig,
  getPaymentModes,
  type ClickConfig,
  type PaymeConfig,
} from "@/server/config";
import { isPayable } from "@/server/orders";

type Payable = Pick<Order, "number" | "total">;

/**
 * Payme checkout link: the parameters are joined with ";" and base64-encoded.
 * https://developer.help.paycom.uz/initsializatsiya-platezhey/otpravka-cheka-po-metodu-get
 */
export function paymeCheckoutUrl(config: PaymeConfig, order: Payable, returnUrl: string, locale: string): string {
  const params = [
    `m=${config.merchantId}`,
    `ac.${config.accountField}=${order.number}`,
    `a=${order.total * 100}`, // in tiyin
    `l=${locale}`,
    `c=${returnUrl}`,
  ].join(";");
  return `${config.checkoutUrl}/${Buffer.from(params).toString("base64")}`;
}

/** Click payment link. https://docs.click.uz/en/?p=101 */
export function clickPayUrl(config: ClickConfig, order: Payable, returnUrl: string): string {
  const url = new URL("https://my.click.uz/services/pay");
  url.searchParams.set("service_id", config.serviceId);
  url.searchParams.set("merchant_id", config.merchantId);
  if (config.merchantUserId) url.searchParams.set("merchant_user_id", config.merchantUserId);
  url.searchParams.set("amount", order.total.toFixed(2));
  url.searchParams.set("transaction_param", String(order.number));
  url.searchParams.set("return_url", returnUrl);
  return url.toString();
}

/**
 * Where the customer pays this order: Payme or Click when they are connected,
 * the built-in test page in demo mode, or null when nothing is to be paid online.
 */
export function getPaymentUrl(order: Order, siteUrl: string, locale: string): string | null {
  if (order.paymentMethod === "cash" || !isPayable(order)) return null;
  const mode = getPaymentModes()[order.paymentMethod];
  if (!mode) return null;
  if (mode === "demo") return `/${locale}/pay/demo/${order.id}`;

  // No query string: the address travels inside the providers' own parameters.
  const returnUrl = `${siteUrl}/${locale}/order/${order.id}`;
  if (order.paymentMethod === "payme") {
    const config = getPaymeConfig();
    return config && paymeCheckoutUrl(config, order, returnUrl, locale);
  }
  const config = getClickConfig();
  return config && clickPayUrl(config, order, returnUrl);
}
