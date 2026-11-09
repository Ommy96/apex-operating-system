import type { AnalyticsResult } from '@/hooks/useAnalyticsQuery';
import type { AnalyticsQuestion } from './analyticsConfig';
import { metricDef, RANGES } from './analyticsConfig';

export interface AnalyticsReport {
  title: string; organisation: string; timestamp: string; period: string; filters: string; unit: string;
  summary: Record<string, unknown>[]; detail: Record<string, unknown>[]; dictionary: Record<string, unknown>[];
}
export function buildAnalyticsReport(q: AnalyticsQuestion, result: AnalyticsResult, organisation: string): AnalyticsReport {
  const context = result.context;
  const title = metricDef(q.tab, q.metric)?.label ?? q.metric;
  const period = context ? `${context.periodStart} – ${context.periodEnd}` : RANGES.find(r => r.key === q.range)?.label ?? q.range;
  const filters = JSON.stringify({ ...q.filters, ...(q.drillDown ? { [q.drillDown.dimension]: q.drillDown.value } : {}) });
  const common = { title, organisation, timestamp: result.headline.lastUpdated, period, active_filters: filters, unit_of_analysis: context?.unitOfAnalysis ?? 'Recorded data', definition: context?.definition ?? 'Definition unavailable', denominator: context?.denominator ?? null, limitations: context?.limitations.join(' ') ?? 'Reporting context unavailable', minimum_cell_size: result.privacy?.minimumCellSize ?? 5 };
  const detail: Record<string, unknown>[] = result.series.map(s => ({ ...common, section: 'Main chart', dimension: q.dimension, category: s.label, value: s.value, cell_n: s.n ?? null, note: s.note ?? '' }));
  result.matrix?.rows.forEach((r, i) => result.matrix?.cols.forEach((c, j) => detail.push({ ...common, section: 'Cross-tab', dimension: result.matrix?.dimA, category: r.label, second_dimension: result.matrix?.dimB, second_category: c.label, value: result.matrix?.cells[i]?.[j] ?? null, note: result.privacy?.suppressed ? 'Suppression applies; do not derive marginal totals.' : '' })));
  result.distributions?.forEach(d => d.series.forEach(s => detail.push({ ...common, section: d.label, dimension: d.dimension, category: s.label, value: s.value, cell_n: s.n ?? null, note: s.note ?? '' })));
  return { title, organisation, timestamp: common.timestamp, period, filters, unit: common.unit_of_analysis, summary: [{ ...common, section: 'Summary', value: result.headline.value, previous_value: result.headline.previousValue }], detail, dictionary: [
    { field: 'value', definition: common.definition, denominator: common.denominator, unit: common.unit_of_analysis },
    { field: 'cell_n', definition: 'Number of supporting records; blank when suppressed or unavailable.' },
    { field: 'blank_value', definition: 'Suppressed or unavailable; never interpret as zero.' },
    { field: 'privacy', definition: `Minimum cell size ${common.minimum_cell_size}; complementary suppression prevents inference.` },
    { field: 'limitations', definition: common.limitations },
  ] };
}