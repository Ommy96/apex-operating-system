/**
 * Client-side export helpers for the Analytics & Reporting Center.
 *
 * - `exportToCsv` – flattens a record array into a downloadable CSV.
 * - `exportToXlsx` – multi-sheet workbook (one sheet per dataset).
 * - `exportElementToPdf` – snapshots a DOM node (e.g. the active analytics
 *   tab) into a single-page A4 PDF using html2canvas + jsPDF.
 */

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function toFilename(base: string, ext: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base.replace(/\s+/g, "-").toLowerCase()}-${stamp}.${ext}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Convert array of plain objects → CSV (handles commas, quotes, newlines). */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Array.from(
    rows.reduce<Set<string>>((acc, r) => {
      Object.keys(r).forEach((k) => acc.add(k));
      return acc;
    }, new Set()),
  );
  const escape = (v: unknown) => {
    if (v == null) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const body = rows.map((r) => headers.map((h) => escape(r[h])).join(","));
  return [headers.join(","), ...body].join("\n");
}

export function exportToCsv(rows: Record<string, unknown>[], baseName: string) {
  const csv = toCsv(rows);
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), toFilename(baseName, "csv"));
}

/** Multi-sheet workbook. Pass a map of sheetName → rows. */
export function exportToXlsx(
  sheets: Record<string, Record<string, unknown>[]>,
  baseName: string,
) {
  const wb = XLSX.utils.book_new();
  Object.entries(sheets).forEach(([name, rows]) => {
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
    XLSX.utils.book_append_sheet(wb, sheet, name.slice(0, 31));
  });
  const blob = new Blob([XLSX.write(wb, { type: "array", bookType: "xlsx" })], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, toFilename(baseName, "xlsx"));
}

/**
 * Snapshot a DOM node into a PDF file. The capture matches the user's
 * current view, then is fitted to A4 landscape.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  baseName: string,
) {
  // White background avoids transparent areas appearing dark in PDF
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  const imgWidth = canvas.width * ratio;
  const imgHeight = canvas.height * ratio;
  const x = (pageWidth - imgWidth) / 2;
  const y = (pageHeight - imgHeight) / 2;
  pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
  pdf.save(toFilename(baseName, "pdf"));
}