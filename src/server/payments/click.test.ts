import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import type { ClickConfig } from "@/server/config";
import { placeOrder, reloadOrder, testDb } from "@/server/testing";
import { clickSignature, handleClickRequest, type ClickParams } from "./click";

const config: ClickConfig = { serviceId: "12345", merchantId: "777", secretKey: "secret" };

let db: Db;
let counter = 1000;

beforeAll(async () => {
  db = await testDb();
});

function sign(params: ClickParams): ClickParams {
  return { ...params, sign_string: clickSignature(config, params) };
}

function prepareParams(orderNumber: number, amount: string, clickTransId = String(++counter)): ClickParams {
  return {
    click_trans_id: clickTransId,
    service_id: config.serviceId,
    click_paydoc_id: "55",
    merchant_trans_id: String(orderNumber),
    amount,
    action: "0",
    error: "0",
    error_note: "Success",
    sign_time: "2026-11-16 12:00:00",
  };
}

const prepare = (params: ClickParams) => handleClickRequest(db, config, "0", sign(params));
const complete = (params: ClickParams, prepareId: number | undefined, error = "0") =>
  handleClickRequest(
    db,
    config,
    "1",
    sign({ ...params, action: "1", merchant_prepare_id: String(prepareId), error }),
  );

describe("signature and request checks", () => {
  it("builds the md5 signature in the order Click defines", () => {
    // Reference values were computed separately with the md5sum command:
    // md5("1" + "12345" + "secret" + "100001" + "1000" + "0" + "2026-11-16 12:00:00")
    const params = prepareParams(100001, "1000", "1");
    expect(clickSignature(config, params)).toBe("594630b4d880edb1f72728d5c49daeba");
    // Complete adds merchant_prepare_id ("99") after the order number.
    expect(clickSignature(config, { ...params, action: "1", merchant_prepare_id: "99" })).toBe(
      "96f8900e078531078295fea35506deda",
    );
  });

  it("refuses a wrong signature with -1", async () => {
    const order = await placeOrder(db, { paymentMethod: "click" });
    const params = { ...prepareParams(order.number, String(order.total)), sign_string: "0".repeat(32) };
    expect(await handleClickRequest(db, config, "0", params)).toMatchObject({
      error: -1,
      error_note: "SIGN CHECK FAILED!",
    });
    // A signature made for another amount does not fit either.
    const forged = { ...sign(prepareParams(order.number, "1")), amount: String(order.total) };
    expect((await handleClickRequest(db, config, "0", forged)).error).toBe(-1);
  });

  it("answers -8 when fields are missing and -3 for the wrong action", async () => {
    const order = await placeOrder(db, { paymentMethod: "click" });
    const params = sign(prepareParams(order.number, String(order.total)));
    expect((await handleClickRequest(db, config, "0", { ...params, sign_time: undefined })).error).toBe(-8);
    // The Complete address does not accept a Prepare request, and the other way round.
    expect((await handleClickRequest(db, config, "1", { ...params, merchant_prepare_id: "1" })).error).toBe(-3);
    const completeRequest = sign({ ...params, action: "1", merchant_prepare_id: "1" });
    expect((await handleClickRequest(db, config, "0", completeRequest)).error).toBe(-3);
    // A request for another service is not ours.
    const foreign = { ...prepareParams(order.number, String(order.total)), service_id: "999" };
    expect((await handleClickRequest(db, config, "0", sign(foreign))).error).toBe(-8);
  });
});

describe("Prepare", () => {
  it("accepts a payable order and repeats the same id for a repeated request", async () => {
    const order = await placeOrder(db, { paymentMethod: "click" });
    const params = prepareParams(order.number, order.total.toFixed(2));

    const first = await prepare(params);
    expect(first).toMatchObject({
      error: 0,
      error_note: "Success",
      click_trans_id: params.click_trans_id,
      merchant_trans_id: String(order.number),
    });
    expect(typeof first.merchant_prepare_id).toBe("number");
    expect((await prepare(params)).merchant_prepare_id).toBe(first.merchant_prepare_id);
  });

  it("answers -5 for an unknown order and -2 for a wrong amount", async () => {
    const order = await placeOrder(db, { paymentMethod: "click" });
    expect((await prepare(prepareParams(999_999_999, "1000"))).error).toBe(-5);
    expect((await prepare(prepareParams(order.number, String(order.total - 1)))).error).toBe(-2);
  });
});

describe("Complete", () => {
  it("marks the order as paid and reports a repeat as already paid", async () => {
    const order = await placeOrder(db, { paymentMethod: "click" });
    const params = prepareParams(order.number, String(order.total));
    const prepared = await prepare(params);

    const done = await complete(params, prepared.merchant_prepare_id);
    expect(done).toMatchObject({ error: 0, merchant_confirm_id: prepared.merchant_prepare_id });
    expect(await reloadOrder(db, order.id)).toMatchObject({
      paymentStatus: "paid",
      status: "confirmed",
      paymentMethod: "click",
    });

    expect((await complete(params, prepared.merchant_prepare_id)).error).toBe(-4);
    expect((await prepare(params)).error).toBe(-4);
    expect((await prepare(prepareParams(order.number, String(order.total)))).error).toBe(-4);
  });

  it("answers -6 when the prepare id does not belong to this payment", async () => {
    const order = await placeOrder(db, { paymentMethod: "click" });
    const params = prepareParams(order.number, String(order.total));
    const prepared = await prepare(params);
    expect((await complete(params, (prepared.merchant_prepare_id ?? 0) + 1000)).error).toBe(-6);
    expect((await reloadOrder(db, order.id)).paymentStatus).toBe("unpaid");
  });

  it("cancels the attempt when Click reports a failed payment, and lets the customer try again", async () => {
    const order = await placeOrder(db, { paymentMethod: "click" });
    const params = prepareParams(order.number, String(order.total));
    const prepared = await prepare(params);

    expect((await complete(params, prepared.merchant_prepare_id, "-5017")).error).toBe(-9);
    expect((await reloadOrder(db, order.id)).paymentStatus).toBe("unpaid");
    // The cancelled attempt stays cancelled…
    expect((await complete(params, prepared.merchant_prepare_id)).error).toBe(-9);
    expect((await prepare(params)).error).toBe(-9);

    // …but a new attempt for the same order goes through.
    const retry = prepareParams(order.number, String(order.total));
    const again = await prepare(retry);
    expect((await complete(retry, again.merchant_prepare_id)).error).toBe(0);
    expect((await reloadOrder(db, order.id)).paymentStatus).toBe("paid");
  });

  it("returns the money when the order was paid another way in the meantime", async () => {
    const order = await placeOrder(db, { paymentMethod: "click" });
    const first = prepareParams(order.number, String(order.total));
    const second = prepareParams(order.number, String(order.total));
    const a = await prepare(first);
    const b = await prepare(second);

    expect((await complete(first, a.merchant_prepare_id)).error).toBe(0);
    // The order is paid: the second payment must not be kept.
    expect((await complete(second, b.merchant_prepare_id)).error).toBe(-9);
  });
});
