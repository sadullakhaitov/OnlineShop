import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/db";
import { products } from "@/db/schema";
import { parseCsv } from "@/lib/spreadsheet";
import { exportProducts, importProducts } from "./import";
import { testDb } from "../testing";

let db: Db;

beforeAll(async () => {
  db = await testDb();
});

const product = async (id: string) => (await db.select().from(products).where(eq(products.id, id)))[0]!;

describe("spreadsheet import", () => {
  it("reads CSV with semicolons, quotes and line breaks", () => {
    expect(parseCsv('﻿Kod;Narx\r\np-001;"8 990 000"\r\n"a;b";"x ""y""\nz"\r\n\r\n')).toEqual([
      ["Kod", "Narx"],
      ["p-001", "8 990 000"],
      ["a;b", 'x "y"\nz'],
    ]);
    expect(parseCsv("code,price\np-001,100")).toEqual([["code", "price"], ["p-001", "100"]]);
  });

  it("shows what would change without saving, then saves", async () => {
    const before = await product("p-001");
    const sheet = [
      ["Kod", "Narx", "Soni", "Eski narx"],
      ["P-001", `${before.price + 10_000} so'm`, "3", ""],
      ["p-002", "", "", ""],
      ["p-999", "100000", "", ""],
      ["p-003", "abc", "", ""],
    ];
    const preview = await importProducts(db, sheet, false);
    expect(preview).toMatchObject({
      ok: true,
      applied: false,
      rows: [
        { line: 2, action: "update", changes: ["price", "stock"] },
        { line: 3, action: "same" },
        { line: 4, action: "error", reason: "unknownCode" },
        { line: 5, action: "error", fields: ["price"] },
      ],
    });
    expect((await product("p-001")).price).toBe(before.price);

    await importProducts(db, sheet, true);
    const after = await product("p-001");
    expect(after).toMatchObject({ price: before.price + 10_000, stock: 3, inStock: true, version: before.version + 1 });
  });

  it("adds products from names in either language and asks for what is missing", async () => {
    const report = await importProducts(
      db,
      [
        ["Brend", "Model", "Тип", "Категория", "Цена", "Rang", "Soni"],
        ["Artel", "HD 455", "Muzlatgich", "Крупная техника", "4 500 000", "Oq", "0"],
        ["Artel", "Nothing", "", "", "100000", "", ""],
      ],
      true,
    );
    expect(report).toMatchObject({
      ok: true,
      rows: [
        { action: "create", id: expect.stringMatching(/^p-\d+$/) },
        { action: "error", reason: "required", fields: ["category", "art", "color"] },
      ],
    });
    if (!report.ok || report.rows[0]!.action !== "create") throw new Error("no product");
    expect(await product(report.rows[0]!.id!)).toMatchObject({ brand: "Artel", art: "fridge", color: "white", stock: 0, inStock: false });
  });

  it("refuses files it cannot read", async () => {
    expect(await importProducts(db, [["a", "b"], ["1", "2"]], false)).toEqual({ ok: false, error: "header" });
    expect(await importProducts(db, [["Kod"]], false)).toEqual({ ok: false, error: "empty" });
  });

  it("gives out a file that loads back unchanged", async () => {
    const csv = await exportProducts(db, "uz");
    expect(csv.startsWith("﻿Kod;Kategoriya;Turi;Brend")).toBe(true);
    const report = await importProducts(db, parseCsv(csv), false);
    expect(report.ok && report.rows.every((row) => row.action === "same")).toBe(true);
  });
});
