import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db";
import {
  CODE_LENGTH,
  RESEND_AFTER,
  SESSION_LIFETIME,
  deleteSession,
  getCustomerByToken,
  requestCode,
  verifyCode,
} from "./auth";
import { listOrders } from "./orders";
import { placeOrder, testDb } from "./testing";

let db: Db;
let last = 0;
/** A phone number nobody has used in this test run. */
const newPhone = () => `+99890${String(1000000 + ++last)}`;
const minutes = (count: number) => count * 60_000;

beforeAll(async () => {
  db = await testDb();
});

async function codeFor(phone: string, now: Date) {
  const result = await requestCode(db, phone, null, now);
  if (!result.ok) throw new Error(`No code: ${result.error}`);
  return result.code;
}

describe("requestCode", () => {
  it("gives a numeric code and makes the next request wait a minute", async () => {
    const phone = newPhone();
    const start = new Date();
    const code = await codeFor(phone, start);
    expect(code).toMatch(new RegExp(`^\\d{${CODE_LENGTH}}$`));

    const tooSoon = await requestCode(db, phone, null, new Date(start.getTime() + 20_000));
    expect(tooSoon).toEqual({ ok: false, error: "wait", retryAfter: RESEND_AFTER - 20 });

    const later = await requestCode(db, phone, null, new Date(start.getTime() + minutes(1) + 1000));
    expect(later.ok).toBe(true);
  });

  it("stops after five codes an hour for one phone", async () => {
    const phone = newPhone();
    const start = Date.now();
    for (let i = 0; i < 5; i++) await codeFor(phone, new Date(start + minutes(2 * i)));

    expect(await requestCode(db, phone, null, new Date(start + minutes(12)))).toEqual({ ok: false, error: "limit" });
    // An hour after the first code the limit lets go.
    expect((await requestCode(db, phone, null, new Date(start + minutes(63)))).ok).toBe(true);
  });

  it("stops one address from requesting codes for many phones", async () => {
    const start = new Date();
    for (let i = 0; i < 20; i++) {
      expect((await requestCode(db, newPhone(), "address-1", start)).ok).toBe(true);
    }
    expect(await requestCode(db, newPhone(), "address-1", start)).toEqual({ ok: false, error: "limit" });
    expect((await requestCode(db, newPhone(), "address-2", start)).ok).toBe(true);
  });
});

describe("verifyCode", () => {
  it("signs in with the right code, once", async () => {
    const phone = newPhone();
    const now = new Date();
    const code = await codeFor(phone, now);

    const result = await verifyCode(db, phone, code, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.customer.phone).toBe(phone);
    expect((await getCustomerByToken(db, result.token, now))?.id).toBe(result.customer.id);

    // The code is used up.
    expect(await verifyCode(db, phone, code, now)).toEqual({ ok: false, error: "expired" });

    // Signing in again later gives the same customer.
    const later = new Date(now.getTime() + minutes(5));
    const again = await verifyCode(db, phone, await codeFor(phone, later), later);
    expect(again.ok && again.customer.id).toBe(result.customer.id);
  });

  it("rejects wrong codes and blocks the code after five tries", async () => {
    const phone = newPhone();
    const now = new Date();
    const code = await codeFor(phone, now);
    const wrong = code === "000000" ? "000001" : "000000";

    for (let i = 0; i < 4; i++) {
      expect(await verifyCode(db, phone, wrong, now)).toEqual({ ok: false, error: "invalid" });
    }
    expect(await verifyCode(db, phone, wrong, now)).toEqual({ ok: false, error: "attempts" });
    // Even the right code no longer works.
    expect(await verifyCode(db, phone, code, now)).toEqual({ ok: false, error: "attempts" });
  });

  it("rejects a code after five minutes and a code for another phone", async () => {
    const phone = newPhone();
    const now = new Date();
    const code = await codeFor(phone, now);

    expect(await verifyCode(db, newPhone(), code, now)).toEqual({ ok: false, error: "expired" });
    const late = new Date(now.getTime() + minutes(5) + 1);
    expect(await verifyCode(db, phone, code, late)).toEqual({ ok: false, error: "expired" });
  });

  it("only accepts the newest code", async () => {
    const phone = newPhone();
    const start = new Date();
    const first = await codeFor(phone, start);
    const later = new Date(start.getTime() + minutes(2));
    const second = await codeFor(phone, later);

    if (first !== second) {
      expect(await verifyCode(db, phone, first, later)).toEqual({ ok: false, error: "invalid" });
    }
    expect((await verifyCode(db, phone, second, later)).ok).toBe(true);
  });
});

describe("sessions and order history", () => {
  it("ends a session on sign-out and after thirty days", async () => {
    const phone = newPhone();
    const now = new Date();
    const result = await verifyCode(db, phone, await codeFor(phone, now), now);
    if (!result.ok) throw new Error("sign-in failed");

    expect(await getCustomerByToken(db, "some-other-token", now)).toBeNull();
    const afterExpiry = new Date(now.getTime() + SESSION_LIFETIME + 1000);
    expect(await getCustomerByToken(db, result.token, afterExpiry)).toBeNull();

    await deleteSession(db, result.token);
    expect(await getCustomerByToken(db, result.token, now)).toBeNull();
  });

  it("shows orders placed as a guest with the same phone, and nobody else's", async () => {
    const phone = newPhone();
    const guestOrder = await placeOrder(db, { phone });
    const foreignOrder = await placeOrder(db, { phone: newPhone() });

    const now = new Date();
    const result = await verifyCode(db, phone, await codeFor(phone, now), now);
    if (!result.ok) throw new Error("sign-in failed");

    // The account takes the name from the guest order.
    expect(result.customer.name).toBe(guestOrder.name);

    const mine = await listOrders(db, result.customer);
    expect(mine.map((order) => order.id)).toEqual([guestOrder.id]);
    expect(mine[0].customerId).toBe(result.customer.id);
    expect(mine[0].items).toHaveLength(1);
    expect(mine.some((order) => order.id === foreignOrder.id)).toBe(false);
  });
});
