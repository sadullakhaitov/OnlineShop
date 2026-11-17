/**
 * Reads the first sheet of an Excel (.xlsx) or CSV file in the browser, as
 * rows of text. An .xlsx file is a zip of XML files; the browser unpacks it
 * itself (DecompressionStream), so no library is needed.
 */

export type Sheet = string[][];

export async function readSpreadsheet(file: File): Promise<Sheet> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  // "PK": a zip, so Excel; anything else is read as CSV text.
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return readXlsx(bytes);
  return parseCsv(new TextDecoder().decode(bytes));
}

/** CSV with commas or semicolons (Excel in many locales saves with ";"), quotes and line breaks in cells. */
export function parseCsv(input: string): Sheet {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.slice(0, text.search(/\r?\n|$/));
  const separator = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: Sheet = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === separator) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows.filter((line) => line.some((value) => value.trim()));
}

type ZipEntry = { name: string; method: number; offset: number; size: number };

function zipEntries(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // The end of central directory record sits at the end, after an optional comment.
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("not-a-zip");
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const entries: ZipEntry[] = [];
  const names = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (view.getUint32(at, true) !== 0x02014b50) throw new Error("bad-zip");
    const method = view.getUint16(at + 10, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    const local = view.getUint32(at + 42, true);
    const name = names.decode(bytes.subarray(at + 46, at + 46 + nameLength));
    // The data starts after the local header, whose own name and extra field may differ in length.
    const offset = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    entries.push({ name, method, offset, size });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function unzipText(bytes: Uint8Array, entry: ZipEntry): Promise<string> {
  const data = bytes.slice(entry.offset, entry.offset + entry.size);
  if (entry.method === 0) return new TextDecoder().decode(data);
  if (entry.method !== 8) throw new Error("zip-method");
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}

/** "B12" → 1 (the column, counted from 0) */
function columnIndex(reference: string): number {
  let index = 0;
  for (const char of reference.replace(/\d+$/, "")) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

async function readXlsx(bytes: Uint8Array): Promise<Sheet> {
  const entries = zipEntries(bytes);
  const find = (name: string) => entries.find((entry) => entry.name === name);
  const parse = async (name: string) => {
    const entry = find(name);
    return entry ? new DOMParser().parseFromString(await unzipText(bytes, entry), "application/xml") : null;
  };

  // The first sheet in the workbook's order, wherever its file is.
  const [workbook, relations] = await Promise.all([parse("xl/workbook.xml"), parse("xl/_rels/workbook.xml.rels")]);
  const first = workbook?.getElementsByTagName("sheet")[0];
  const relationId = first?.getAttribute("r:id") ?? first?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
  const target = [...(relations?.getElementsByTagName("Relationship") ?? [])]
    .find((relation) => relation.getAttribute("Id") === relationId)
    ?.getAttribute("Target");
  const sheetPath = target ? (target.startsWith("/") ? target.slice(1) : `xl/${target}`) : "xl/worksheets/sheet1.xml";

  const [sheet, shared] = await Promise.all([parse(sheetPath), parse("xl/sharedStrings.xml")]);
  if (!sheet) throw new Error("no-sheet");
  const strings = [...(shared?.getElementsByTagName("si") ?? [])].map((item) =>
    [...item.getElementsByTagName("t")].map((t) => t.textContent ?? "").join(""),
  );

  const rows: Sheet = [];
  for (const rowNode of sheet.getElementsByTagName("row")) {
    const row: string[] = [];
    for (const cellNode of rowNode.getElementsByTagName("c")) {
      const reference = cellNode.getAttribute("r");
      const index = reference ? columnIndex(reference) : row.length;
      const type = cellNode.getAttribute("t");
      const raw = cellNode.getElementsByTagName("v")[0]?.textContent ?? "";
      const value =
        type === "s"
          ? (strings[Number(raw)] ?? "")
          : type === "inlineStr"
            ? [...cellNode.getElementsByTagName("t")].map((t) => t.textContent ?? "").join("")
            : raw;
      while (row.length < index) row.push("");
      row[index] = value;
    }
    rows.push(row);
  }
  return rows.filter((line) => line.some((value) => value.trim()));
}
