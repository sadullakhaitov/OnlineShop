import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { artKinds } from "@/data/products";
import { ProductArt } from "./ProductArt";

/**
 * The mobile app shows the same product drawings as the website, as files in
 * public/art. `npm run art` rewrites them after ProductArt changes; this test
 * fails while they are out of date.
 */
const dir = join(process.cwd(), "public", "art");

describe("product drawings for the mobile app", () => {
  it.each([...artKinds])("public/art/%s.svg is current", (kind) => {
    const svg = renderToStaticMarkup(createElement(ProductArt, { kind })).replace(/(id="|url\(#|href="#)_?[A-Za-z0-9]*?(-[a-z]+)/g, "$1a$2") + "\n";
    const file = join(dir, `${kind}.svg`);
    if (process.env.ART_WRITE) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, svg);
    }
    expect(existsSync(file) && readFileSync(file, "utf8")).toBe(svg);
  });
});
