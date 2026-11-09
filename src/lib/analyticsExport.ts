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
import autoTable from 'jspdf-autotable';
import type { AnalyticsReport } from './analyticsReport';
import { downloadBlob } from './fileDelivery';

function toFilename(base: string, ext: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base.replace(/\s+/g, "-").toLowerCase()}-${stamp}.${ext}`;
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
    const raw = typeof v === "object" ? JSON.stringify(v) : String(v);
    const s = /^[=+@\-]/.test(raw) && typeof v === 'string' ? `'${raw}` : raw;
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
export async function generateAnalyticsFile(report: AnalyticsReport, format: 'csv' | 'xlsx' | 'pdf', progress: (value: number) => void = () => {}): Promise<Blob> {
  progress(10);
  await new Promise(resolve => setTimeout(resolve, 0));
  const rows = [...report.summary, ...report.detail];
  if (format === 'csv') { progress(100); return new Blob(['\uFEFF', toCsv(rows)], { type: 'text/csv;charset=utf-8' }); }
  if (format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    for (const [name, records] of Object.entries({ Summary: report.summary, Detail: report.detail, 'Data dictionary': report.dictionary })) {
      const sheet = XLSX.utils.json_to_sheet(records);
      sheet['!cols'] = Object.keys(records[0] ?? {}).map(key => ({ wch: Math.min(60, Math.max(16, key.length + 4)) }));
      if (sheet['!ref']) sheet['!autofilter'] = { ref: sheet['!ref'] };
      XLSX.utils.book_append_sheet(wb, sheet, name);
      progress(name === 'Summary' ? 30 : name === 'Detail' ? 60 : 80);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true });
    progress(100); return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18);
  pdf.text(report.organisation, 36, 40); pdf.setFontSize(14); pdf.text(report.title, 36, 64);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
  const context = [`Generated: ${report.timestamp}`, `Period: ${report.period}`, `Filters: ${report.filters}`, `Unit of analysis: ${report.unit}`];
  let y = 86;
  for (const line of context) { const wrapped = pdf.splitTextToSize(line, 520); pdf.text(wrapped, 36, y); y += wrapped.length * 12 + 3; }
  autoTable(pdf, { startY: y + 8, head: [['Summary', 'Value']], body: report.summary.map(r => [report.title, r.value == null ? 'Suppressed / unavailable' : String(r.value)]), styles: { font: 'helvetica', fontSize: 9 }, theme: 'striped' });
  pdf.addPage(); pdf.setFontSize(14); pdf.text('Chart · ' + report.unit, 36, 40);
  const main = report.detail.filter(r => r.section === 'Main chart');
  const max = Math.max(1, ...main.map(r => typeof r.value === 'number' ? r.value : 0));
  y = 64;
  for (const row of main.slice(0, 16)) {
    const label = String(row.category ?? '').slice(0, 25);
    pdf.setFontSize(9); pdf.text(label, 36, y + 9);
    if (typeof row.value === 'number') { pdf.rect(185, y, Math.max(1, row.value / max * 245), 12, 'F'); pdf.text(String(row.value), 438, y + 9); }
    else pdf.text('Suppressed', 185, y + 9);
    y += 22;
  }
  if (main.length > 16) { pdf.text('Chart shows first 16 categories; complete figures are in the tables.', 36, y + 16); }
  progress(45);
  for (let offset = 0; offset < report.detail.length; offset += 500) {
    pdf.addPage();
    autoTable(pdf, { startY: 40, head: [['Section', 'Category', 'Second category', 'Value', 'n', 'Note']], body: report.detail.slice(offset, offset + 500).map(r => [String(r.section ?? ''), String(r.category ?? ''), String(r.second_category ?? ''), r.value == null ? 'Suppressed / unavailable' : String(r.value), r.cell_n == null ? '—' : String(r.cell_n), String(r.note ?? '')]), styles: { font: 'helvetica', fontSize: 8, cellWidth: 'wrap' }, columnStyles: { 0: { cellWidth: 75 }, 1: { cellWidth: 90 }, 2: { cellWidth: 80 }, 3: { cellWidth: 65 }, 4: { cellWidth: 35 }, 5: { cellWidth: 190 } }, margin: 30 });
    progress(45 + Math.round(Math.min(1, (offset + 500) / Math.max(1, report.detail.length)) * 40));
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  pdf.addPage();
  autoTable(pdf, { head: [['Data dictionary', 'Definition / limitations']], body: report.dictionary.map(r => [String(r.field), `${r.definition ?? ''}${r.denominator != null ? ` Denominator: ${r.denominator}` : ''}`]), styles: { fontSize: 9 }, margin: 36 });
  for (let page = 1; page <= pdf.getNumberOfPages(); page++) { pdf.setPage(page); pdf.setFontSize(8); pdf.text(`${report.organisation} · ApexOS · ${page}/${pdf.getNumberOfPages()}`, 36, 820); }
  progress(100); return pdf.output('blob');
}