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