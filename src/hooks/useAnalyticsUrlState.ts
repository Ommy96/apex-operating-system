import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnalyticsQuestion, RangeKey, TABS, TabKey, defaultQuestion } from "@/lib/analyticsConfig";

function readFromParams(params: URLSearchParams): AnalyticsQuestion {
  const tab = (params.get("tab") as TabKey) || "people";
  const base = defaultQuestion(TABS[tab] ? tab : "people");
  const metric = params.get("metric") || base.metric;
  const dimension = params.get("dim") || base.dimension;
  const range = (params.get("range") as RangeKey) || base.range;
  const filters: Record<string, string> = {};
  params.forEach((value, key) => {
    if (key.startsWith("filter.")) filters[key.slice(7)] = value;
  });
  const breakdowns = (params.get("break") || "").split(",").filter(Boolean);
  const drillDimension = params.get("drill_dim");
  const drillValue = params.get("drill_val");
  return {
    tab,
    metric,
    dimension,
    range,
    filters,
    breakdowns,
    drillDown: drillDimension && drillValue ? { dimension: drillDimension, value: drillValue } : undefined,
  };
}

function writeToParams(q: AnalyticsQuestion): URLSearchParams {
  const p = new URLSearchParams();
  p.set("tab", q.tab);
  if (q.metric) p.set("metric", q.metric);
  if (q.dimension) p.set("dim", q.dimension);
  if (q.range) p.set("range", q.range);
  Object.entries(q.filters).forEach(([k, v]) => { if (v) p.set(`filter.${k}`, v); });
  if (q.breakdowns.length) p.set("break", q.breakdowns.join(","));
  if (q.drillDown) {
    p.set("drill_dim", q.drillDown.dimension);
    p.set("drill_val", q.drillDown.value);
  }
  return p;
}

export function useAnalyticsUrlState() {
  const [params, setParams] = useSearchParams();
  const [question, setQuestion] = useState<AnalyticsQuestion>(() => readFromParams(params));

  // Push question → URL
  useEffect(() => {
    const next = writeToParams(question);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question]);

  const update = useCallback((patch: Partial<AnalyticsQuestion>) => {
    setQuestion((prev) => {
      const merged: AnalyticsQuestion = { ...prev, ...patch };
      // If tab changed, reset to that tab's defaults but honour patch
      if (patch.tab && patch.tab !== prev.tab) {
        const base = defaultQuestion(patch.tab);
        return { ...base, ...patch };
      }
      // If metric changed without explicit dimension, default it
      if (patch.metric && !patch.dimension) {
        const m = TABS[merged.tab].metrics.find((x) => x.key === patch.metric);
        if (m) merged.dimension = m.defaultDimension;
      }
      return merged;
    });
  }, []);

  const reset = useCallback(() => setQuestion(defaultQuestion(question.tab)), [question.tab]);

  const sentence = useMemo(() => question, [question]);
  return { question: sentence, update, reset, setQuestion };
}