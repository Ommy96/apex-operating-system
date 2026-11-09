import { describe, expect, it } from 'vitest';
import { buildAnalyticsReport } from '../analyticsReport';
import { defaultQuestion } from '../analyticsConfig';
import { generateAnalyticsFile, toCsv } from '../analyticsExport';
import * as XLSX from 'xlsx';
const readBlob = (blob: Blob, mode: 'text' | 'buffer') => new Promise<string | ArrayBuffer>((resolve, reject) => {
  const reader = new FileReader(); reader.onerror = () => reject(reader.error);
  reader.onload = () => { if (typeof reader.result === 'string' || reader.result instanceof ArrayBuffer) resolve(reader.result); else reject(new Error('Empty file')); };
  if (mode === 'text') reader.readAsText(blob); else reader.readAsArrayBuffer(blob);
});

describe('structured analytics exports', () => {
  const report = buildAnalyticsReport(defaultQuestion('people'), { headline: { value: 10, previousValue: null, lastUpdated: '2026-11-09T19:00:00Z' }, series: [{ key: 'A', label: 'A', value: 10, n: 10 }], chartType: 'bar', context: { periodStart: '2026-01-01', periodEnd: '2026-11-09', filters: {}, unitOfAnalysis: 'Unique beneficiaries', definition: 'Distinct beneficiary IDs', denominator: 10, limitations: ['Accessible records only'] } }, 'Test organisation');
  it('retains figures and context in all structured formats', async () => {
    expect(report.detail[0].value).toBe(10);
    const csv = await generateAnalyticsFile(report, 'csv');
    expect(await readBlob(csv, 'text')).toContain('Unique beneficiaries');
    const excel = await generateAnalyticsFile(report, 'xlsx');
    const wb = XLSX.read(await readBlob(excel, 'buffer'), { type: 'array' });
    expect(wb.SheetNames).toEqual(['Summary', 'Detail', 'Data dictionary']);
    expect(XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.Detail)[0].value).toBe(10);
    const pdf = await generateAnalyticsFile(report, 'pdf');
    expect(pdf.size).toBeGreaterThan(1000); expect(String(await readBlob(pdf, 'text')).startsWith('%PDF')).toBe(true);
  });
  it('does not turn suppressed values into zero', () => {
    const hidden = buildAnalyticsReport(defaultQuestion('people'), { headline: { value: null, previousValue: null, lastUpdated: '2026-11-09' }, series: [{ key: 'A', label: 'A', value: null }], chartType: 'bar' }, 'Org');
    expect(hidden.detail[0].value).toBeNull();
  });
  it('neutralizes spreadsheet formula injection', () => expect(toCsv([{ category: '=HYPERLINK("unsafe")' }])).toContain("'=HYPERLINK"));
});