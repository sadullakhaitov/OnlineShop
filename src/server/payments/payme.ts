import { createHash, timingSafeEqual } from "node:crypto";
import { and, asc, eq, gte, inArray, lte, ne } from "drizzle-orm";
import type { Db, Tx } from "@/db";
import { orders, paymeTransactions, type Order, type PaymeTransaction } from "@/db/schema";
import type { PaymeConfig } from "@/server/config";
import {
  getOrderByNumber,
  isPayable,
  lockOrderByNumber,
  markOrderPaid,
  markOrderRefunded,
  parseOrderNumber,
} from "@/server/orders";

/**
 * The shop's side of the Payme (Paycom) Merchant API: Payme calls one address
 * with JSON-RPC requests, and this file answers them.
 * Protocol reference: https://developer.help.paycom.uz/metody-merchant-api/
 *
 * The function takes the database and the settings as arguments, so the same
 * code serves the real endpoint, the built-in simulator and the tests.
 */

/** A created transaction that is not paid within 12 hours is cancelled. */
export const PAYME_TIMEOUT = 43_200_000;

export const PaymeState = {
  created: 1,
  performed: 2,
  cancelled: -1,
  cancelledAfterPerform: -2,
} as const;

export const PaymeReason = {
  timeout: 4,
  refund: 5,
} as const;

export const PaymeErrorCode = {
  notPost: -32300,
  parse: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  accessDenied: -32504,
  system: -32400,
  invalidAmount: -31001,
  transactionNotFound: -31003,
  cannotCancel: -31007,
  cannotPerform: -31008,
  orderNotFound: -31050,
} as const;

type Message = { ru: string; uz: string; en: string };

const messages = {
  notPost: { ru: "Запрос должен быть POST", uz: "So'rov POST bo'lishi kerak", en: "The request must be POST" },
  parse: { ru: "Ошибка разбора JSON", uz: "JSON ni o'qishda xatolik", en: "JSON parse error" },
  invalidRequest: {
    ru: "В запросе нет обязательных полей",
    uz: "So'rovda majburiy maydonlar yo'q",
    en: "Required fields are missing",
  },
  methodNotFound: { ru: "Метод не найден", uz: "Metod topilmadi", en: "Method not found" },
  accessDenied: {
    ru: "Недостаточно привилегий для выполнения метода",
    uz: "Metodni bajarish uchun huquq yetarli emas",
    en: "Insufficient privileges to perform the method",
  },
  system: { ru: "Внутренняя ошибка", uz: "Ichki xatolik", en: "Internal error" },
  invalidAmount: { ru: "Неверная сумма", uz: "Summa noto'g'ri", en: "Incorrect amount" },
  orderNotFound: { ru: "Неверный код заказа", uz: "Buyurtma raqami noto'g'ri", en: "Incorrect order number" },
  orderNotPayable: {
    ru: "Заказ уже оплачен или отменён",
    uz: "Buyurtma allaqachon to'langan yoki bekor qilingan",
    en: "The order is already paid or cancelled",
  },
  orderBusy: {
    ru: "Заказ ожидает оплаты по другой транзакции",
    uz: "Buyurtma boshqa tranzaksiya bo'yicha to'lovni kutmoqda",
    en: "The order is waiting for payment by another transaction",
  },
  transactionNotFound: { ru: "Транзакция не найдена", uz: "Tranzaksiya topilmadi", en: "Transaction not found" },
  wrongState: {
    ru: "Невозможно выполнить операцию",
    uz: "Amalni bajarib bo'lmaydi",
    en: "Unable to perform the operation",
  },
  expired: { ru: "Время транзакции истекло", uz: "Tranzaksiya muddati tugagan", en: "The transaction has expired" },
  cannotCancel: {
    ru: "Заказ выполнен, отмена невозможна",
    uz: "Buyurtma bajarilgan, bekor qilib bo'lmaydi",
    en: "The order is completed and cannot be cancelled",
  },
} satisfies Record<string, Message>;

class PaymeFailure extends Error {
  constructor(
    readonly code: number,
    readonly messages: Message,
    readonly data?: string,
  ) {
    super(messages.en);
  }
}

const cannotPerform = (message: Message) => new PaymeFailure(PaymeErrorCode.cannotPerform, message);

export type PaymeResponse =
  | { jsonrpc: "2.0"; id: unknown; result: Record<string, unknown> }
  | { jsonrpc: "2.0"; id: unknown; error: { code: number; message: Message; data?: string } };

type Params = Record<string, unknown>;
type Context = { db: Db; config: PaymeConfig; params: Params; now: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The Authorization header Payme sends with every request. */
export function paymeAuthorization(config: PaymeConfig): string {
  return `Basic ${Buffer.from(`${config.login}:${config.key}`).toString("base64")}`;
}

function isAuthorized(config: PaymeConfig, header: string | null): boolean {
  if (!header) return false;
  // Hashing first gives both sides the same length for a constant-time comparison.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header.trim()), digest(paymeAuthorization(config)));
}

/** Answers one request from Payme. `body` is the raw request text. */
export async function handlePaymeRequest(
  db: Db,
  config: PaymeConfig,
  authorization: string | null,
  body: string,
  now: number = Date.now(),
): Promise<PaymeResponse> {
  let request: unknown;
  let parsed = true;
  try {
    request = JSON.parse(body);
  } catch {
    parsed = false;
  }
  // The answer carries the id of the request, also when it is refused.
  const id = isRecord(request) ? (request.id ?? null) : null;

  try {
    if (!isAuthorized(config, authorization)) {
      throw new PaymeFailure(PaymeErrorCode.accessDenied, messages.accessDenied);
    }
    if (!parsed) throw new PaymeFailure(PaymeErrorCode.parse, messages.parse);
    if (!isRecord(request) || typeof request.method !== "string" || !isRecord(request.params)) {
      throw new PaymeFailure(PaymeErrorCode.invalidRequest, messages.invalidRequest);
    }

    const method = methods.get(request.method);
    if (!method) {
      throw new PaymeFailure(PaymeErrorCode.methodNotFound, messages.methodNotFound, request.method);
    }

    const result = await method({ db, config, params: request.params, now });
    return { jsonrpc: "2.0", id, result };
  } catch (error) {
    if (error instanceof PaymeFailure) {
      return { jsonrpc: "2.0", id, error: { code: error.code, message: error.messages, data: error.data } };
    }
    console.error("Payme request failed", error);
    return { jsonrpc: "2.0", id, error: { code: PaymeErrorCode.system, message: messages.system } };
  }
}

/** The answer to anything that is not a POST request. */
export function paymeNotPostResponse(): PaymeResponse {
  return { jsonrpc: "2.0", id: null, error: { code: PaymeErrorCode.notPost, message: messages.notPost } };
}

/* ───────────── Shared checks ───────────── */

function transactionId(params: Params): string {
  const id = params.id;
  if (typeof id !== "string" || id.length === 0 || id.length > 64) {
    throw new PaymeFailure(PaymeErrorCode.invalidRequest, messages.invalidRequest);
  }
  return id;
}

function orderNumber(config: PaymeConfig, params: Params): number {
  const account = isRecord(params.account) ? params.account : {};
  const number = parseOrderNumber(account[config.accountField]);
  if (number === null) {
    throw new PaymeFailure(PaymeErrorCode.orderNotFound, messages.orderNotFound, config.accountField);
  }
  return number;
}

/** The order must exist, cost exactly this much (in tiyin) and still await payment. */
function checkOrder(config: PaymeConfig, order: Order | null, amount: unknown): asserts order is Order {
  if (!order) {
    throw new PaymeFailure(PaymeErrorCode.orderNotFound, messages.orderNotFound, config.accountField);
  }
  if (typeof amount !== "number" || amount !== order.total * 100) {
    throw new PaymeFailure(PaymeErrorCode.invalidAmount, messages.invalidAmount);
  }
  if (!isPayable(order)) throw cannotPerform(messages.orderNotPayable);
}

const isExpired = (transaction: PaymeTransaction, now: number) => now - transaction.createTime > PAYME_TIMEOUT;

const activeStates = [PaymeState.created, PaymeState.performed];

/* ───────────── Methods ───────────── */

async function checkPerformTransaction({ db, config, params }: Context) {
  const order = await getOrderByNumber(db, orderNumber(config, params));
  checkOrder(config, order, params.amount);

  const [active] = await db
    .select({ id: paymeTransactions.id })
    .from(paymeTransactions)
    .where(and(eq(paymeTransactions.orderId, order.id), inArray(paymeTransactions.state, activeStates)))
    .limit(1);
  if (active) throw cannotPerform(messages.orderBusy);

  return { allow: true };
}

async function createTransaction({ db, config, params, now }: Context) {
  const paycomId = transactionId(params);
  const number = orderNumber(config, params);
  const time = params.time;
  if (typeof time !== "number") {
    throw new PaymeFailure(PaymeErrorCode.invalidRequest, messages.invalidRequest);
  }

  // A failure that must be reported after its own changes are saved comes
  // back as a value: throwing inside the transaction would undo them.
  const outcome = await db.transaction(async (tx) => {
    const order = await lockOrderByNumber(tx, number);
    checkOrder(config, order, params.amount);

    const [existing] = await tx
      .select()
      .from(paymeTransactions)
      .where(eq(paymeTransactions.paycomId, paycomId))
      .limit(1);

    if (existing) {
      // Payme repeats a request when it did not get our answer.
      if (existing.state !== PaymeState.created) throw cannotPerform(messages.wrongState);
      if (isExpired(existing, now)) {
        await expire(tx, existing, now);
        return cannotPerform(messages.expired);
      }
      return existing;
    }

    // One order is paid by one transaction at a time.
    const [other] = await tx
      .select({ id: paymeTransactions.id })
      .from(paymeTransactions)
      .where(
        and(
          eq(paymeTransactions.orderId, order.id),
          inArray(paymeTransactions.state, activeStates),
          ne(paymeTransactions.paycomId, paycomId),
        ),
      )
      .limit(1);
    if (other) throw cannotPerform(messages.orderBusy);

    if (now - time > PAYME_TIMEOUT) throw cannotPerform(messages.expired);

    const [created] = await tx
      .insert(paymeTransactions)
      .values({
        paycomId,
        orderId: order.id,
        amount: order.total * 100,
        state: PaymeState.created,
        paycomTime: time,
        createTime: now,
      })
      .returning();
    return created;
  });

  if (outcome instanceof PaymeFailure) throw outcome;
  return { create_time: outcome.createTime, transaction: outcome.id, state: outcome.state };
}

async function performTransaction({ db, params, now }: Context) {
  const paycomId = transactionId(params);

  const outcome = await db.transaction(async (tx) => {
    const transaction = await lockTransaction(tx, paycomId);

    if (transaction.state === PaymeState.performed) return transaction;
    if (transaction.state !== PaymeState.created) throw cannotPerform(messages.wrongState);
    if (isExpired(transaction, now)) {
      await expire(tx, transaction, now);
      return cannotPerform(messages.expired);
    }

    // False when the order was paid another way or cancelled in the meantime.
    const paid = await markOrderPaid(tx, transaction.orderId, "payme", new Date(now));
    if (!paid) throw cannotPerform(messages.orderNotPayable);

    const [performed] = await tx
      .update(paymeTransactions)
      .set({ state: PaymeState.performed, performTime: now })
      .where(eq(paymeTransactions.id, transaction.id))
      .returning();
    return performed;
  });

  if (outcome instanceof PaymeFailure) throw outcome;
  return { transaction: outcome.id, perform_time: outcome.performTime, state: outcome.state };
}

async function cancelTransaction({ db, params, now }: Context) {
  const paycomId = transactionId(params);
  const reason = params.reason;
  if (typeof reason !== "number") {
    throw new PaymeFailure(PaymeErrorCode.invalidRequest, messages.invalidRequest);
  }

  const cancelled = await db.transaction(async (tx) => {
    const transaction = await lockTransaction(tx, paycomId);

    // Already cancelled: repeat the first answer.
    if (transaction.state < 0) return transaction;

    let state: number = PaymeState.cancelled;
    if (transaction.state === PaymeState.performed) {
      // The money is returned; impossible once the goods are handed over.
      const refunded = await markOrderRefunded(tx, transaction.orderId, "payme");
      if (!refunded) throw new PaymeFailure(PaymeErrorCode.cannotCancel, messages.cannotCancel);
      state = PaymeState.cancelledAfterPerform;
    }

    const [updated] = await tx
      .update(paymeTransactions)
      .set({ state, reason, cancelTime: now })
      .where(eq(paymeTransactions.id, transaction.id))
      .returning();
    return updated;
  });

  return { transaction: cancelled.id, cancel_time: cancelled.cancelTime, state: cancelled.state };
}

async function checkTransaction({ db, params }: Context) {
  const paycomId = transactionId(params);
  const [transaction] = await db
    .select()
    .from(paymeTransactions)
    .where(eq(paymeTransactions.paycomId, paycomId))
    .limit(1);
  if (!transaction) throw new PaymeFailure(PaymeErrorCode.transactionNotFound, messages.transactionNotFound);

  return {
    create_time: transaction.createTime,
    perform_time: transaction.performTime,
    cancel_time: transaction.cancelTime,
    transaction: transaction.id,
    state: transaction.state,
    reason: transaction.reason,
  };
}

async function getStatement({ db, config, params }: Context) {
  const { from, to } = params;
  if (typeof from !== "number" || typeof to !== "number") {
    throw new PaymeFailure(PaymeErrorCode.invalidRequest, messages.invalidRequest);
  }

  const rows = await db
    .select({ transaction: paymeTransactions, number: orders.number })
    .from(paymeTransactions)
    .innerJoin(orders, eq(orders.id, paymeTransactions.orderId))
    .where(and(gte(paymeTransactions.paycomTime, from), lte(paymeTransactions.paycomTime, to)))
    .orderBy(asc(paymeTransactions.paycomTime));

  return {
    transactions: rows.map(({ transaction, number }) => ({
      id: transaction.paycomId,
      time: transaction.paycomTime,
      amount: transaction.amount,
      account: { [config.accountField]: String(number) },
      create_time: transaction.createTime,
      perform_time: transaction.performTime,
      cancel_time: transaction.cancelTime,
      transaction: transaction.id,
      state: transaction.state,
      reason: transaction.reason,
    })),
  };
}

const methods = new Map<string, (context: Context) => Promise<Record<string, unknown>>>([
  ["CheckPerformTransaction", checkPerformTransaction],
  ["CreateTransaction", createTransaction],
  ["PerformTransaction", performTransaction],
  ["CancelTransaction", cancelTransaction],
  ["CheckTransaction", checkTransaction],
  ["GetStatement", getStatement],
]);

/* ───────────── Helpers ───────────── */

async function lockTransaction(tx: Tx, paycomId: string): Promise<PaymeTransaction> {
  const [transaction] = await tx
    .select()
    .from(paymeTransactions)
    .where(eq(paymeTransactions.paycomId, paycomId))
    .limit(1)
    .for("update");
  if (!transaction) throw new PaymeFailure(PaymeErrorCode.transactionNotFound, messages.transactionNotFound);
  return transaction;
}

async function expire(tx: Tx, transaction: PaymeTransaction, now: number) {
  await tx
    .update(paymeTransactions)
    .set({ state: PaymeState.cancelled, reason: PaymeReason.timeout, cancelTime: now })
    .where(eq(paymeTransactions.id, transaction.id));
}
