import { randomBytes, randomInt } from "node:crypto";
import type { Db } from "@/db";
import type { Order } from "@/db/schema";
import { demoClickConfig, demoPaymeConfig } from "@/server/config";
import { ClickAction, ClickError, clickSignature, handleClickRequest, type ClickParams } from "./click";
import { handlePaymeRequest, paymeAuthorization } from "./payme";

/**
 * The payment simulator behind the test payment page. It plays the part of
 * Payme or Click and sends our own handlers the same requests the real
 * services would, so demo mode exercises the real payment code.
 */
export type DemoAction = "pay" | "decline";

export async function simulatePayment(db: Db, order: Order, action: DemoAction): Promise<boolean> {
  if (order.paymentMethod === "payme") return simulatePayme(db, order, action);
  if (order.paymentMethod === "click") return simulateClick(db, order, action);
  return false;
}

async function simulatePayme(db: Db, order: Order, action: DemoAction): Promise<boolean> {
  const config = demoPaymeConfig;
  const authorization = paymeAuthorization(config);
  const id = randomBytes(12).toString("hex");
  const account = { [config.accountField]: String(order.number) };
  const amount = order.total * 100;

  const call = async (method: string, params: Record<string, unknown>) => {
    const body = JSON.stringify({ jsonrpc: "2.0", id: randomInt(1, 1_000_000), method, params });
    const response = await handlePaymeRequest(db, config, authorization, body);
    return "result" in response;
  };

  if (!(await call("CheckPerformTransaction", { amount, account }))) return false;
  if (!(await call("CreateTransaction", { id, time: Date.now(), amount, account }))) return false;
  return action === "pay"
    ? call("PerformTransaction", { id })
    : call("CancelTransaction", { id, reason: 3 });
}

/** "2026-11-16 21:05:09" */
function signTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function simulateClick(db: Db, order: Order, action: DemoAction): Promise<boolean> {
  const config = demoClickConfig;
  const base: ClickParams = {
    click_trans_id: `${Date.now()}${randomInt(100, 1000)}`,
    service_id: config.serviceId,
    click_paydoc_id: String(randomInt(1, 1_000_000_000)),
    merchant_trans_id: String(order.number),
    amount: order.total.toFixed(2),
    sign_time: signTime(new Date()),
  };
  const send = (params: ClickParams) =>
    handleClickRequest(db, config, params.action === ClickAction.complete ? ClickAction.complete : ClickAction.prepare, {
      ...params,
      sign_string: clickSignature(config, params),
    });

  const prepared = await send({ ...base, action: ClickAction.prepare, error: "0", error_note: "Success" });
  if (prepared.error !== ClickError.success) return false;

  const declined = action === "decline";
  const completed = await send({
    ...base,
    action: ClickAction.complete,
    merchant_prepare_id: String(prepared.merchant_prepare_id),
    error: declined ? "-5017" : "0",
    error_note: declined ? "Declined" : "Success",
  });
  return completed.error === (declined ? ClickError.cancelled : ClickError.success);
}
