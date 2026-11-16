import { describe, expect, it } from "vitest";
import { formatLocalPhone, formatPhone, localPhoneDigits, normalizePhone } from "./phone";

describe("phone numbers", () => {
  it("accepts the usual ways of typing an Uzbek number", () => {
    for (const input of ["+998 90 123 45 67", "998901234567", "90 123-45-67", "(90) 1234567"]) {
      expect(normalizePhone(input)).toBe("+998901234567");
    }
  });

  it("rejects numbers that are too short, too long or from another country", () => {
    for (const input of ["", "12345", "+7 900 123 45 67", "8 90 123 45 67 1", "+998 90 123 45 6"]) {
      expect(normalizePhone(input)).toBeNull();
    }
  });

  it("formats numbers for display", () => {
    expect(formatPhone("+998901234567")).toBe("+998 90 123 45 67");
    expect(formatPhone("not a phone")).toBe("not a phone");
    expect(formatLocalPhone("9012")).toBe("90 12");
    expect(formatLocalPhone("")).toBe("");
  });

  it("keeps nine local digits of typed or pasted text", () => {
    expect(localPhoneDigits("+998 90 123 45 67")).toBe("901234567");
    expect(localPhoneDigits("90 123 45 67 89")).toBe("901234567");
    expect(localPhoneDigits("99 812")).toBe("99812");
  });
});
