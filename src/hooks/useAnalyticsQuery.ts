import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnalyticsQuestion, TABS } from "@/lib/analyticsConfig";

export interface SeriesRow { key: string; label: string; value: number; note?: string }

export interface MatrixResult {
  dimA: string;
  dimB: string;
  rows: Array<{ key: string; label: string }>;
  cols: Array<{ key: string; label: string }>;
  cells: number[][];
  suggested: "grouped" | "stacked" | "heatmap" | "multiline";
  observations: string[];
}

export interface Distribution {
  key: string;
  label: string;
  dimension: string;
  chart: "donut" | "bar" | "pyramid" | "stacked";
  series: SeriesRow[];
  splitKeys?: string[];
  splitRows?: Array<{ key: string; label: string; values: number[] }>;
}

export interface AnalyticsStats {
  n: number;
  total: number;
  mean: number | null;
  median: number | null;
  min: { label: string; value: number } | null;
  max: { label: string; value: number } | null;
  modal: { label: string; value: number } | null;
  pctChange: number | null;
}

export interface AnalyticsResult {
  headline: { value: number; previousValue: number | null; previousReason?: string; lastUpdated: string };
  series: SeriesRow[];
  chartType: "line" | "bar" | "choropleth";
  matrix?: MatrixResult;
  distributions?: Distribution[];
  stats?: AnalyticsStats;
  mode?: "cumulative" | "new";
  error?: string;
  message?: string;
}

async function fetchAnalytics(q: AnalyticsQuestion): Promise<AnalyticsResult> {
  const filters = { ...q.filters };
  if (q.drillDown) filters[q.drillDown.dimension] = q.drillDown.value;

  if (q.tab === 'impact' && q.metric === 'approved_achievement') {
    const { data: orgId, error: orgError } = await supabase.rpc('get_user_organization_id');
    if (orgError) throw orgError;
    const now = new Date(); let start = new Date(now);
    if (q.range === 'all') start = new Date('2000-01-01');
    else if (q.range === 'ytd') start = new Date(now.getFullYear(), 0, 1);
    else if (q.range === 'last-year') { start = new Date(now.getFullYear() - 1, 0, 1); now.setFullYear(now.getFullYear() - 1, 11, 31); }
    else if (q.range === '30d' || q.range === '90d') start.setDate(start.getDate() - (q.range === '30d' ? 30 : 90));
    else start.setMonth(start.getMonth() - 12);
    const { data, error } = await (supabase as any).rpc('analytics_approved_results', { _org: orgId, _start: start.toISOString().slice(0,10), _end: now.toISOString().slice(0,10) });
    if (error) throw error;
    const rows = (data ?? []).filter((r: any) => r.snapshot.percent != null);
    const grouped = new Map<string, number[]>();
    rows.forEach((r: any) => { const key = q.dimension === 'month' ? r.period_start.slice(0,7) : r.snapshot.name; grouped.set(key, [...(grouped.get(key) ?? []), Number(r.snapshot.percent)]); });
    const series = [...grouped].map(([key, values]) => ({ key, label: key, value: values.reduce((a,b)=>a+b,0)/values.length, note: 'Approved period versions only' }));
    return { headline: { value: rows.length ? rows.reduce((a: number,r: any)=>a+Number(r.snapshot.percent),0)/rows.length : 0, previousValue: null, lastUpdated: now.toISOString() }, series, chartType: 'bar', message: rows.length ? 'Approved periods only; unavailable achievement is excluded.' : 'No approved results in this period.' };
  }
  const { data, error } = await supabase.functions.invoke("analytics-query", {
    body: {
      tab: q.tab,
      metric: q.metric,
      dimension: q.dimension,
      dimension2: q.dimension2 ?? null,
      mode: q.mode ?? "cumulative",
      filters,
      range: q.range,
    },
  });
  if (error) throw new Error(error.message);
  return data as AnalyticsResult;
}

export function useAnalyticsQuery(q: AnalyticsQuestion, enabled = true) {
  const tabImpl = TABS[q.tab]?.implemented;
  return useQuery({
    queryKey: ["analytics", q.tab, q.metric, q.dimension, q.dimension2, q.mode, q.filters, q.range, q.drillDown],
    queryFn: () => fetchAnalytics(q),
    enabled: enabled && !!q.metric && !!q.dimension && tabImpl,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}