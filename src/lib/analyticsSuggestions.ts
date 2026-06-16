import { AnalyticsQuestion, TABS, dimensionKind } from "./analyticsConfig";

export interface Suggestion {
  label: string;
  patch: Partial<AnalyticsQuestion>;
}

export function buildSuggestions(q: AnalyticsQuestion): Suggestion[] {
  const out: Suggestion[] = [];
  const kind = dimensionKind(q.tab, q.dimension);
  const dims = TABS[q.tab].dimensions;

  if (kind === "time") {
    const programme = dims.find((d) => d.key === "programme");
    const county = dims.find((d) => d.key === "county");
    const project = dims.find((d) => d.key === "project");
    if (programme) out.push({ label: "How does this differ by Programme?", patch: { dimension: "programme" } });
    if (county) out.push({ label: "Where geographically is this concentrated?", patch: { dimension: "county" } });
    if (project) out.push({ label: "Which Project drove the latest change?", patch: { dimension: "project" } });
  } else {
    out.push({ label: "How has this shifted over the past year?", patch: { dimension: "month", range: "12mo" } });
    const county = dims.find((d) => d.key === "county");
    if (county && q.dimension !== "county") {
      out.push({ label: "Is the trend consistent across counties?", patch: { dimension: "county" } });
    }
  }

  if (q.tab === "money") {
    out.push({ label: "Which donors contributed most?", patch: { dimension: "donor" } });
    out.push({ label: "What was the FX exposure during this period?", patch: {} });
  }

  return out.slice(0, 5);
}