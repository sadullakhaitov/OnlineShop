import type { Db } from "@/db";
import { products, type ProductRow } from "@/db/schema";
import { categories } from "@/data/categories";
import { artKinds, colorKeys, kinds, type ArtKind, type ColorKey } from "@/data/products";
import type { ProductField, ProductInput } from "@/lib/product-input";
import uz from "../../../messages/uz.json";
import ru from "../../../messages/ru.json";
import { createProduct, parseProduct, updateProduct } from "./products";

/**
 * Many products at once from a spreadsheet. A row with a known code changes
 * that product, only in the columns that are filled; a row without a code
 * adds a product. The admin first sees what would happen, then applies it.
 */

export const IMPORT_LIMITS = { rows: 1000, columns: 30, cell: 600 } as const;

export type ImportColumn =
  | "id"
  | "category"
  | "art"
  | "brand"
  | "model"
  | "price"
  | "oldPrice"
  | "stock"
  | "inStock"
  | "color"
  | "warranty"
  | "image"
  | "active";

/** The heading of each column in the file the shop gives out, and what else is understood. */
export const COLUMN_NAMES: Record<ImportColumn, string[]> = {
  id: ["Kod", "Код", "code", "id", "sku", "artikul", "артикул"],
  category: ["Kategoriya", "Категория", "category"],
  art: ["Turi", "Тип", "type", "kind", "vid", "вид"],
  brand: ["Brend", "Бренд", "brand", "marka", "марка"],
  model: ["Model", "Модель"],
  price: ["Narx", "Цена", "price", "narxi"],
  oldPrice: ["Eski narx", "Старая цена", "old price", "oldprice"],
  stock: ["Soni", "Остаток", "stock", "qoldiq", "количество", "ombor"],
  inStock: ["Sotuvda", "В наличии", "in stock", "instock", "mavjud"],
  color: ["Rang", "Цвет", "color"],
  warranty: ["Kafolat", "Гарантия", "warranty"],
  image: ["Rasm", "Фото", "image", "photo", "rasm havolasi"],
  active: ["Ko'rinadi", "Показывать", "active", "visible"],
};

const columns = Object.keys(COLUMN_NAMES) as ImportColumn[];
const key = (value: string) => value.toLowerCase().replace(/[ʻʼ‘’`']/g, "'").replace(/\s+/g, " ").trim();

function headerMap(header: string[]): Map<number, ImportColumn> {
  const map = new Map<number, ImportColumn>();
  header.forEach((title, index) => {
    const column = columns.find((name) => COLUMN_NAMES[name].some((alias) => key(alias) === key(title)));
    if (column && ![...map.values()].includes(column)) map.set(index, column);
  });
  return map;
}

// Names are accepted as the shop writes them, in either language, or as codes.
const byName = <T extends string>(entries: [T, string[]][]) => {
  const map = new Map<string, T>();
  for (const [code, names] of entries) for (const name of [code, ...names]) map.set(key(name), code);
  return (value: string) => map.get(key(value));
};
const findArt = byName<ArtKind>(artKinds.map((art) => [art, [kinds[art].name.uz, kinds[art].name.ru]]));
const findCategory = byName<string>(categories.map((category) => [category.slug, [category.name.uz, category.name.ru]]));
const findColor = byName<ColorKey>(colorKeys.map((color) => [color, [uz.colors[color], ru.colors[color]]]));

/** "8 990 000", "8990000", "8 990 000 so'm" and Excel's "8990000.0" are one price. */
function readNumber(value: string): number | undefined {
  const cleaned = value.replace(/[\s ]/g, "").replace(/so'?m|сум|uzs/gi, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined;
  return Math.round(Number(cleaned));
}

const yes = ["ha", "bor", "yes", "да", "есть", "1", "true", "+"];
const no = ["yo'q", "yoq", "no", "нет", "0", "false", "-"];
function readFlag(value: string): boolean | undefined {
  const word = key(value);
  return yes.includes(word) ? true : no.includes(word) ? false : undefined;
}

type Draft = Partial<Omit<ProductInput, "specs" | "badge">>;

/** One row of the file; `bad` names the columns whose values could not be read. */
function readRow(row: string[], map: Map<number, ImportColumn>): { id?: string; draft: Draft; bad: ImportColumn[] } {
  const draft: Draft = {};
  const bad: ImportColumn[] = [];
  let id: string | undefined;
  for (const [index, column] of map) {
    const value = (row[index] ?? "").trim();
    if (!value) continue;
    const read = (): unknown => {
      switch (column) {
        case "id":
          return (id = value.toLowerCase());
        case "category":
          return (draft.category = findCategory(value));
        case "art":
          return (draft.art = findArt(value));
        case "color":
          return (draft.color = findColor(value));
        case "brand":
        case "model":
          return (draft[column] = value);
        case "image":
          return (draft.image = value);
        case "price":
        case "warranty":
        case "stock":
          return (draft[column] = readNumber(value));
        case "oldPrice": {
          const number = readNumber(value);
          // 0 takes the crossed-out price away.
          draft.oldPrice = number === 0 ? null : number;
          return number;
        }
        case "inStock":
        case "active":
          return (draft[column] = readFlag(value));
      }
    };
    if (read() === undefined) bad.push(column);
  }
  return { id, draft, bad };
}

const asInput = (product: ProductRow): ProductInput => ({
  category: product.category,
  art: product.art,
  brand: product.brand,
  model: product.model,
  price: product.price,
  oldPrice: product.oldPrice,
  badge: product.badge,
  color: product.color,
  warranty: product.warranty,
  inStock: product.inStock,
  active: product.active,
  specs: product.specs,
  image: product.image,
  stock: product.stock,
});

const shown: Exclude<ImportColumn, "id">[] = ["category", "art", "brand", "model", "price", "oldPrice", "stock", "inStock", "color", "warranty", "image", "active"];

export type ImportRow = {
  /** The line in the file, counted as the spreadsheet does */
  line: number;
  title: string;
  id?: string;
} & (
  | { action: "create" | "update"; changes: ImportColumn[] }
  | { action: "same" }
  | { action: "error"; fields: (ImportColumn | ProductField)[]; reason?: "unknownCode" | "required" }
);

export type ImportReport =
  | { ok: true; rows: ImportRow[]; applied: boolean }
  | { ok: false; error: "empty" | "header" | "tooLarge" };

/** Reads the sheet and, when `apply` is set, saves every row that has no mistake. */
export async function importProducts(db: Db, sheet: unknown, apply: boolean): Promise<ImportReport> {
  if (!Array.isArray(sheet) || sheet.length < 2) return { ok: false, error: "empty" };
  if (sheet.length > IMPORT_LIMITS.rows + 1) return { ok: false, error: "tooLarge" };
  const rows = sheet.map((row) =>
    Array.isArray(row) ? row.slice(0, IMPORT_LIMITS.columns).map((cell) => String(cell ?? "").slice(0, IMPORT_LIMITS.cell)) : [],
  );

  const map = headerMap(rows[0]!);
  const known = new Set(map.values());
  // Without prices or codes there is nothing to do with the file.
  if (!known.has("id") && !(known.has("brand") && known.has("model"))) return { ok: false, error: "header" };

  const existing = new Map((await db.select().from(products)).map((product) => [product.id, product]));
  const report: ImportRow[] = [];

  for (const [index, row] of rows.slice(1).entries()) {
    const line = index + 2;
    if (!row.some((cell) => cell.trim())) continue;
    const { id, draft, bad } = readRow(row, map);
    const current = id ? existing.get(id) : undefined;
    const title = current ? `${current.brand} ${current.model}` : [draft.brand, draft.model].filter(Boolean).join(" ") || "—";

    if (bad.length > 0) {
      report.push({ line, title, id, action: "error", fields: bad });
      continue;
    }
    if (id && !current) {
      report.push({ line, title, id, action: "error", fields: ["id"], reason: "unknownCode" });
      continue;
    }

    if (current) {
      const before = asInput(current);
      const input: ProductInput = { ...before, ...draft };
      const parsed = parseProduct(input);
      if (!parsed.ok) {
        report.push({ line, title, id, action: "error", fields: parsed.fields });
        continue;
      }
      const changes = shown.filter((column) => parsed.values[column] !== before[column]);
      if (changes.length === 0) {
        report.push({ line, title, id, action: "same" });
        continue;
      }
      if (apply) {
        const saved = await updateProduct(db, current.id, current.version, input);
        if (!saved.ok) {
          report.push({ line, title, id, action: "error", fields: saved.error === "invalid" ? saved.fields : ["id"] });
          continue;
        }
        existing.set(current.id, saved.product);
      }
      report.push({ line, title, id, action: "update", changes });
      continue;
    }

    const missing = (["category", "art", "brand", "model", "price", "color"] as const).filter((column) => draft[column] === undefined);
    if (missing.length > 0) {
      report.push({ line, title, action: "error", fields: missing, reason: "required" });
      continue;
    }
    const input: ProductInput = {
      category: draft.category!,
      art: draft.art!,
      brand: draft.brand!,
      model: draft.model!,
      price: draft.price!,
      oldPrice: draft.oldPrice ?? null,
      badge: null,
      color: draft.color!,
      warranty: draft.warranty ?? 1,
      inStock: draft.inStock ?? true,
      active: draft.active ?? true,
      specs: {},
      image: draft.image ?? null,
      stock: draft.stock ?? null,
    };
    const parsed = parseProduct(input);
    if (!parsed.ok) {
      report.push({ line, title, action: "error", fields: parsed.fields });
      continue;
    }
    let newId: string | undefined;
    if (apply) {
      const saved = await createProduct(db, input);
      if (!saved.ok) {
        report.push({ line, title, action: "error", fields: saved.error === "invalid" ? saved.fields : ["id"] });
        continue;
      }
      newId = saved.product.id;
    }
    report.push({ line, title, id: newId, action: "create", changes: shown.filter((column) => draft[column] !== undefined) });
  }

  return { ok: true, rows: report, applied: apply };
}

/** The whole catalogue as a CSV file Excel opens: edit it and load it back. */
export async function exportProducts(db: Db, locale: "uz" | "ru"): Promise<string> {
  const list = await db.select().from(products).orderBy(products.id);
  const t = locale === "ru" ? ru : uz;
  const head = columns.map((column) => COLUMN_NAMES[column][locale === "ru" ? 1 : 0]!);
  const flag = (value: boolean) => (value ? (locale === "ru" ? "да" : "ha") : locale === "ru" ? "нет" : "yo'q");
  const lines = list.map((product) =>
    [
      product.id,
      categories.find((category) => category.slug === product.category)?.name[locale] ?? product.category,
      kinds[product.art]?.name[locale] ?? product.art,
      product.brand,
      product.model,
      product.price,
      product.oldPrice ?? "",
      product.stock ?? "",
      flag(product.inStock),
      t.colors[product.color] ?? product.color,
      product.warranty,
      product.image ?? "",
      flag(product.active),
    ].map(csvCell),
  );
  // ";" and the byte order mark make Excel split the columns and read Cyrillic and o' correctly.
  return "﻿" + [head.map(csvCell), ...lines].map((line) => line.join(";")).join("\r\n") + "\r\n";
}

function csvCell(value: string | number): string {
  const text = String(value);
  // A cell starting with = + - @ would run as a formula in Excel.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
