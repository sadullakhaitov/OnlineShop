import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import type { PaymeConfig } from "@/server/config";
import { placeOrder, reloadOrder, setOrderStatus, testDb } from "@/server/testing";
import { PAYME_TIMEOUT, handlePaymeRequest, paymeAuthorization, type PaymeResponse } from "./payme";

const config: PaymeConfig = {
  merchantId: "merchant",
  login: "Paycom",
  key: "test-key",
  accountField: "order_id",
  checkoutUrl: "https://checkout.paycom.uz",
};

let db: Db;
let counter = 0;
const newId = () => `tx${String(++counter).padStart(22, "0")}`;

beforeAll(async () => {
  db = await testDb();
});

async function call(
  method: string,
  params: Record<string, unknown>,
  options: { now?: number; authorization?: string | null } = {},
): Promise<PaymeResponse> {
  const authorization = options.authorization === undefined ? paymeAuthorization(config) : options.authorization;
  return handlePaymeRequest(
    db,
    config,
    authorization,
    JSON.stringify({ jsonrpc: "2.0", id: 7, method, params }),
    options.now,
  );
}

const result = (response: PaymeResponse) => ("result" in response ? response.result : undefined);
const errorCode = (response: PaymeResponse) => ("error" in response ? response.error.code : undefined);

async function order() {
  const created = await placeOrder(db);
  return {
    order: created,
    account: { order_id: String(created.number) },
    amount: created.total * 100,
  };
}

describe("authorisation and request format", () => {
  it("refuses a wrong key for every method with -32504 and keeps the request id", async () => {
    const { account, amount } = await order();
    for (const method of [
      "CheckPerformTransaction",
      "CreateTransaction",
      "PerformTransaction",
      "CancelTransaction",
      "CheckTransaction",
      "GetStatement",
    ]) {
      const wrong = `Basic ${Buffer.from("Paycom:wrong").toString("base64")}`;
      const response = await call(method, { amount, account }, { authorization: wrong });
      expect(errorCode(response)).toBe(-32504);
      expect(response.id).toBe(7);
    }
    expect(errorCode(await call("CheckPerformTransaction", { amount, account }, { authorization: null }))).toBe(
      -32504,
    );
  });

  it("answers broken JSON, missing fields and unknown methods with protocol errors", async () => {
    const auth = paymeAuthorization(config);
    expect(errorCode(await handlePaymeRequest(db, config, auth, "{not json"))).toBe(-32700);
    expect(errorCode(await handlePaymeRequest(db, config, auth, JSON.stringify({ id: 1 })))).toBe(-32600);
    expect(errorCode(await call("NoSuchMethod", {}))).toBe(-32601);
    // Names that exist on every JavaScript object must not be callable.
    expect(errorCode(await call("constructor", {}))).toBe(-32601);
    expect(errorCode(await call("toString", {}))).toBe(-32601);
  });
});

describe("CheckPerformTransaction", () => {
  it("allows a payable order with the exact amount", async () => {
    const { account, amount } = await order();
    expect(result(await call("CheckPerformTransaction", { amount, account }))).toEqual({ allow: true });
  });

  it("rejects a wrong amount with -31001", async () => {
    const { account, amount } = await order();
    expect(errorCode(await call("CheckPerformTransaction", { amount: amount + 1, account }))).toBe(-31001);
    expect(errorCode(await call("CheckPerformTransaction", { amount: String(amount), account }))).toBe(-31001);
  });

  it("rejects an unknown order with an account error that names the field", async () => {
    const response = await call("CheckPerformTransaction", { amount: 100, account: { order_id: "999999999" } });
    expect(errorCode(response)).toBe(-31050);
    expect("error" in response && response.error.data).toBe("order_id");
    expect("error" in response && Object.keys(response.error.message).sort()).toEqual(["en", "ru", "uz"]);

    expect(errorCode(await call("CheckPerformTransaction", { amount: 100, account: {} }))).toBe(-31050);
    expect(errorCode(await call("CheckPerformTransaction", { amount: 100, account: { order_id: "abc" } }))).toBe(
      -31050,
    );
  });
});

describe("creating and cancelling an unconfirmed transaction", () => {
  it("follows the sandbox scenario", async () => {
    const { order: created, account, amount } = await order();
    const id = newId();
    const time = Date.now();

    expect(errorCode(await call("CreateTransaction", { id, time, amount: amount - 100, account }))).toBe(-31001);
    expect(errorCode(await call("CreateTransaction", { id, time, amount, account: { order_id: "1" } }))).toBe(
      -31050,
    );

    const first = result(await call("CreateTransaction", { id, time, amount, account }));
    expect(first).toMatchObject({ state: 1 });
    expect(typeof first?.transaction).toBe("string");
    expect(typeof first?.create_time).toBe("number");

    // A repeated request gets the very same answer.
    expect(result(await call("CreateTransaction", { id, time, amount, account }))).toEqual(first);

    expect(result(await call("CheckTransaction", { id }))).toEqual({
      create_time: first?.create_time,
      perform_time: 0,
      cancel_time: 0,
      transaction: first?.transaction,
      state: 1,
      reason: null,
    });

    // While the order waits for this payment, another transaction is refused.
    expect(errorCode(await call("CreateTransaction", { id: newId(), time, amount, account }))).toBe(-31008);
    expect(errorCode(await call("CheckPerformTransaction", { amount, account }))).toBe(-31008);

    const cancelled = result(await call("CancelTransaction", { id, reason: 3 }));
    expect(cancelled).toMatchObject({ state: -1, transaction: first?.transaction });
    expect(result(await call("CancelTransaction", { id, reason: 3 }))).toEqual(cancelled);
    expect(result(await call("CheckTransaction", { id }))).toMatchObject({ state: -1, reason: 3 });

    // The cancelled transaction cannot come back, but the order can be paid again.
    expect(errorCode(await call("CreateTransaction", { id, time, amount, account }))).toBe(-31008);
    expect(errorCode(await call("PerformTransaction", { id }))).toBe(-31008);
    expect((await reloadOrder(db, created.id)).paymentStatus).toBe("unpaid");
    expect(result(await call("CheckPerformTransaction", { amount, account }))).toEqual({ allow: true });
  });
});

describe("creating, confirming and cancelling a confirmed transaction", () => {
  it("marks the order as paid exactly once", async () => {
    const { order: created, account, amount } = await order();
    const id = newId();
    await call("CreateTransaction", { id, time: Date.now(), amount, account });

    const performed = result(await call("PerformTransaction", { id }));
    expect(performed).toMatchObject({ state: 2 });
    expect(performed?.perform_time).toBeGreaterThan(0);
    expect(result(await call("PerformTransaction", { id }))).toEqual(performed);

    const paid = await reloadOrder(db, created.id);
    expect(paid).toMatchObject({ paymentStatus: "paid", status: "confirmed", paymentMethod: "payme" });
    expect(paid.paidAt).toBeInstanceOf(Date);

    // A paid order accepts no further payments.
    expect(errorCode(await call("CheckPerformTransaction", { amount, account }))).toBe(-31008);
    expect(errorCode(await call("CreateTransaction", { id: newId(), time: Date.now(), amount, account }))).toBe(
      -31008,
    );
  });

  it("refunds a paid order on cancel and repeats the same answer", async () => {
    const { order: created, account, amount } = await order();
    const id = newId();
    await call("CreateTransaction", { id, time: Date.now(), amount, account });
    await call("PerformTransaction", { id });

    const cancelled = result(await call("CancelTransaction", { id, reason: 5 }));
    expect(cancelled).toMatchObject({ state: -2 });
    expect(result(await call("CancelTransaction", { id, reason: 5 }))).toEqual(cancelled);
    expect(result(await call("CheckTransaction", { id }))).toMatchObject({ state: -2, reason: 5 });
    expect(await reloadOrder(db, created.id)).toMatchObject({ paymentStatus: "refunded", status: "cancelled" });
  });

  it("refuses to cancel once the goods are delivered (-31007)", async () => {
    const { order: created, account, amount } = await order();
    const id = newId();
    await call("CreateTransaction", { id, time: Date.now(), amount, account });
    await call("PerformTransaction", { id });
    await setOrderStatus(db, created.id, "delivered");

    expect(errorCode(await call("CancelTransaction", { id, reason: 5 }))).toBe(-31007);
    expect(result(await call("CheckTransaction", { id }))).toMatchObject({ state: 2 });
    expect((await reloadOrder(db, created.id)).paymentStatus).toBe("paid");
  });

  it("does not take money for an order that was cancelled meanwhile", async () => {
    const { order: created, account, amount } = await order();
    const id = newId();
    await call("CreateTransaction", { id, time: Date.now(), amount, account });
    await setOrderStatus(db, created.id, "cancelled");

    expect(errorCode(await call("PerformTransaction", { id }))).toBe(-31008);
    expect((await reloadOrder(db, created.id)).paymentStatus).toBe("unpaid");
  });
});

describe("timeouts, unknown transactions and the statement", () => {
  it("cancels a transaction that waited longer than 12 hours", async () => {
    const { order: created, account, amount } = await order();
    const id = newId();
    const start = Date.now();
    await call("CreateTransaction", { id, time: start, amount, account }, { now: start });

    const late = start + PAYME_TIMEOUT + 1;
    expect(errorCode(await call("PerformTransaction", { id }, { now: late }))).toBe(-31008);
    expect(result(await call("CheckTransaction", { id }))).toMatchObject({ state: -1, reason: 4, cancel_time: late });
    expect((await reloadOrder(db, created.id)).paymentStatus).toBe("unpaid");
  });

  it("answers -31003 for a transaction it has never seen", async () => {
    for (const method of ["PerformTransaction", "CheckTransaction"]) {
      expect(errorCode(await call(method, { id: "unknown-transaction" }))).toBe(-31003);
    }
    expect(errorCode(await call("CancelTransaction", { id: "unknown-transaction", reason: 1 }))).toBe(-31003);
  });

  it("lists transactions created within the requested period", async () => {
    const { account, amount, order: created } = await order();
    const id = newId();
    const time = 1_900_000_000_000;
    await call("CreateTransaction", { id, time, amount, account }, { now: time });

    const inside = result(await call("GetStatement", { from: time - 1, to: time + 1 }));
    expect(inside?.transactions).toEqual([
      expect.objectContaining({
        id,
        time,
        amount,
        account: { order_id: String(created.number) },
        state: 1,
        perform_time: 0,
        cancel_time: 0,
        reason: null,
      }),
    ]);
    expect(result(await call("GetStatement", { from: time + 1, to: time + 2 }))).toEqual({ transactions: [] });
  });
});
