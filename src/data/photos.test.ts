import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { products } from "./products";

describe("sample photos", () => {
  it("every photo a sample product points to is on the site", () => {
    const missing = products.filter((product) => product.image?.startsWith("/products/") && !existsSync(join(process.cwd(), "public", product.image)));
    expect(missing.map((product) => product.id)).toEqual([]);
  });
});
