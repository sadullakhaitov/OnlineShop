import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/db";
import { testDb } from "@/server/testing";
import { ADMIN_SESSION_LIFETIME, adminLogin, adminLogout, isAdminToken } from "./auth";

const PASSWORD = "a-long-shop-password";

describe("admin sign-in", () => {
  let db: Db;

  beforeEach(async () => {
    db = await testDb();
    vi.stubEnv("ADMIN_PASSWORD", PASSWORD);
    vi.stubEnv("NODE_ENV", "production");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("opens a session for the right password only", async () => {
    expect(await adminLogin(db, "wrong", "a")).toEqual({ ok: false, error: "password" });

    const result = await adminLogin(db, PASSWORD, "a");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(await isAdminToken(db, result.token)).toBe(true);
    expect(await isAdminToken(db, `${result.token}x`)).toBe(false);

    await adminLogout(db, result.token);
    expect(await isAdminToken(db, result.token)).toBe(false);
  });

  it("ends the session after a week", async () => {
    const now = new Date("2026-11-17T08:00:00Z");
    const result = await adminLogin(db, PASSWORD, "a", now);
    if (!result.ok) throw new Error("not signed in");

    const almost = new Date(now.getTime() + ADMIN_SESSION_LIFETIME - 1000);
    expect(await isAdminToken(db, result.token, almost)).toBe(true);
    expect(await isAdminToken(db, result.token, new Date(almost.getTime() + 2000))).toBe(false);
  });

  it("signs everyone out when the password changes", async () => {
    const result = await adminLogin(db, PASSWORD, "a");
    if (!result.ok) throw new Error("not signed in");

    vi.stubEnv("ADMIN_PASSWORD", "another-long-password");
    expect(await isAdminToken(db, result.token)).toBe(false);
  });

  it("stays closed on a public site without a password, or with a short one", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    expect(await adminLogin(db, "admin", "a")).toEqual({ ok: false, error: "disabled" });
    expect(await adminLogin(db, "", "a")).toEqual({ ok: false, error: "disabled" });

    vi.stubEnv("ADMIN_PASSWORD", "short");
    expect(await adminLogin(db, "short", "a")).toEqual({ ok: false, error: "disabled" });
  });

  it("uses the password «admin» on a developer's computer only", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("NODE_ENV", "development");
    expect((await adminLogin(db, "admin", "a")).ok).toBe(true);
  });

  it("locks an address after five wrong passwords", async () => {
    const now = new Date("2026-11-17T08:00:00Z");
    for (let i = 0; i < 5; i++) expect(await adminLogin(db, "guess", "a", now)).toEqual({ ok: false, error: "password" });

    // The right password does not help while the address is locked…
    const minute = 60_000;
    const locked = await adminLogin(db, PASSWORD, "a", new Date(now.getTime() + minute));
    expect(locked).toEqual({ ok: false, error: "locked", retryAfter: 14 * 60 });
    // …and trying again does not make the wait longer.
    expect(await adminLogin(db, PASSWORD, "a", new Date(now.getTime() + 2 * minute))).toMatchObject({
      error: "locked",
      retryAfter: 13 * 60,
    });

    // Other addresses are not affected, and the lock ends by itself.
    expect((await adminLogin(db, PASSWORD, "b", new Date(now.getTime() + minute))).ok).toBe(true);
    expect((await adminLogin(db, PASSWORD, "a", new Date(now.getTime() + 15 * minute + 1000))).ok).toBe(true);
  });

  it("gives a burst of parallel guesses no extra tries", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => adminLogin(db, "guess", "a")));
    const checked = results.filter((result) => !result.ok && result.error === "password");
    expect(checked.length).toBeLessThanOrEqual(5);
    expect(results.every((result) => !result.ok)).toBe(true);
  });

  it("forgets wrong passwords after a successful sign-in", async () => {
    for (let i = 0; i < 4; i++) await adminLogin(db, "guess", "a");
    expect((await adminLogin(db, PASSWORD, "a")).ok).toBe(true);
    for (let i = 0; i < 4; i++) expect(await adminLogin(db, "guess", "a")).toEqual({ ok: false, error: "password" });
    expect((await adminLogin(db, PASSWORD, "a")).ok).toBe(true);
  });

  it("limits guesses from many addresses together", async () => {
    const now = new Date("2026-11-17T08:00:00Z");
    for (let i = 0; i < 60; i++) await adminLogin(db, "guess", `address-${i}`, now);
    const result = await adminLogin(db, PASSWORD, "fresh-address", now);
    expect(result.ok === false && result.error).toBe("locked");
  });
});
