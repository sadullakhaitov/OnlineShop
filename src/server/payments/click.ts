import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { clickTransactions } from "@/db/schema";
import type { ClickConfig } from "@/server/config";
import { isPayable, lockOrderByNumber, markOrderPaid, parseOrderNumber } from "@/server/orders";

/**
 * The shop's side of the Click SHOP API. Click calls two addresses: Prepare
 * (may this order be paid?) and Complete (the money is taken, or the payment
 * failed). Protocol reference: https://docs.click.uz/en/?p=15 and ?p=9
 *
 * As with Payme, the database and settings are arguments, so the real
 * endpoints, the built-in simulator and the tests run the same code.
 */

export const ClickError = {
  success: 0,
  signFailed: -1,
  invalidAmount: -2,
  actionNotFound: -3,
  alreadyPaid: -4,
  orderNotFound: -5,
  transactionNotFound: -6,
  updateFailed: -7,
  badRequest: -8,
  cancelled: -9,
} as const;

const notes: Record<number, string> = {
  [ClickError.success]: "Success",
  [ClickError.signFailed]: "SIGN CHECK FAILED!",
  [ClickError.invalidAmount]: "Incorrect parameter amount",
  [ClickError.actionNotFound]: "Action not found",
  [ClickError.alreadyPaid]: "Already paid",
  [ClickError.orderNotFound]: "User does not exist",
  [ClickError.transactionNotFound]: "Transaction does not exist",
  [ClickError.updateFailed]: "Failed to update user",
  [ClickError.badRequest]: "Error in request from click",
  [ClickError.cancelled]: "Transaction cancelled",
};

export const ClickAction = { prepare: "0", complete: "1" } as const;
export type ClickActionValue = (typeof ClickAction)[keyof typeof ClickAction];

/** Request fields, exactly as Click sent them. */
export type ClickParams = Record<string, string | undefined>;

export type ClickResponse = {
  click_trans_id?: string;
  merchant_trans_id?: string;
  merchant_prepare_id?: number;
  merchant_confirm_id?: number;
  error: number;
  error_note: string;
};

const required = [
  "click_trans_id",
  "service_id",
  "merchant_trans_id",
  "amount",
  "action",
  "error",
  "sign_time",
  "sign_string",
] as const;

/** md5 of the request fields and the secret key, in the order Click defines. */
export function clickSignature(config: ClickConfig, params: ClickParams): string {
  const prepareId = params.action === ClickAction.complete ? (params.merchant_prepare_id ?? "") : "";
  return createHash("md5")
    .update(
      `${params.click_trans_id}${params.service_id}${config.secretKey}${params.merchant_trans_id}` +
        `${prepareId}${params.amount}${params.action}${params.sign_time}`,
    )
    .digest("hex");
}

function signatureMatches(config: ClickConfig, params: ClickParams): boolean {
  const given = Buffer.from((params.sign_string ?? "").toLowerCase());
  const expected = Buffer.from(clickSignature(config, params));
  return given.length === expected.length && timingSafeEqual(given, expected);
}

class ClickFailure extends Error {
  constructor(readonly code: number) {
    super(notes[code]);
  }
}

/** Answers a Prepare or a Complete request; `action` is the one this address serves. */
export async function handleClickRequest(
  db: Db,
  config: ClickConfig,
  action: ClickActionValue,
  params: ClickParams,
  now: Date = new Date(),
): Promise<ClickResponse> {
  const ids = { click_trans_id: params.click_trans_id, merchant_trans_id: params.merchant_trans_id };
  const fail = (code: number): ClickResponse => ({ ...ids, error: code, error_note: notes[code] });

  if (required.some((name) => !params[name]) || (action === ClickAction.complete && !params.merchant_prepare_id)) {
    return fail(ClickError.badRequest);
  }
  if (!signatureMatches(config, params)) return fail(ClickError.signFailed);
  if (params.service_id !== config.serviceId) return fail(ClickError.badRequest);
  if (params.action !== action) return fail(ClickError.actionNotFound);

  try {
    const result =
      action === ClickAction.prepare ? await prepare(db, params) : await complete(db, params, now);
    if (result instanceof ClickFailure) return fail(result.code);
    return { ...ids, ...result, error: ClickError.success, error_note: notes[ClickError.success] };
  } catch (error) {
    if (error instanceof ClickFailure) return fail(error.code);
    console.error("Click request failed", error);
    return fail(ClickError.updateFailed);
  }
}

function amountMatches(amount: string | undefined, total: number): boolean {
  const value = Number(amount);
  return Number.isFinite(value) && Math.abs(value - total) < 0.01;
}

/** Prepare: check the order and remember the payment attempt. */
async function prepare(db: Db, params: ClickParams) {
  const number = parseOrderNumber(params.merchant_trans_id);
  if (number === null) throw new ClickFailure(ClickError.orderNotFound);
  const clickTransId = params.click_trans_id as string;

  return db.transaction(async (tx) => {
    const order = await lockOrderByNumber(tx, number);
    if (!order) throw new ClickFailure(ClickError.orderNotFound);
    if (order.paymentStatus === "paid") throw new ClickFailure(ClickError.alreadyPaid);
    if (!isPayable(order)) throw new ClickFailure(ClickError.cancelled);
    if (!amountMatches(params.amount, order.total)) throw new ClickFailure(ClickError.invalidAmount);

    const [existing] = await tx
      .select()
      .from(clickTransactions)
      .where(eq(clickTransactions.clickTransId, clickTransId))
      .limit(1);
    if (existing) {
      // Click repeats a request when it did not get our answer.
      if (existing.orderId !== order.id) throw new ClickFailure(ClickError.badRequest);
      if (existing.status === "completed") throw new ClickFailure(ClickError.alreadyPaid);
      if (existing.status === "cancelled") throw new ClickFailure(ClickError.cancelled);
      return { merchant_prepare_id: existing.id };
    }

    const [created] = await tx
      .insert(clickTransactions)
      .values({
        clickTransId,
        clickPaydocId: params.click_paydoc_id ?? null,
        orderId: order.id,
        amount: order.total,
      })
      .returning({ id: clickTransactions.id });
    return { merchant_prepare_id: created.id };
  });
}

/** Complete: the payment went through (error 0) or failed (error below 0). */
async function complete(db: Db, params: ClickParams, now: Date) {
  const number = parseOrderNumber(params.merchant_trans_id);
  if (number === null) throw new ClickFailure(ClickError.orderNotFound);
  const prepareId = Number(params.merchant_prepare_id);
  if (!Number.isSafeInteger(prepareId)) throw new ClickFailure(ClickError.transactionNotFound);

  // Failures that come with saved changes are returned, not thrown: throwing
  // inside the transaction would undo the changes.
  return db.transaction(async (tx) => {
    const order = await lockOrderByNumber(tx, number);
    if (!order) throw new ClickFailure(ClickError.orderNotFound);

    const [transaction] = await tx
      .select()
      .from(clickTransactions)
      .where(
        and(
          eq(clickTransactions.id, prepareId),
          eq(clickTransactions.orderId, order.id),
          eq(clickTransactions.clickTransId, params.click_trans_id as string),
        ),
      )
      .limit(1);
    if (!transaction) throw new ClickFailure(ClickError.transactionNotFound);
    if (transaction.status === "completed") throw new ClickFailure(ClickError.alreadyPaid);
    if (transaction.status === "cancelled") throw new ClickFailure(ClickError.cancelled);
    if (!amountMatches(params.amount, order.total)) throw new ClickFailure(ClickError.invalidAmount);

    const cancel = async () => {
      await tx
        .update(clickTransactions)
        .set({ status: "cancelled", finishedAt: now })
        .where(eq(clickTransactions.id, transaction.id));
      return new ClickFailure(ClickError.cancelled);
    };

    // Click reports that the payment failed on its side.
    if (Number(params.error) < 0) return cancel();

    // False when the order was paid another way or cancelled in the meantime:
    // answering "cancelled" makes Click return the money.
    const paid = await markOrderPaid(tx, order.id, "click", now);
    if (!paid) return cancel();

    await tx
      .update(clickTransactions)
      .set({ status: "completed", finishedAt: now })
      .where(eq(clickTransactions.id, transaction.id));
    return { merchant_confirm_id: transaction.id };
  });
}
