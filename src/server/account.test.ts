import { describe, expect, it } from "vitest";
import { cleanName } from "./account";

describe("cleanName", () => {
  it("tidies spaces and keeps letters of any alphabet", () => {
    expect(cleanName("  Саъдулло   Хаитов ")).toBe("Саъдулло Хаитов");
    expect(cleanName("O'ktam")).toBe("O'ktam");
  });

  it("refuses names that are too short, too long or not text", () => {
    expect(cleanName("A")).toBeNull();
    expect(cleanName("x".repeat(61))).toBeNull();
    expect(cleanName(42)).toBeNull();
    expect(cleanName(" <> ")).toBeNull();
  });

  it("drops angle brackets and control characters", () => {
    expect(cleanName("Ali<script>")).toBe("Aliscript");
  });
});
