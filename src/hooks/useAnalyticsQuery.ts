import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnalyticsQuestion, TABS } from "@/lib/analyticsConfig";

export interface AnalyticsResult {
  headline: { value: number; previousValue: number | null; lastUpdated: string };
  series: Array<{ key: string; label: string; value: number }>;
  chartType: "line" | "bar" | "choropleth";
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
    queryKey: ["analytics", q.tab, q.metric, q.dimension, q.filters, q.range, q.drillDown],
    queryFn: () => fetchAnalytics(q),
    enabled: enabled && !!q.metric && !!q.dimension && tabImpl,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}