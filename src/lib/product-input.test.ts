import { describe, expect, it } from "vitest";
import { isImageAddress } from "./product-input";

describe("isImageAddress", () => {
  it("takes https links and the shop's own photos", () => {
    expect(isImageAddress("https://images.example.com/fridge.png")).toBe(true);
    expect(isImageAddress("/products/p-002.webp")).toBe(true);
  });

  it("refuses other addresses", () => {
    for (const value of ["http://example.com/a.png", "/products/../secret.webp", "/api/x.png", "javascript:alert(1)", "//evil.com/a.png", "/products/a b.png"]) {
      expect(isImageAddress(value)).toBe(false);
    }
  });
});
