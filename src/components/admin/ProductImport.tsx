"use client";

import { useRef, useState } from "react";
import { AlertCircle, Check, Download, FileSpreadsheet, Minus, Plus, RefreshCw, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { readSpreadsheet, type Sheet } from "@/lib/spreadsheet";
import { exportProductsAction, importProductsAction } from "@/server/admin/actions";
import type { ImportReport, ImportRow } from "@/server/admin/import";

const card = "glass enter rounded-[1.5rem] p-5 sm:p-6";

const columnKeys = [
  "id",
  "category",
  "art",
  "brand",
  "model",
  "price",
  "oldPrice",
  "stock",
  "inStock",
  "color",
  "warranty",
  "image",
  "active",
  "badge",
  "specs",
] as const;

/** Load many products from Excel: download the list, edit it, load it back, check, save. */
export function ProductImport() {
  const t = useTranslations("admin.import");
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [report, setReport] = useState<Extract<ImportReport, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"export" | "read" | "apply" | null>(null);

  const column = (key: string) => ((columnKeys as readonly string[]).includes(key) ? t(`columns.${key}`) : key);

  async function download() {
    setBusy("export");
    try {
      const csv = await exportProductsAction();
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `multimedia-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError(t("errors.server"));
    } finally {
      setBusy(null);
    }
  }

  async function check(rows: Sheet, apply: boolean) {
    setBusy(apply ? "apply" : "read");
    setError(null);
    try {
      const result = await importProductsAction(rows, apply);
      if (!result.ok) {
        setReport(null);
        setError(t(`errors.${result.error}`));
      } else setReport(result);
    } catch {
      setError(t("errors.server"));
    } finally {
      setBusy(null);
    }
  }

  async function choose(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setReport(null);
    setError(null);
    if (file.size > 5_000_000) return setError(t("errors.tooLarge"));
    try {
      const rows = await readSpreadsheet(file);
      setSheet(rows);
      await check(rows, false);
    } catch {
      setSheet(null);
      setError(t("errors.file"));
    }
  }

  const counts = report && {
    create: report.rows.filter((row) => row.action === "create").length,
    update: report.rows.filter((row) => row.action === "update").length,
    same: report.rows.filter((row) => row.action === "same").length,
    error: report.rows.filter((row) => row.action === "error").length,
  };
  const pending = counts ? counts.create + counts.update : 0;

  return (
    <>
      <section className={card}>
        <h2 className="text-[0.9375rem] font-semibold">{t("step1")}</h2>
        <p className="mt-1 text-sm text-muted">{t("step1Text")}</p>
        <button type="button" onClick={download} disabled={busy !== null} className="btn btn-ghost mt-4">
          <Download className="size-4" strokeWidth={1.8} />
          {t("download")}
        </button>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium text-muted">{t("columnsTitle")}</summary>
          <ul className="mt-2 grid gap-1.5 text-muted sm:grid-cols-2">
            {(["id", "brand", "model", "art", "category", "price", "oldPrice", "stock", "inStock", "color", "warranty", "image", "active"] as const).map(
              (key) => (
                <li key={key}>
                  <span className="font-medium text-ink">{column(key)}</span> — {t(`help.${key}`)}
                </li>
              ),
            )}
          </ul>
        </details>
      </section>

      <section className={card}>
        <h2 className="text-[0.9375rem] font-semibold">{t("step2")}</h2>
        <p className="mt-1 text-sm text-muted">{t("step2Text")}</p>
        <input
          ref={input}
          type="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="sr-only"
          id="import-file"
          onChange={(event) => {
            void choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <label
          htmlFor="import-file"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void choose(event.dataTransfer.files[0]);
          }}
          className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-[1.25rem] border border-dashed border-hairline px-4 py-8 text-center transition-colors duration-300 hover:border-accent"
        >
          <span className="grid size-11 place-items-center rounded-2xl bg-accent-soft text-accent">
            {busy === "read" ? <RefreshCw className="size-5 animate-spin" strokeWidth={1.8} /> : <Upload className="size-5" strokeWidth={1.8} />}
          </span>
          <span className="text-sm font-medium">{fileName ?? t("choose")}</span>
          <span className="text-xs text-muted">{t("formats")}</span>
        </label>
        {error && (
          <p className="mt-3 flex items-start gap-2 text-sm text-danger" role="alert">
            <AlertCircle className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
            {error}
          </p>
        )}
      </section>

      {report && counts && (
        <section className={card} aria-live="polite">
          <h2 className="text-[0.9375rem] font-semibold">{report.applied ? t("doneTitle") : t("step3")}</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full bg-accent-soft px-3 py-1.5 text-accent">{t("counts.create", { count: counts.create })}</span>
            <span className="rounded-full bg-accent-soft px-3 py-1.5 text-accent">{t("counts.update", { count: counts.update })}</span>
            <span className="rounded-full border border-hairline px-3 py-1.5 text-muted">{t("counts.same", { count: counts.same })}</span>
            {counts.error > 0 && (
              <span className="rounded-full bg-danger/10 px-3 py-1.5 text-danger">{t("counts.error", { count: counts.error })}</span>
            )}
          </div>

          <ul className="mt-4 max-h-[28rem] divide-y divide-hairline overflow-y-auto">
            {report.rows
              .filter((row) => row.action !== "same")
              .map((row) => (
                <ReportLine key={row.line} row={row} applied={report.applied} column={column} />
              ))}
          </ul>

          {!report.applied && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={busy !== null || pending === 0 || !sheet}
                onClick={() => sheet && check(sheet, true)}
                className="btn btn-primary"
              >
                {busy === "apply" ? <RefreshCw className="size-4 animate-spin" strokeWidth={1.8} /> : <Check className="size-4" strokeWidth={2} />}
                {t("apply", { count: pending })}
              </button>
              {counts.error > 0 && <p className="text-xs text-muted">{t("errorsSkipped")}</p>}
            </div>
          )}
          {report.applied && (
            <Link href="/admin/products" className="btn btn-ghost mt-4">
              <FileSpreadsheet className="size-4" strokeWidth={1.8} />
              {t("toProducts")}
            </Link>
          )}
        </section>
      )}
    </>
  );
}

function ReportLine({ row, applied, column }: { row: ImportRow; applied: boolean; column: (key: string) => string }) {
  const t = useTranslations("admin.import");
  const Icon = row.action === "create" ? Plus : row.action === "update" ? RefreshCw : row.action === "error" ? AlertCircle : Minus;
  return (
    <li className="flex items-start gap-3 py-2.5 text-sm">
      <Icon className={`mt-0.5 size-4 shrink-0 ${row.action === "error" ? "text-danger" : "text-accent"}`} strokeWidth={1.8} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          <span className="mr-2 text-xs tabular-nums text-faint">{t("line", { line: row.line })}</span>
          {row.title}
          {row.id && <span className="ml-2 text-xs text-muted">{row.id.toUpperCase()}</span>}
        </p>
        <p className={`mt-0.5 text-xs ${row.action === "error" ? "text-danger" : "text-muted"}`}>
          {row.action === "error"
            ? row.reason === "unknownCode"
              ? t("unknownCode")
              : t(row.reason === "required" ? "required" : "badFields", { fields: row.fields.map(column).join(", ") })
            : row.action === "create"
              ? t(applied ? "created" : "willCreate")
              : row.action === "update"
                ? t(applied ? "updated" : "willUpdate", { fields: row.changes.map(column).join(", ") })
                : null}
        </p>
      </div>
    </li>
  );
}
