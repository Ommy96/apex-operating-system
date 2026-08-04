// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

type Range =
  | "30d" | "90d" | "12mo" | "ytd" | "last-year" | "all"
  | { from: string; to: string };

interface Body {
  tab: string;
  metric: string;
  dimension: string;
  dimension2?: string | null;
  mode?: "cumulative" | "new";
  filters?: Record<string, string>;
  range?: Range;
  sourceTab?: string;
}

interface SeriesRow { key: string; label: string; value: number; note?: string }
interface MatrixResult {
  dimA: string; dimB: string;
  rows: Array<{ key: string; label: string }>;
  cols: Array<{ key: string; label: string }>;
  cells: number[][];
  suggested: "grouped" | "stacked" | "heatmap" | "multiline";
  observations: string[];
}
interface Distribution {
  key: string;
  label: string;
  dimension: string;
  chart: "donut" | "bar" | "pyramid" | "stacked";
  series: SeriesRow[];
  splitKeys?: string[];
  splitRows?: Array<{ key: string; label: string; values: number[] }>;
}
interface Stats {
  n: number;
  total: number;
  mean: number | null;
  median: number | null;
  min: { label: string; value: number } | null;
  max: { label: string; value: number } | null;
  modal: { label: string; value: number } | null;
  pctChange: number | null;
}
interface Result {
  headline: { value: number; previousValue: number | null; previousReason?: string; lastUpdated: string };
  series: SeriesRow[];
  chartType: "line" | "bar" | "choropleth";
  matrix?: MatrixResult;
  distributions?: Distribution[];
  stats?: Stats;
  mode?: "cumulative" | "new";
}

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const lower = (s: any) => (s ?? "").toString().trim().toLowerCase();

function resolveRange(range?: Range): { from: Date; to: Date; prevFrom: Date; prevTo: Date; isAll: boolean } {
  const now = new Date();
  const to = new Date(now);
  let from: Date;
  let isAll = false;
  if (!range || range === "12mo") {
    from = new Date(now); from.setMonth(from.getMonth() - 12);
  } else if (range === "30d") {
    from = new Date(now); from.setDate(from.getDate() - 30);
  } else if (range === "90d") {
    from = new Date(now); from.setDate(from.getDate() - 90);
  } else if (range === "ytd") {
    from = new Date(now.getFullYear(), 0, 1);
  } else if (range === "last-year") {
    from = new Date(now.getFullYear() - 1, 0, 1);
    to.setFullYear(now.getFullYear() - 1, 11, 31);
  } else if (range === "all") {
    from = new Date(2000, 0, 1); isAll = true;
  } else {
    from = new Date(range.from);
    to.setTime(new Date(range.to).getTime());
  }
  const span = to.getTime() - from.getTime();
  const prevTo = new Date(from);
  const prevFrom = new Date(from.getTime() - span);
  return { from, to, prevFrom, prevTo, isAll };
}

const TIME_DIMS = ["day", "week", "month"];
const isTimeDim = (d?: string | null) => !!d && TIME_DIMS.includes(d);

function bucketKey(d: Date, dim: string): string {
  if (!d || isNaN(d.getTime())) return "Unknown";
  if (dim === "day") return d.toISOString().slice(0, 10);
  if (dim === "week") {
    const tmp = new Date(d);
    tmp.setUTCDate(tmp.getUTCDate() - tmp.getUTCDay());
    return tmp.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 7);
}

/** Full ordered list of period keys between from..to so charts never truncate. */
function periodKeys(from: Date, to: Date, dim: string): string[] {
  const keys: string[] = [];
  if (dim === "month") {
    const c = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
    // guard against runaway loops on "all time"
    let guard = 0;
    while (c <= end && guard++ < 400) {
      keys.push(c.toISOString().slice(0, 7));
      c.setUTCMonth(c.getUTCMonth() + 1);
    }
  } else if (dim === "week") {
    const c = new Date(from); c.setUTCHours(0, 0, 0, 0);
    c.setUTCDate(c.getUTCDate() - c.getUTCDay());
    let guard = 0;
    while (c <= to && guard++ < 400) {
      keys.push(c.toISOString().slice(0, 10));
      c.setUTCDate(c.getUTCDate() + 7);
    }
  } else {
    const c = new Date(from); c.setUTCHours(0, 0, 0, 0);
    let guard = 0;
    while (c <= to && guard++ < 400) {
      keys.push(c.toISOString().slice(0, 10));
      c.setUTCDate(c.getUTCDate() + 1);
    }
  }
  return keys;
}

function ageBucket(dob: string | null): string {
  if (!dob) return "Unknown";
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  if (age < 0 || age > 120) return "Unknown";
  if (age < 6) return "0-5";
  if (age < 13) return "6-12";
  if (age < 18) return "13-17";
  if (age < 36) return "18-35";
  if (age < 61) return "36-60";
  return "60+";
}
const AGE_ORDER = ["0-5", "6-12", "13-17", "18-35", "36-60", "60+", "Unknown"];

function titleCase(s: string) {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------- generic aggregation ----------

interface Prepared {
  rows: any[];
  dateCol: string;
  /** value contributed by a row; default 1 (count) */
  weight?: (r: any) => number;
  /** average instead of sum */
  average?: boolean;
  dimOf: (r: any, dim: string) => string;
  /** dimensions offered in the distribution panel */
  distributionSpecs: Array<{ dimension: string; label: string; chart: Distribution["chart"]; split?: string }>;
  previousValue: number | null;
  previousReason?: string;
  /** override headline (else derived from rows) */
  headline?: number;
  /** running-total baseline for cumulative mode (count before window start) */
  cumulativeBase?: number;
  /** disable cumulative toggle (point-in-time metrics already cumulative) */
  pointInTime?: boolean;
  /** pre-built series (bypasses row aggregation) */
  series?: SeriesRow[];
  chartType?: Result["chartType"];
}

function aggregate(rows: any[], keyOf: (r: any) => string, weight: (r: any) => number, average: boolean) {
  const sums = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const r of rows) {
    const k = keyOf(r);
    sums.set(k, (sums.get(k) ?? 0) + weight(r));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const out = new Map<string, number>();
  for (const [k, v] of sums) out.set(k, average ? round2(v / (counts.get(k) || 1)) : round2(v));
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function orderKeys(keys: string[], dim: string): string[] {
  if (dim === "age_group") {
    return keys.slice().sort((a, b) => AGE_ORDER.indexOf(a) - AGE_ORDER.indexOf(b));
  }
  return keys;
}

function computeStats(series: SeriesRow[], headline: number, prev: number | null, n: number): Stats {
  const vals = series.map((s) => s.value);
  const total = vals.reduce((s, v) => s + v, 0);
  const sorted = vals.slice().sort((a, b) => a - b);
  const median = sorted.length
    ? sorted.length % 2 ? sorted[(sorted.length - 1) / 2]
      : round2((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
    : null;
  let min: Stats["min"] = null, max: Stats["max"] = null;
  for (const s of series) {
    if (!min || s.value < min.value) min = { label: s.label, value: s.value };
    if (!max || s.value > max.value) max = { label: s.label, value: s.value };
  }
  const modal = max;
  return {
    n,
    total: round2(total),
    mean: series.length ? round2(total / series.length) : null,
    median,
    min, max, modal,
    pctChange: prev && prev !== 0 ? round2(((headline - prev) / prev) * 100) : null,
  };
}

function buildMatrix(
  rows: any[],
  dimA: string,
  dimB: string,
  dimOf: Prepared["dimOf"],
  weight: (r: any) => number,
): MatrixResult {
  const cells = new Map<string, Map<string, number>>();
  const colSet = new Set<string>();
  for (const r of rows) {
    const a = dimOf(r, dimA);
    const b = dimOf(r, dimB);
    colSet.add(b);
    const m = cells.get(a) ?? new Map<string, number>();
    m.set(b, (m.get(b) ?? 0) + weight(r));
    cells.set(a, m);
  }
  let rowKeys = orderKeys(Array.from(cells.keys()), dimA);
  let colKeys = orderKeys(Array.from(colSet), dimB);
  if (!isTimeDim(dimA) && dimA !== "age_group") {
    rowKeys = rowKeys.sort((x, y) => totalOf(cells, y) - totalOf(cells, x));
  } else {
    rowKeys = rowKeys.sort();
  }
  if (isTimeDim(dimB)) colKeys = colKeys.sort();

  // cap categories to keep charts legible
  const MAX_COLS = 8;
  if (!isTimeDim(dimB) && colKeys.length > MAX_COLS) {
    const totals = colKeys.map((c) => ({ c, t: rowKeys.reduce((s, r) => s + (cells.get(r)?.get(c) ?? 0), 0) }));
    totals.sort((a, b) => b.t - a.t);
    const keep = totals.slice(0, MAX_COLS - 1).map((x) => x.c);
    const rest = colKeys.filter((c) => !keep.includes(c));
    for (const r of rowKeys) {
      const m = cells.get(r)!;
      const other = rest.reduce((s, c) => s + (m.get(c) ?? 0), 0);
      rest.forEach((c) => m.delete(c));
      if (other) m.set("Other", other);
    }
    colKeys = [...keep, "Other"];
  }
  const MAX_ROWS = 20;
  if (rowKeys.length > MAX_ROWS) rowKeys = rowKeys.slice(0, MAX_ROWS);

  const grid = rowKeys.map((r) => colKeys.map((c) => round2(cells.get(r)?.get(c) ?? 0)));

  // suggested rendering
  let suggested: MatrixResult["suggested"] = "grouped";
  if (isTimeDim(dimA) || isTimeDim(dimB)) suggested = "multiline";
  else if (rowKeys.length <= 6 && colKeys.length <= 8) suggested = "grouped";
  else suggested = "heatmap";

  // chi-square style plain-language observations
  const observations: string[] = [];
  const grand = grid.flat().reduce((s, v) => s + v, 0);
  if (grand > 0 && !isTimeDim(dimA) && !isTimeDim(dimB)) {
    const rowTotals = grid.map((r) => r.reduce((s, v) => s + v, 0));
    const colTotals = colKeys.map((_, j) => grid.reduce((s, r) => s + r[j], 0));
    const flags: Array<{ text: string; score: number }> = [];
    grid.forEach((row, i) => row.forEach((v, j) => {
      const expected = (rowTotals[i] * colTotals[j]) / grand;
      if (expected < 3 || v < 5) return;
      const ratio = v / expected;
      if (ratio >= 1.5 || ratio <= 0.5) {
        flags.push({
          score: Math.abs(v - expected),
          text: `${titleCase(rowKeys[i])} has notably ${ratio > 1 ? "more" : "fewer"} ${titleCase(colKeys[j])} than the organisation average (${Math.round(v)} vs ~${Math.round(expected)} expected).`,
        });
      }
    }));
    flags.sort((a, b) => b.score - a.score);
    observations.push(...flags.slice(0, 3).map((f) => f.text));
  }

  return {
    dimA, dimB,
    rows: rowKeys.map((k) => ({ key: k, label: k })),
    cols: colKeys.map((k) => ({ key: k, label: k })),
    cells: grid,
    suggested,
    observations,
  };
}

function totalOf(cells: Map<string, Map<string, number>>, key: string) {
  let t = 0;
  for (const v of cells.get(key)?.values() ?? []) t += v;
  return t;
}

function buildDistributions(p: Prepared): Distribution[] {
  const out: Distribution[] = [];
  const weight = p.weight ?? (() => 1);
  for (const spec of p.distributionSpecs) {
    if (spec.split) {
      const splitKeys = Array.from(new Set(p.rows.map((r) => p.dimOf(r, spec.split!)))).slice(0, 4);
      const rowKeys = orderKeys(Array.from(new Set(p.rows.map((r) => p.dimOf(r, spec.dimension)))), spec.dimension);
      const splitRows = rowKeys.map((rk) => ({
        key: rk, label: rk,
        values: splitKeys.map((sk) =>
          round2(p.rows.filter((r) => p.dimOf(r, spec.dimension) === rk && p.dimOf(r, spec.split!) === sk)
            .reduce((s, r) => s + weight(r), 0))),
      }));
      if (!splitRows.length) continue;
      out.push({
        key: `${spec.dimension}__${spec.split}`, label: spec.label, dimension: spec.dimension,
        chart: spec.chart,
        series: splitRows.map((r) => ({ key: r.key, label: r.label, value: r.values.reduce((s, v) => s + v, 0) })),
        splitKeys, splitRows,
      });
      continue;
    }
    const m = aggregate(p.rows, (r) => p.dimOf(r, spec.dimension), weight, !!p.average);
    let series = Array.from(m.entries()).map(([k, v]) => ({ key: k, label: k, value: v }));
    if (spec.dimension === "age_group") series = series.sort((a, b) => AGE_ORDER.indexOf(a.key) - AGE_ORDER.indexOf(b.key));
    else series = series.sort((a, b) => b.value - a.value);
    if (series.length > 8) {
      const top = series.slice(0, 8);
      const other = series.slice(8).reduce((s, x) => s + x.value, 0);
      series = [...top, { key: "Other", label: "Other", value: round2(other) }];
    }
    if (!series.length) continue;
    out.push({ key: spec.dimension, label: spec.label, dimension: spec.dimension, chart: spec.chart, series });
  }
  return out;
}

/** Detect bulk-import artifacts: >50 records sharing the same created_at date. */
function bulkNotes(rows: any[], dateCol: string, dim: string): Map<string, string> {
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const d = r[dateCol];
    if (!d) continue;
    const day = new Date(d).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  const notes = new Map<string, string>();
  for (const [day, n] of byDay) {
    if (n > 50) {
      const key = bucketKey(new Date(day), dim);
      const existing = notes.get(key);
      notes.set(key, existing ? `${existing}; bulk import — ${n} records on ${day}` : `bulk import — ${n} records on ${day}`);
    }
  }
  return notes;
}

async function finalize(
  supa: any, orgId: string, body: Body, p: Prepared, from: Date, to: Date,
): Promise<Result> {
  const dim = body.dimension;
  const dim2 = body.dimension2 && body.dimension2 !== dim ? body.dimension2 : null;
  const weight = p.weight ?? (() => 1);
  const timeDim = isTimeDim(dim);
  const mode: "cumulative" | "new" = p.pointInTime ? "cumulative" : (body.mode ?? "cumulative");

  let series: SeriesRow[];
  if (p.series) {
    series = p.series;
  } else {
    const m = aggregate(p.rows, (r) => p.dimOf(r, dim), weight, !!p.average);
    if (timeDim) {
      const keys = periodKeys(from, to, dim);
      const notes = bulkNotes(p.rows, p.dateCol, dim);
      let running = p.cumulativeBase ?? 0;
      series = keys.map((k) => {
        const v = m.get(k) ?? 0;
        running += v;
        const useCumulative = mode === "cumulative" && !p.average;
        return { key: k, label: k, value: useCumulative ? round2(running) : v, note: notes.get(k) };
      });
    } else {
      series = orderKeys(Array.from(m.keys()), dim).map((k) => ({ key: k, label: k, value: m.get(k) ?? 0 }));
      if (dim !== "age_group") series.sort((a, b) => b.value - a.value);
      if (series.length > 25) series = series.slice(0, 25);
    }
  }

  const headline = p.headline ?? (p.average
    ? (p.rows.length ? round2(p.rows.reduce((s, r) => s + weight(r), 0) / p.rows.length) : 0)
    : round2(p.rows.reduce((s, r) => s + weight(r), 0)));

  const matrix = dim2 && p.rows.length ? buildMatrix(p.rows, dim, dim2, p.dimOf, weight) : undefined;
  const distributions = p.rows.length ? buildDistributions(p) : [];

  const result: Result = {
    headline: {
      value: headline,
      previousValue: p.previousValue,
      previousReason: p.previousValue === null
        ? (p.previousReason ?? "No comparison period available for this metric")
        : undefined,
      lastUpdated: new Date().toISOString(),
    },
    series,
    chartType: p.chartType ?? (timeDim ? "line" : "bar"),
    matrix,
    distributions,
    stats: computeStats(series, headline, p.previousValue, p.rows.length),
    mode: p.pointInTime ? "cumulative" : mode,
  };

  await resolveLabels(supa, orgId, result);
  return result;
}

/** Replace UUID keys for programme/project/donor dimensions with readable names. */
async function resolveLabels(supa: any, orgId: string, result: Result) {
  const idLike = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
  const ids = new Set<string>();
  const collect = (k: string) => { if (idLike.test(k)) ids.add(k); };
  result.series.forEach((s) => collect(s.key));
  result.matrix?.rows.forEach((r) => collect(r.key));
  result.matrix?.cols.forEach((c) => collect(c.key));
  result.distributions?.forEach((d) => d.series.forEach((s) => collect(s.key)));
  if (!ids.size) return;
  const list = Array.from(ids);
  const [prog, proj, don] = await Promise.all([
    supa.from("programs").select("id, name").eq("organization_id", orgId).in("id", list),
    supa.from("projects").select("id, name").eq("organization_id", orgId).in("id", list),
    supa.from("donor_accounts").select("id, name").eq("organization_id", orgId).in("id", list),
  ]);
  const map = new Map<string, string>();
  for (const set of [prog.data, proj.data, don.data]) {
    for (const r of set ?? []) map.set(r.id, r.name);
  }
  const relabel = (o: { key: string; label: string }) => { const n = map.get(o.key); if (n) o.label = n; };
  result.series.forEach(relabel);
  result.matrix?.rows.forEach(relabel);
  result.matrix?.cols.forEach(relabel);
  result.distributions?.forEach((d) => d.series.forEach(relabel));
}

// ---------- PEOPLE ----------

function applyPeopleFilters(query: any, filters: Record<string, string> = {}) {
  if (filters.county) query = query.eq("county", filters.county);
  if (filters.gender) query = query.eq("gender", filters.gender);
  if (filters.care_arrangement) query = query.eq("care_arrangement", filters.care_arrangement);
  if (filters.vulnerability) query = query.eq("vulnerability_level", filters.vulnerability);
  if (filters.sub_county) query = query.eq("sub_county", filters.sub_county);
  return query;
}

async function peopleHandler(supa: any, orgId: string, body: Body): Promise<Result> {
  const { metric, filters = {}, range } = body;
  const { from, to, prevFrom, prevTo } = resolveRange(range);

  let table = "beneficiaries";
  let dateCol = "created_at";
  if (metric === "households") table = "households";
  else if (metric === "guardians") table = "guardians";
  else if (metric === "enrolments") { table = "program_beneficiaries"; dateCol = "enrolled_at"; }

  let selectCols = "id, created_at";
  if (table === "beneficiaries") {
    selectCols = "id, created_at, county, sub_county, gender, date_of_birth, care_arrangement, vulnerability_level, status";
  } else if (table === "program_beneficiaries") {
    selectCols = "id, enrolled_at, program_id, status";
  } else if (table === "households") {
    selectCols = "id, created_at, county, sub_county";
  }

  const base = () => {
    let q = supa.from(table).select(selectCols).eq("organization_id", orgId);
    if (table === "beneficiaries" || table === "households") q = q.is("deleted_at", null);
    if (metric === "exits") q = q.eq("status", "exited");
    if (table === "beneficiaries") q = applyPeopleFilters(q, filters);
    return q;
  };

  const [currentRes, prevRes, baseRes] = await Promise.all([
    base().gte(dateCol, from.toISOString()).lte(dateCol, to.toISOString()).limit(20000),
    supa.from(table).select("id", { count: "exact", head: true }).eq("organization_id", orgId)
      .gte(dateCol, prevFrom.toISOString()).lte(dateCol, prevTo.toISOString()),
    supa.from(table).select("id", { count: "exact", head: true }).eq("organization_id", orgId)
      .lt(dateCol, from.toISOString()),
  ]);
  if (currentRes.error) throw new Error(currentRes.error.message);
  const rows: any[] = currentRes.data ?? [];

  const dimOf = (r: any, dim: string): string => {
    if (isTimeDim(dim)) return bucketKey(new Date(r[dateCol] ?? r.created_at), dim);
    switch (dim) {
      case "age_group": return ageBucket(r.date_of_birth);
      case "gender": return r.gender ? titleCase(lower(r.gender)) : "Unknown";
      case "county": return r.county || "Unknown";
      case "sub_county": return r.sub_county || "Unknown";
      case "care_arrangement": return r.care_arrangement ? titleCase(lower(r.care_arrangement)) : "Unknown";
      case "vulnerability": return r.vulnerability_level ? titleCase(lower(r.vulnerability_level)) : "Unknown";
      case "status": return r.status ? titleCase(lower(r.status)) : "Unknown";
      case "programme": return r.program_id || "Unassigned";
      default: return "Unknown";
    }
  };

  const specs = table === "beneficiaries"
    ? [
        { dimension: "age_group", label: "Age pyramid", chart: "pyramid" as const, split: "gender" },
        { dimension: "gender", label: "Gender split", chart: "donut" as const },
        { dimension: "county", label: "County spread", chart: "bar" as const },
        { dimension: "sub_county", label: "Sub-county spread", chart: "bar" as const },
        { dimension: "care_arrangement", label: "Care arrangement mix", chart: "donut" as const },
        { dimension: "vulnerability", label: "Vulnerability level", chart: "bar" as const },
        { dimension: "status", label: "Enrolment status", chart: "donut" as const },
      ]
    : table === "households"
      ? [{ dimension: "county", label: "County spread", chart: "bar" as const }]
      : [
          { dimension: "programme", label: "Enrolments per programme", chart: "bar" as const },
          { dimension: "status", label: "Status mix", chart: "donut" as const },
        ];

  const p: Prepared = {
    rows, dateCol, dimOf,
    distributionSpecs: specs,
    previousValue: prevRes.count ?? null,
    cumulativeBase: baseRes.count ?? 0,
    chartType: (body.dimension === "county" || body.dimension === "sub_county") && !body.dimension2 ? "bar" : undefined,
  };
  return finalize(supa, orgId, body, p, from, to);
}

// ---------- PROGRAMMES ----------

async function programmesHandler(supa: any, orgId: string, body: Body): Promise<Result> {
  const { metric, dimension, range } = body;
  const { from, to, prevFrom, prevTo } = resolveRange(range);

  // Active programmes is a POINT-IN-TIME metric: count programmes active as at each period.
  if (metric === "active_programmes") {
    const { data, error } = await supa.from("programs")
      .select("id, name, status, created_at, start_date, end_date")
      .eq("organization_id", orgId).is("deleted_at", null).limit(5000);
    if (error) throw new Error(error.message);
    const rows: any[] = data ?? [];
    const activeAt = (d: Date) =>
      rows.filter((r) => {
        const startRaw = r.start_date || r.created_at;
        const start = startRaw ? new Date(startRaw) : null;
        if (start && start > d) return false;
        const end = r.end_date ? new Date(r.end_date) : null;
        if (end && end < d) return false;
        return ["active", "ongoing", "in_progress"].includes(lower(r.status)) || !r.status;
      }).length;

    const timeDim = isTimeDim(dimension) ? dimension : "month";
    const keys = periodKeys(from, to, timeDim);
    const endOfKey = (k: string) => {
      if (timeDim === "month") { const d = new Date(`${k}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0); return d; }
      const d = new Date(`${k}T00:00:00Z`);
      if (timeDim === "week") d.setUTCDate(d.getUTCDate() + 6);
      return d;
    };
    const now = new Date();
    const series: SeriesRow[] = isTimeDim(dimension)
      ? keys.map((k) => {
          const at = endOfKey(k);
          return { key: k, label: k, value: activeAt(at > now ? now : at) };
        })
      : rows.filter((r) => ["active", "ongoing", "in_progress"].includes(lower(r.status)))
          .map((r) => ({ key: r.id, label: r.name ?? r.id, value: 1 }));

    const headline = activeAt(to > now ? now : to);
    const prev = activeAt(prevTo);
    const p: Prepared = {
      rows, dateCol: "created_at",
      dimOf: (r, d) => (d === "programme" ? r.id : titleCase(lower(r.status || "unknown"))),
      distributionSpecs: [{ dimension: "status", label: "Programme status mix", chart: "donut" }],
      previousValue: prev,
      headline,
      pointInTime: true,
      series,
      chartType: isTimeDim(dimension) ? "line" : "bar",
    };
    return finalize(supa, orgId, body, p, from, to);
  }

  let table = "activities";
  let dateCol = "activity_date";
  let selectCols = "id, activity_date, activity_type, program_id, project_id, status, actual_participants";
  if (metric === "active_enrolments") {
    table = "program_beneficiaries"; dateCol = "enrolled_at";
    selectCols = "id, enrolled_at, program_id, project_id, status";
  }

  const base = () => {
    let q = supa.from(table).select(selectCols).eq("organization_id", orgId);
    if (table === "activities") q = q.is("deleted_at", null);
    if (metric === "active_enrolments") q = q.eq("status", "active");
    return q;
  };

  const [rowsRes, prevRes] = await Promise.all([
    base().gte(dateCol, from.toISOString()).lte(dateCol, to.toISOString()).limit(20000),
    supa.from(table).select("id", { count: "exact", head: true }).eq("organization_id", orgId)
      .gte(dateCol, prevFrom.toISOString()).lte(dateCol, prevTo.toISOString()),
  ]);
  if (rowsRes.error) throw new Error(rowsRes.error.message);
  let rows: any[] = rowsRes.data ?? [];

  const dimOf = (r: any, dim: string): string => {
    if (isTimeDim(dim)) return bucketKey(new Date(r[dateCol] ?? r.created_at), dim);
    if (dim === "programme") return r.program_id || "Unassigned";
    if (dim === "project") return r.project_id || "Unassigned";
    if (dim === "activity_type") return r.activity_type ? titleCase(lower(r.activity_type)) : "Unknown";
    if (dim === "status") return r.status ? titleCase(lower(r.status)) : "Unknown";
    return "Unknown";
  };

  let weight: ((r: any) => number) | undefined;
  let average = false;
  let headline: number | undefined;
  let previousValue: number | null = prevRes.count ?? null;

  if (metric === "average_attendance") {
    weight = (r) => Number(r.actual_participants ?? 0);
    average = true;
    headline = rows.length ? round2(rows.reduce((s, r) => s + Number(r.actual_participants ?? 0), 0) / rows.length) : 0;
    previousValue = null;
  } else if (metric === "completion_rate") {
    const done = rows.filter((r) => ["completed", "complete", "done"].includes(lower(r.status))).length;
    headline = rows.length ? Math.round((done / rows.length) * 100) : 0;
    previousValue = null;
  }

  const p: Prepared = {
    rows, dateCol, dimOf, weight, average, headline, previousValue,
    previousReason: metric === "average_attendance" || metric === "completion_rate"
      ? "Rate metrics have no comparable previous-period total" : undefined,
    distributionSpecs: table === "activities"
      ? [
          { dimension: "activity_type", label: "Activity type mix", chart: "donut" },
          { dimension: "status", label: "Status mix", chart: "donut" },
          { dimension: "programme", label: "Activities per programme", chart: "bar" },
          { dimension: "project", label: "Activities per project", chart: "bar" },
        ]
      : [
          { dimension: "programme", label: "Enrolments per programme", chart: "bar" },
          { dimension: "project", label: "Projects per enrolment", chart: "bar" },
          { dimension: "status", label: "Status mix", chart: "donut" },
        ],
  };
  return finalize(supa, orgId, body, p, from, to);
}

// ---------- MONEY ----------

async function moneyHandler(supa: any, orgId: string, body: Body): Promise<Result> {
  const { metric, dimension, filters = {}, range } = body;
  const { from, to, prevFrom, prevTo } = resolveRange(range);

  if (metric === "pool_balances") {
    let pq = supa.from("donor_pools")
      .select("balance_base, currency, donor_account_id, scope_program_id, scope, created_at")
      .eq("organization_id", orgId).limit(10000);
    if (filters.currency) pq = pq.eq("currency", filters.currency);
    const { data, error } = await pq;
    if (error) throw new Error(error.message);
    const rows: any[] = data ?? [];
    const p: Prepared = {
      rows, dateCol: "created_at",
      weight: (r) => Number(r.balance_base || 0),
      dimOf: (r, d) => d === "donor" ? (r.donor_account_id || "Unknown")
        : d === "programme" ? (r.scope_program_id || "Unallocated")
        : d === "currency" ? (r.currency || "—")
        : isTimeDim(d) ? bucketKey(new Date(r.created_at), d) : "Total",
      distributionSpecs: [
        { dimension: "currency", label: "Balances by currency", chart: "donut" },
        { dimension: "donor", label: "Top donors by balance", chart: "bar" },
      ],
      previousValue: null,
      previousReason: "Pool balances are a live snapshot, not a period total",
      pointInTime: true,
      chartType: "bar",
    };
    return finalize(supa, orgId, body, p, from, to);
  }

  if (metric === "funding_gaps") {
    const [budRes, allocRes] = await Promise.all([
      supa.from("budgets").select("total_amount, program_id, project_id").eq("organization_id", orgId).limit(10000),
      supa.from("allocations").select("amount_base, program_id, project_id").eq("organization_id", orgId).limit(10000),
    ]);
    if (budRes.error) throw new Error(budRes.error.message);
    if (allocRes.error) throw new Error(allocRes.error.message);
    const byKey = new Map<string, number>();
    const keyOf = (r: any) => dimension === "project" ? (r.project_id || "Unassigned") : (r.program_id || "Unassigned");
    for (const b of budRes.data ?? []) byKey.set(keyOf(b), (byKey.get(keyOf(b)) ?? 0) + Number(b.total_amount || 0));
    for (const a of allocRes.data ?? []) byKey.set(keyOf(a), (byKey.get(keyOf(a)) ?? 0) - Number(a.amount_base || 0));
    const series = Array.from(byKey.entries())
      .map(([key, value]) => ({ key, label: key, value: Math.max(0, Math.round(value)) }))
      .sort((a, b) => b.value - a.value);
    const p: Prepared = {
      rows: (budRes.data ?? []) as any[], dateCol: "created_at",
      dimOf: (r, d) => d === "project" ? (r.project_id || "Unassigned") : (r.program_id || "Unassigned"),
      distributionSpecs: [{ dimension: "programme", label: "Budget by programme", chart: "bar" }],
      previousValue: null,
      previousReason: "Funding gap is a live position, not a period total",
      headline: series.reduce((s, x) => s + x.value, 0),
      series, chartType: "bar", pointInTime: true,
    };
    return finalize(supa, orgId, body, p, from, to);
  }

  if (metric === "donor_count") {
    const dq = supa.from("donations")
      .select("donor_account_id, donor_email, donor_name, donor_type, completed_at, created_at, currency, payment_method, amount")
      .eq("organization_id", orgId).eq("status", "completed")
      .gte("created_at", from.toISOString()).lte("created_at", to.toISOString()).limit(20000);
    const [{ data, error }, prevQ] = await Promise.all([
      filters.currency ? dq.eq("currency", filters.currency) : dq,
      supa.from("donations").select("donor_account_id, donor_email, donor_name")
        .eq("organization_id", orgId).eq("status", "completed")
        .gte("created_at", prevFrom.toISOString()).lte("created_at", prevTo.toISOString()).limit(20000),
    ]);
    if (error) throw new Error(error.message);
    const rows: any[] = data ?? [];
    const donorKey = (r: any) => r.donor_account_id || r.donor_email || r.donor_name || "Anonymous";
    const distinct = new Set(rows.map(donorKey));
    const prevSeen = new Set((prevQ.data ?? []).map(donorKey));
    const timeDim = isTimeDim(dimension);
    let series: SeriesRow[];
    if (timeDim) {
      const keys = periodKeys(from, to, dimension);
      series = keys.map((k) => ({
        key: k, label: k,
        value: new Set(rows.filter((r) => bucketKey(new Date(r.completed_at || r.created_at), dimension) === k).map(donorKey)).size,
      }));
    } else {
      const m = new Map<string, Set<string>>();
      for (const r of rows) {
        const k = donorKey(r);
        const s = m.get(k) ?? new Set<string>(); s.add(k); m.set(k, s);
      }
      series = Array.from(m.entries()).map(([k, s]) => ({ key: k, label: k, value: s.size })).slice(0, 25);
    }
    const p: Prepared = {
      rows, dateCol: "created_at",
      dimOf: (r, d) => moneyDim(r, d, "created_at"),
      distributionSpecs: moneySpecs(),
      previousValue: prevSeen.size,
      headline: distinct.size,
      series,
      pointInTime: true,
      chartType: timeDim ? "line" : "bar",
    };
    return finalize(supa, orgId, body, p, from, to);
  }

  const table = metric === "allocations_made" ? "allocations" : "donations";
  const dateCol = metric === "allocations_made" ? "allocated_at" : "created_at";
  const amountCol = metric === "allocations_made" ? "amount_base" : "amount";
  const selectCols = metric === "allocations_made"
    ? "amount_base, allocated_at, program_id, project_id, donor_account_id, scope, status"
    : "amount, currency, created_at, completed_at, donor_account_id, donor_name, donor_email, donor_type, campaign_id, payment_method";

  let q = supa.from(table).select(selectCols).eq("organization_id", orgId)
    .gte(dateCol, from.toISOString()).lte(dateCol, to.toISOString()).limit(20000);
  if (table === "donations") q = q.eq("status", "completed");
  if (filters.currency && table === "donations") q = q.eq("currency", filters.currency);
  if (filters.programme && table === "allocations") q = q.eq("program_id", filters.programme);

  let pq = supa.from(table).select(amountCol).eq("organization_id", orgId)
    .gte(dateCol, prevFrom.toISOString()).lte(dateCol, prevTo.toISOString()).limit(20000);
  if (table === "donations") pq = pq.eq("status", "completed");

  const [{ data, error }, prevRes, baseRes] = await Promise.all([
    q, pq,
    supa.from(table).select(amountCol).eq("organization_id", orgId).lt(dateCol, from.toISOString()).limit(20000),
  ]);
  if (error) throw new Error(error.message);
  const rows: any[] = data ?? [];
  const prevTotal = (prevRes.data ?? []).reduce((s: number, r: any) => s + Number(r[amountCol] || 0), 0);
  const cumulativeBase = (baseRes.data ?? []).reduce((s: number, r: any) => s + Number(r[amountCol] || 0), 0);

  const p: Prepared = {
    rows, dateCol,
    weight: (r) => Number(r[amountCol] || 0),
    dimOf: (r, d) => moneyDim(r, d, dateCol),
    distributionSpecs: table === "donations" ? moneySpecs() : [
      { dimension: "programme", label: "Allocations by programme", chart: "bar" },
      { dimension: "scope", label: "Allocation scope mix", chart: "donut" },
      { dimension: "donor", label: "Top donors by volume", chart: "bar" },
    ],
    previousValue: Math.round(prevTotal),
    cumulativeBase: Math.round(cumulativeBase),
  };
  return finalize(supa, orgId, body, p, from, to);
}

function moneyDim(r: any, d: string, dateCol: string): string {
  if (isTimeDim(d)) return bucketKey(new Date(r[dateCol] || r.created_at), d);
  if (d === "donor") return r.donor_account_id || r.donor_email || r.donor_name || "Anonymous";
  if (d === "programme") return r.program_id || "Unallocated";
  if (d === "project") return r.project_id || "Unallocated";
  if (d === "currency") return r.currency || "—";
  if (d === "donor_type") return r.donor_type ? titleCase(lower(r.donor_type)) : "Unknown";
  if (d === "source") return r.payment_method ? titleCase(lower(r.payment_method)) : "Unknown";
  if (d === "scope") return r.scope ? titleCase(lower(r.scope)) : "Unscoped";
  return "Unknown";
}

function moneySpecs(): Prepared["distributionSpecs"] {
  return [
    { dimension: "source", label: "Donations by source", chart: "donut" },
    { dimension: "currency", label: "By currency", chart: "donut" },
    { dimension: "donor_type", label: "Donor type mix", chart: "donut" },
    { dimension: "donor", label: "Top donors by volume", chart: "bar" },
  ];
}

// ---------- IMPACT ----------

async function impactHandler(supa: any, orgId: string, body: Body): Promise<Result> {
  const { metric, dimension, range } = body;
  const { from, to } = resolveRange(range);

  if (metric === "beneficiaries_at_target") {
    const { data, error } = await supa.from("program_indicators")
      .select("id, program_id, project_id, target_value, current_value, updated_at")
      .eq("organization_id", orgId).eq("is_active", true).limit(10000);
    if (error) throw new Error(error.message);
    const rows: any[] = (data ?? []).filter((r: any) => Number(r.target_value || 0) > 0);
    const hit = rows.filter((r) => Number(r.current_value || 0) >= Number(r.target_value)).length;
    const p: Prepared = {
      rows, dateCol: "updated_at",
      dimOf: (r, d) => isTimeDim(d) ? bucketKey(new Date(r.updated_at), d)
        : d === "programme" ? (r.program_id || "Unassigned")
        : d === "project" ? (r.project_id || "Unassigned")
        : (Number(r.current_value || 0) >= Number(r.target_value) ? "At target" : "Below target"),
      distributionSpecs: [
        { dimension: "target_status", label: "At target vs below target", chart: "donut" },
        { dimension: "project", label: "Indicators by project", chart: "bar" },
      ],
      previousValue: null,
      previousReason: "Target attainment is a live position, not a period total",
      headline: rows.length ? Math.round((hit / rows.length) * 100) : 0,
      pointInTime: true,
    };
    return finalize(supa, orgId, body, p, from, to);
  }

  if (metric === "baseline_movement" || metric === "improvement_rate") {
    const { data, error } = await supa.from("beneficiary_baselines")
      .select("beneficiary_id, project_id, indicator_key, value_numeric, captured_at")
      .eq("organization_id", orgId).not("value_numeric", "is", null).limit(20000);
    if (error) throw new Error(error.message);
    const groups = new Map<string, { first: any; last: any }>();
    for (const r of data ?? []) {
      const k = `${r.beneficiary_id}::${r.indicator_key}`;
      const g = groups.get(k);
      if (!g) groups.set(k, { first: r, last: r });
      else {
        if (new Date(r.captured_at) < new Date(g.first.captured_at)) g.first = r;
        if (new Date(r.captured_at) > new Date(g.last.captured_at)) g.last = r;
      }
    }
    const rows = Array.from(groups.values()).map((g) => ({
      ...g.last,
      delta: Number(g.last.value_numeric) - Number(g.first.value_numeric),
      improved: Number(g.last.value_numeric) > Number(g.first.value_numeric),
    }));
    const isRate = metric === "improvement_rate";
    const p: Prepared = {
      rows, dateCol: "captured_at",
      weight: (r) => isRate ? (r.improved ? 100 : 0) : r.delta,
      average: true,
      dimOf: (r, d) => isTimeDim(d) ? bucketKey(new Date(r.captured_at), d)
        : d === "project" || d === "programme" ? (r.project_id || "Unassigned")
        : d === "movement" ? (r.delta > 0 ? "Improved" : r.delta < 0 ? "Declined" : "No change")
        : (r.indicator_key || "Unknown"),
      distributionSpecs: [
        { dimension: "movement", label: "Baseline → current movement", chart: "donut" },
        { dimension: "indicator", label: "By indicator", chart: "bar" },
        { dimension: "project", label: "Improvement by project", chart: "bar" },
      ],
      previousValue: null,
      previousReason: "Baseline movement compares first vs latest measure, not periods",
      headline: rows.length
        ? round2(rows.reduce((s, r) => s + (isRate ? (r.improved ? 100 : 0) : r.delta), 0) / rows.length)
        : 0,
      pointInTime: true,
    };
    return finalize(supa, orgId, body, p, from, to);
  }

  const { data, error } = await supa.from("indicator_values")
    .select("actual_value, period_start, indicator_id")
    .gte("period_start", from.toISOString().slice(0, 10))
    .lte("period_start", to.toISOString().slice(0, 10))
    .limit(20000);
  if (error) throw new Error(error.message);
  const rows: any[] = data ?? [];
  const p: Prepared = {
    rows, dateCol: "period_start",
    weight: (r) => Number(r.actual_value || 0),
    average: true,
    dimOf: (r, d) => isTimeDim(d) ? bucketKey(new Date(r.period_start), d) : (r.indicator_id || "Unknown"),
    distributionSpecs: [{ dimension: "indicator", label: "Indicator value distribution", chart: "bar" }],
    previousValue: null,
    previousReason: "Averages across indicators have no comparable previous total",
    headline: rows.length ? round2(rows.reduce((s, r) => s + Number(r.actual_value || 0), 0) / rows.length) : 0,
    pointInTime: true,
  };
  return finalize(supa, orgId, body, p, from, to);
}

// ---------- OPERATIONS ----------

async function operationsHandler(supa: any, orgId: string, body: Body): Promise<Result> {
  const { metric, filters = {}, range } = body;
  const { from, to, prevFrom, prevTo } = resolveRange(range);

  if (metric === "field_logs") {
    let q = supa.from("field_logs").select("id, logged_at, project_id, created_by, log_type")
      .eq("organization_id", orgId).gte("logged_at", from.toISOString()).lte("logged_at", to.toISOString()).limit(20000);
    if (filters.project) q = q.eq("project_id", filters.project);
    const [{ data, error }, prevRes, baseRes] = await Promise.all([
      q,
      supa.from("field_logs").select("id", { count: "exact", head: true }).eq("organization_id", orgId)
        .gte("logged_at", prevFrom.toISOString()).lte("logged_at", prevTo.toISOString()),
      supa.from("field_logs").select("id", { count: "exact", head: true }).eq("organization_id", orgId)
        .lt("logged_at", from.toISOString()),
    ]);
    if (error) throw new Error(error.message);
    const rows: any[] = data ?? [];
    const p: Prepared = {
      rows, dateCol: "logged_at",
      dimOf: (r, d) => isTimeDim(d) ? bucketKey(new Date(r.logged_at), d)
        : d === "officer" ? (r.created_by || "Unknown")
        : (r.project_id || "Unassigned"),
      distributionSpecs: [
        { dimension: "officer", label: "Field logs by officer", chart: "bar" },
        { dimension: "project", label: "Field logs by project", chart: "bar" },
      ],
      previousValue: prevRes.count ?? null,
      cumulativeBase: baseRes.count ?? 0,
    };
    return finalize(supa, orgId, body, p, from, to);
  }

  if (metric === "reports_submitted" || metric === "reports_overdue") {
    const isOverdue = metric === "reports_overdue";
    const dateCol = isOverdue ? "period_end" : "submitted_at";
    let q = supa.from("project_report_drafts")
      .select("id, project_id, period_end, submitted_at, status")
      .eq("organization_id", orgId).limit(20000);
    if (isOverdue) {
      q = q.neq("status", "submitted").neq("status", "approved").lt("period_end", new Date().toISOString().slice(0, 10));
    } else {
      q = q.not("submitted_at", "is", null).gte("submitted_at", from.toISOString()).lte("submitted_at", to.toISOString());
    }
    if (filters.project) q = q.eq("project_id", filters.project);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows: any[] = data ?? [];
    const p: Prepared = {
      rows, dateCol,
      dimOf: (r, d) => isTimeDim(d) ? bucketKey(new Date(r[dateCol] ?? r.period_end ?? Date.now()), d)
        : d === "timeliness"
          ? (r.submitted_at && r.period_end && new Date(r.submitted_at) <= new Date(r.period_end) ? "On time" : "Late")
          : (r.project_id || "Unassigned"),
      distributionSpecs: [
        { dimension: "timeliness", label: "Reports on time vs late", chart: "donut" },
        { dimension: "project", label: "Reports by project", chart: "bar" },
      ],
      previousValue: null,
      previousReason: isOverdue ? "Overdue reports are a live backlog, not a period total" : undefined,
      pointInTime: isOverdue,
    };
    return finalize(supa, orgId, body, p, from, to);
  }

  if (metric === "data_quality") {
    const { data, error } = await supa.from("data_quality_flags")
      .select("id, resolved, project_id, flag_type, created_at").eq("organization_id", orgId).limit(20000);
    if (error) throw new Error(error.message);
    const rows: any[] = data ?? [];
    const open = rows.filter((r) => !r.resolved).length;
    const score = rows.length ? Math.max(0, Math.round(100 - (open / rows.length) * 100)) : 100;
    const byProject = new Map<string, { open: number; total: number }>();
    for (const r of rows) {
      const k = r.project_id || "Unassigned";
      const b = byProject.get(k) ?? { open: 0, total: 0 };
      b.total += 1; if (!r.resolved) b.open += 1; byProject.set(k, b);
    }
    const series = Array.from(byProject.entries())
      .map(([k, v]) => ({ key: k, label: k, value: Math.max(0, Math.round(100 - (v.open / v.total) * 100)) }))
      .sort((a, b) => a.value - b.value);
    const p: Prepared = {
      rows, dateCol: "created_at",
      dimOf: (r, d) => d === "project" ? (r.project_id || "Unassigned")
        : d === "flag_type" ? titleCase(lower(r.flag_type || "unknown"))
        : (r.resolved ? "Resolved" : "Open"),
      distributionSpecs: [
        { dimension: "resolution", label: "Open vs resolved flags", chart: "donut" },
        { dimension: "project", label: "Data-quality flags by project", chart: "bar" },
        { dimension: "flag_type", label: "Flag types", chart: "bar" },
      ],
      previousValue: null,
      previousReason: "Data quality is a live score, not a period total",
      headline: score,
      series,
      pointInTime: true,
      chartType: "bar",
    };
    return finalize(supa, orgId, body, p, from, to);
  }

  return {
    headline: { value: 0, previousValue: null, previousReason: "Metric not available", lastUpdated: new Date().toISOString() },
    series: [], chartType: "bar", distributions: [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return ok({ error: "Missing Authorization header" });

    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData?.user) return ok({ error: "Not authenticated" });

    const { data: orgRow, error: orgErr } = await supa.rpc("get_user_current_organization", { _user_id: userData.user.id });
    if (orgErr) return ok({ error: orgErr.message });
    const orgId: string | undefined = Array.isArray(orgRow) ? orgRow[0]?.organization_id : (orgRow as any)?.organization_id;
    if (!orgId) return ok({ error: "No active organization for user" });

    const body = (await req.json()) as Body;
    if (!body?.tab || !body?.metric || !body?.dimension) {
      return ok({ error: "tab, metric and dimension are required" });
    }

    const run = (tab: string) => {
      if (tab === "people") return peopleHandler(supa, orgId, { ...body, tab: "people" });
      if (tab === "programmes") return programmesHandler(supa, orgId, { ...body, tab: "programmes" });
      if (tab === "money") return moneyHandler(supa, orgId, { ...body, tab: "money" });
      if (tab === "impact") return impactHandler(supa, orgId, { ...body, tab: "impact" });
      if (tab === "operations") return operationsHandler(supa, orgId, { ...body, tab: "operations" });
      return null;
    };

    const target = body.tab === "custom" ? body.sourceTab : body.tab;
    if (body.tab === "custom" && !target) {
      return ok({ error: "invalid_source", message: "Custom queries require a sourceTab" });
    }
    const promise = run(target ?? "");
    if (!promise) return ok({ error: "not_implemented", message: `${body.tab} tab is not yet implemented` });

    return ok(await promise);
  } catch (e) {
    return ok({ error: (e as Error).message ?? "Unknown error" });
  }
});
