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
  filters?: Record<string, string>;
  range?: Range;
}

interface SeriesRow { key: string; label: string; value: number }
interface Result {
  headline: { value: number; previousValue: number | null; lastUpdated: string };
  series: SeriesRow[];
  chartType: "line" | "bar" | "choropleth";
}

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function resolveRange(range?: Range): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const now = new Date();
  const to = new Date(now);
  let from: Date;
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
    from = new Date(2000, 0, 1);
  } else {
    from = new Date(range.from);
    to.setTime(new Date(range.to).getTime());
  }
  const span = to.getTime() - from.getTime();
  const prevTo = new Date(from);
  const prevFrom = new Date(from.getTime() - span);
  return { from, to, prevFrom, prevTo };
}

function bucketKey(d: Date, dim: string): string {
  if (dim === "day") return d.toISOString().slice(0, 10);
  if (dim === "week") {
    const tmp = new Date(d);
    const day = tmp.getUTCDay();
    tmp.setUTCDate(tmp.getUTCDate() - day);
    return tmp.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 7); // month
}

function ageBucket(dob: string | null): string {
  if (!dob) return "Unknown";
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  if (age < 6) return "0-5";
  if (age < 13) return "6-12";
  if (age < 18) return "13-17";
  if (age < 36) return "18-35";
  if (age < 61) return "36-60";
  return "60+";
}

function applyPeopleFilters(query: any, filters: Record<string, string> = {}) {
  if (filters.county) query = query.eq("county", filters.county);
  if (filters.gender) query = query.eq("gender", filters.gender);
  if (filters.care_arrangement) query = query.eq("care_arrangement", filters.care_arrangement);
  if (filters.vulnerability) query = query.eq("vulnerability_level", filters.vulnerability);
  return query;
}

async function peopleHandler(supa: any, orgId: string, body: Body): Promise<Result> {
  const { tab: _t, metric, dimension, filters = {}, range } = body;
  const { from, to, prevFrom, prevTo } = resolveRange(range);

  // Pick source table
  let table = "beneficiaries";
  let dateCol = "created_at";
  if (metric === "households") table = "households";
  else if (metric === "guardians") table = "guardians";
  else if (metric === "enrolments") { table = "program_beneficiaries"; dateCol = "enrolled_at"; }
  else if (metric === "exits") { table = "beneficiaries"; }
  else if (metric === "new_registrations") table = "beneficiaries";

  const needsRowFields =
    ["county", "sub_county", "gender", "age_group", "care_arrangement", "vulnerability"].includes(dimension);

  // Build column selection
  let selectCols = "id, created_at";
  if (table === "beneficiaries") {
    selectCols = "id, created_at, county, sub_county, gender, date_of_birth, care_arrangement, vulnerability_level, status";
  } else if (table === "program_beneficiaries") {
    selectCols = "id, enrolled_at, program_id, status";
  }

  let q = supa.from(table).select(selectCols).eq("organization_id", orgId);
  if (table === "beneficiaries" || table === "households") q = q.is("deleted_at", null);
  if (metric === "exits") q = q.eq("status", "exited");
  if (table === "beneficiaries") q = applyPeopleFilters(q, filters);

  // Headline: count in current window
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const prevFromIso = prevFrom.toISOString();
  const prevToIso = prevTo.toISOString();

  // Current period rows for series + headline
  const currentRowsRes = await q.gte(dateCol, fromIso).lte(dateCol, toIso).limit(10000);
  if (currentRowsRes.error) throw new Error(currentRowsRes.error.message);
  const currentRows: any[] = currentRowsRes.data ?? [];

  // Previous period count (headline delta)
  let prevQ = supa.from(table).select("id", { count: "exact", head: true }).eq("organization_id", orgId);
  if (table === "beneficiaries" || table === "households") prevQ = prevQ.is("deleted_at", null);
  if (metric === "exits") prevQ = prevQ.eq("status", "exited");
  if (table === "beneficiaries") prevQ = applyPeopleFilters(prevQ, filters);
  prevQ = prevQ.gte(dateCol, prevFromIso).lte(dateCol, prevToIso);
  const prevRes = await prevQ;

  // Group rows by dimension
  const buckets = new Map<string, number>();
  const isTime = ["day", "week", "month"].includes(dimension);

  for (const r of currentRows) {
    let key = "Unknown";
    if (isTime) {
      const dt = new Date(r[dateCol] || r.created_at);
      key = bucketKey(dt, dimension);
    } else if (dimension === "age_group") {
      key = ageBucket(r.date_of_birth);
    } else if (dimension === "gender") key = r.gender || "Unknown";
    else if (dimension === "county") key = r.county || "Unknown";
    else if (dimension === "sub_county") key = r.sub_county || "Unknown";
    else if (dimension === "care_arrangement") key = r.care_arrangement || "Unknown";
    else if (dimension === "vulnerability") key = r.vulnerability_level || "Unknown";
    else if (dimension === "programme") key = r.program_id || "Unknown";
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const series: SeriesRow[] = Array.from(buckets.entries())
    .map(([key, value]) => ({ key, label: key, value }))
    .sort((a, b) => (isTime ? a.key.localeCompare(b.key) : b.value - a.value));

  const chartType: Result["chartType"] =
    dimension === "county" || dimension === "sub_county"
      ? "choropleth"
      : isTime
        ? "line"
        : "bar";

  return {
    headline: {
      value: currentRows.length,
      previousValue: prevRes.count ?? null,
      lastUpdated: new Date().toISOString(),
    },
    series,
    chartType,
  };
}

async function programmesHandler(supa: any, orgId: string, body: Body): Promise<Result> {
  const { metric, dimension, range } = body;
  const { from, to, prevFrom, prevTo } = resolveRange(range);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  // Map metric → source
  let table = "activities";
  let dateCol = "activity_date";
  let selectCols = "id, activity_date, activity_type, program_id, project_id, status";
  if (metric === "active_programmes") {
    table = "programs"; dateCol = "created_at"; selectCols = "id, created_at, status, program_id:id";
  } else if (metric === "active_enrolments") {
    table = "program_beneficiaries"; dateCol = "enrolled_at";
    selectCols = "id, enrolled_at, program_id, status";
  }

  let q = supa.from(table).select(selectCols).eq("organization_id", orgId);
  if (table === "activities" || table === "programs") q = q.is("deleted_at", null);
  if (metric === "active_programmes") q = q.in("status", ["active", "ongoing"]);
  if (metric === "active_enrolments") q = q.eq("status", "active");
  q = q.gte(dateCol, fromIso).lte(dateCol, toIso).limit(10000);
  const rowsRes = await q;
  if (rowsRes.error) throw new Error(rowsRes.error.message);
  const rows: any[] = rowsRes.data ?? [];

  let prevQ = supa.from(table).select("id", { count: "exact", head: true }).eq("organization_id", orgId);
  if (table === "activities" || table === "programs") prevQ = prevQ.is("deleted_at", null);
  if (metric === "active_programmes") prevQ = prevQ.in("status", ["active", "ongoing"]);
  if (metric === "active_enrolments") prevQ = prevQ.eq("status", "active");
  prevQ = prevQ.gte(dateCol, prevFrom.toISOString()).lte(dateCol, prevTo.toISOString());
  const prevRes = await prevQ;

  const buckets = new Map<string, number>();
  const isTime = ["day", "week", "month"].includes(dimension);

  for (const r of rows) {
    let key = "Unknown";
    if (isTime) {
      const dt = new Date(r[dateCol] || r.created_at);
      key = bucketKey(dt, dimension);
    } else if (dimension === "programme") key = r.program_id || "Unknown";
    else if (dimension === "project") key = r.project_id || "Unknown";
    else if (dimension === "activity_type") key = r.activity_type || "Unknown";
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  // For completion_rate and average_attendance we simplify to counts in this phase
  let headlineValue = rows.length;
  if (metric === "average_attendance") {
    // approximate: sum actual_participants / count
    const sum = rows.reduce((s, r) => s + (r.actual_participants ?? 0), 0);
    headlineValue = rows.length ? Math.round(sum / rows.length) : 0;
  }

  const series = Array.from(buckets.entries())
    .map(([key, value]) => ({ key, label: key, value }))
    .sort((a, b) => (isTime ? a.key.localeCompare(b.key) : b.value - a.value));

  return {
    headline: {
      value: headlineValue,
      previousValue: prevRes.count ?? null,
      lastUpdated: new Date().toISOString(),
    },
    series,
    chartType: isTime ? "line" : "bar",
  };
}

// ---------- MONEY ----------
async function moneyHandler(supa: any, orgId: string, body: Body): Promise<Result> {
  const { metric, dimension, filters = {}, range } = body;
  const { from, to, prevFrom, prevTo } = resolveRange(range);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const isTime = ["day", "week", "month"].includes(dimension);

  // Pool balances = current snapshot; ignore date range
  if (metric === "pool_balances") {
    let pq = supa.from("donor_pools")
      .select("balance_base, currency, donor_account_id, scope_program_id")
      .eq("organization_id", orgId)
      .limit(10000);
    if (filters.currency) pq = pq.eq("currency", filters.currency);
    const { data, error } = await pq;
    if (error) throw new Error(error.message);
    const rows: any[] = data ?? [];
    const buckets = new Map<string, number>();
    for (const r of rows) {
      const key = dimension === "donor" ? (r.donor_account_id || "Unknown")
        : dimension === "programme" ? (r.scope_program_id || "Unallocated")
        : "Total";
      buckets.set(key, (buckets.get(key) ?? 0) + Number(r.balance_base || 0));
    }
    const total = rows.reduce((s, r) => s + Number(r.balance_base || 0), 0);
    const series = Array.from(buckets.entries())
      .map(([key, value]) => ({ key, label: key, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
    return {
      headline: { value: Math.round(total), previousValue: null, lastUpdated: new Date().toISOString() },
      series,
      chartType: "bar",
    };
  }

  // Funding gaps: sum(budgets) - sum(allocations) per programme/project
  if (metric === "funding_gaps") {
    const [budRes, allocRes] = await Promise.all([
      supa.from("budgets").select("total_amount, program_id, project_id").eq("organization_id", orgId).limit(10000),
      supa.from("allocations").select("amount_base, program_id, project_id").eq("organization_id", orgId).limit(10000),
    ]);
    if (budRes.error) throw new Error(budRes.error.message);
    if (allocRes.error) throw new Error(allocRes.error.message);
    const byKey = new Map<string, number>();
    for (const b of budRes.data ?? []) {
      const key = dimension === "programme" ? (b.program_id || "Unassigned") : (b.project_id || "Unassigned");
      byKey.set(key, (byKey.get(key) ?? 0) + Number(b.total_amount || 0));
    }
    for (const a of allocRes.data ?? []) {
      const key = dimension === "programme" ? (a.program_id || "Unassigned") : (a.project_id || "Unassigned");
      byKey.set(key, (byKey.get(key) ?? 0) - Number(a.amount_base || 0));
    }
    const series = Array.from(byKey.entries())
      .map(([key, value]) => ({ key, label: key, value: Math.max(0, Math.round(value)) }))
      .sort((a, b) => b.value - a.value);
    const total = series.reduce((s, x) => s + x.value, 0);
    return {
      headline: { value: total, previousValue: null, lastUpdated: new Date().toISOString() },
      series,
      chartType: "bar",
    };
  }

  // Donor count: distinct donors within window
  if (metric === "donor_count") {
    let dq = supa.from("donations")
      .select("donor_account_id, donor_email, donor_name, completed_at, created_at, currency")
      .eq("organization_id", orgId)
      .eq("status", "completed")
      .gte("created_at", fromIso).lte("created_at", toIso)
      .limit(10000);
    if (filters.currency) dq = dq.eq("currency", filters.currency);
    const { data, error } = await dq;
    if (error) throw new Error(error.message);
    const rows: any[] = data ?? [];
    const seen = new Set<string>();
    const buckets = new Map<string, Set<string>>();
    for (const r of rows) {
      const donorKey = r.donor_account_id || r.donor_email || r.donor_name || "anon";
      seen.add(donorKey);
      let bucket = "Unknown";
      if (isTime) bucket = bucketKey(new Date(r.completed_at || r.created_at), dimension);
      else if (dimension === "donor") bucket = donorKey;
      const s = buckets.get(bucket) ?? new Set<string>();
      s.add(donorKey); buckets.set(bucket, s);
    }
    const series = Array.from(buckets.entries())
      .map(([key, s]) => ({ key, label: key, value: s.size }))
      .sort((a, b) => (isTime ? a.key.localeCompare(b.key) : b.value - a.value));
    // previous period distinct donors
    const { data: prevData } = await supa.from("donations")
      .select("donor_account_id, donor_email, donor_name")
      .eq("organization_id", orgId).eq("status", "completed")
      .gte("created_at", prevFrom.toISOString()).lte("created_at", prevTo.toISOString()).limit(10000);
    const prevSeen = new Set<string>();
    for (const r of prevData ?? []) prevSeen.add(r.donor_account_id || r.donor_email || r.donor_name || "anon");
    return {
      headline: { value: seen.size, previousValue: prevSeen.size, lastUpdated: new Date().toISOString() },
      series,
      chartType: isTime ? "line" : "bar",
    };
  }

  // donations_received | allocations_made: sum monetary values
  const table = metric === "allocations_made" ? "allocations" : "donations";
  const dateCol = metric === "allocations_made" ? "allocated_at" : "created_at";
  const amountCol = metric === "allocations_made" ? "amount_base" : "amount";
  const selectCols = metric === "allocations_made"
    ? "amount_base, allocated_at, program_id, donor_account_id"
    : "amount, currency, created_at, completed_at, donor_account_id, donor_name, donor_email, campaign_id";

  let q = supa.from(table).select(selectCols).eq("organization_id", orgId)
    .gte(dateCol, fromIso).lte(dateCol, toIso).limit(10000);
  if (table === "donations") q = q.eq("status", "completed");
  if (filters.currency && table === "donations") q = q.eq("currency", filters.currency);
  if (filters.programme && table === "allocations") q = q.eq("program_id", filters.programme);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows: any[] = data ?? [];

  const buckets = new Map<string, number>();
  for (const r of rows) {
    let key = "Unknown";
    if (isTime) key = bucketKey(new Date(r[dateCol]), dimension);
    else if (dimension === "donor") key = r.donor_account_id || r.donor_email || r.donor_name || "Anonymous";
    else if (dimension === "programme") key = r.program_id || "Unallocated";
    buckets.set(key, (buckets.get(key) ?? 0) + Number(r[amountCol] || 0));
  }
  const total = rows.reduce((s, r) => s + Number(r[amountCol] || 0), 0);

  // previous
  let pq = supa.from(table).select(amountCol).eq("organization_id", orgId)
    .gte(dateCol, prevFrom.toISOString()).lte(dateCol, prevTo.toISOString()).limit(10000);
  if (table === "donations") pq = pq.eq("status", "completed");
  const { data: prevData } = await pq;
  const prevTotal = (prevData ?? []).reduce((s: number, r: any) => s + Number(r[amountCol] || 0), 0);

  const series = Array.from(buckets.entries())
    .map(([key, value]) => ({ key, label: key, value: Math.round(value) }))
    .sort((a, b) => (isTime ? a.key.localeCompare(b.key) : b.value - a.value));

  return {
    headline: { value: Math.round(total), previousValue: Math.round(prevTotal), lastUpdated: new Date().toISOString() },
    series,
    chartType: isTime ? "line" : "bar",
  };
}

// ---------- IMPACT ----------
async function impactHandler(supa: any, orgId: string, body: Body): Promise<Result> {
  const { metric, dimension, range } = body;
  const { from, to, prevFrom, prevTo } = resolveRange(range);
  const isTime = ["day", "week", "month"].includes(dimension);

  if (metric === "beneficiaries_at_target") {
    const { data, error } = await supa.from("program_indicators")
      .select("id, program_id, project_id, target_value, current_value, updated_at")
      .eq("organization_id", orgId).eq("is_active", true).limit(10000);
    if (error) throw new Error(error.message);
    const rows: any[] = data ?? [];
    const buckets = new Map<string, { hit: number; total: number }>();
    let hit = 0, total = 0;
    for (const r of rows) {
      const tgt = Number(r.target_value || 0);
      const cur = Number(r.current_value || 0);
      if (!tgt) continue;
      const isHit = cur >= tgt ? 1 : 0;
      total += 1; hit += isHit;
      const key = isTime
        ? bucketKey(new Date(r.updated_at), dimension)
        : (dimension === "programme" ? (r.program_id || "Unassigned") : (r.project_id || "Unassigned"));
      const b = buckets.get(key) ?? { hit: 0, total: 0 };
      b.hit += isHit; b.total += 1; buckets.set(key, b);
    }
    const series = Array.from(buckets.entries())
      .map(([key, v]) => ({ key, label: key, value: v.total ? Math.round((v.hit / v.total) * 100) : 0 }))
      .sort((a, b) => (isTime ? a.key.localeCompare(b.key) : b.value - a.value));
    return {
      headline: { value: total ? Math.round((hit / total) * 100) : 0, previousValue: null, lastUpdated: new Date().toISOString() },
      series,
      chartType: isTime ? "line" : "bar",
    };
  }

  if (metric === "baseline_movement" || metric === "improvement_rate") {
    const { data, error } = await supa.from("beneficiary_baselines")
      .select("beneficiary_id, project_id, indicator_key, value_numeric, captured_at")
      .eq("organization_id", orgId)
      .not("value_numeric", "is", null)
      .limit(10000);
    if (error) throw new Error(error.message);
    const rows: any[] = data ?? [];
    // Group by (beneficiary, indicator) → earliest and latest
    const groups = new Map<string, { first: any; last: any }>();
    for (const r of rows) {
      const k = `${r.beneficiary_id}::${r.indicator_key}`;
      const g = groups.get(k);
      if (!g) groups.set(k, { first: r, last: r });
      else {
        if (new Date(r.captured_at) < new Date(g.first.captured_at)) g.first = r;
        if (new Date(r.captured_at) > new Date(g.last.captured_at)) g.last = r;
      }
    }
    const buckets = new Map<string, { delta: number; n: number; improved: number }>();
    let totalDelta = 0, n = 0, improved = 0;
    for (const [, g] of groups) {
      const d = Number(g.last.value_numeric) - Number(g.first.value_numeric);
      totalDelta += d; n += 1; if (d > 0) improved += 1;
      const key = dimension === "project" ? (g.last.project_id || "Unassigned")
        : dimension === "programme" ? (g.last.project_id || "Unassigned")
        : bucketKey(new Date(g.last.captured_at), dimension);
      const b = buckets.get(key) ?? { delta: 0, n: 0, improved: 0 };
      b.delta += d; b.n += 1; if (d > 0) b.improved += 1; buckets.set(key, b);
    }
    const isRate = metric === "improvement_rate";
    const series = Array.from(buckets.entries())
      .map(([key, v]) => ({
        key, label: key,
        value: isRate ? (v.n ? Math.round((v.improved / v.n) * 100) : 0) : Math.round((v.delta / (v.n || 1)) * 100) / 100,
      }))
      .sort((a, b) => (isTime ? a.key.localeCompare(b.key) : b.value - a.value));
    const headline = isRate ? (n ? Math.round((improved / n) * 100) : 0) : Math.round((totalDelta / (n || 1)) * 100) / 100;
    return {
      headline: { value: headline, previousValue: null, lastUpdated: new Date().toISOString() },
      series,
      chartType: isTime ? "line" : "bar",
    };
  }

  // indicator_average
  const { data, error } = await supa.from("indicator_values")
    .select("actual_value, period_start, indicator_id")
    .gte("period_start", from.toISOString().slice(0, 10))
    .lte("period_start", to.toISOString().slice(0, 10))
    .limit(10000);
  if (error) throw new Error(error.message);
  // Note: indicator_values has no organization_id — RLS is enforced via indicators FK
  const rows: any[] = data ?? [];
  const buckets = new Map<string, { sum: number; n: number }>();
  let sum = 0, n = 0;
  for (const r of rows) {
    const v = Number(r.actual_value || 0);
    sum += v; n += 1;
    const key = isTime ? bucketKey(new Date(r.period_start), dimension) : (r.indicator_id || "Unknown");
    const b = buckets.get(key) ?? { sum: 0, n: 0 };
    b.sum += v; b.n += 1; buckets.set(key, b);
  }
  const series = Array.from(buckets.entries())
    .map(([key, v]) => ({ key, label: key, value: v.n ? Math.round((v.sum / v.n) * 100) / 100 : 0 }))
    .sort((a, b) => (isTime ? a.key.localeCompare(b.key) : b.value - a.value));
  return {
    headline: { value: n ? Math.round((sum / n) * 100) / 100 : 0, previousValue: null, lastUpdated: new Date().toISOString() },
    series,
    chartType: isTime ? "line" : "bar",
  };
}

// ---------- OPERATIONS ----------
async function operationsHandler(supa: any, orgId: string, body: Body): Promise<Result> {
  const { metric, dimension, filters = {}, range } = body;
  const { from, to, prevFrom, prevTo } = resolveRange(range);
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const isTime = ["day", "week", "month"].includes(dimension);

  if (metric === "field_logs") {
    let q = supa.from("field_logs").select("id, logged_at, project_id")
      .eq("organization_id", orgId).gte("logged_at", fromIso).lte("logged_at", toIso).limit(10000);
    if (filters.project) q = q.eq("project_id", filters.project);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows: any[] = data ?? [];
    const buckets = new Map<string, number>();
    for (const r of rows) {
      const key = isTime ? bucketKey(new Date(r.logged_at), dimension) : (r.project_id || "Unassigned");
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const { count: prevCount } = await supa.from("field_logs").select("id", { count: "exact", head: true })
      .eq("organization_id", orgId).gte("logged_at", prevFrom.toISOString()).lte("logged_at", prevTo.toISOString());
    const series = Array.from(buckets.entries()).map(([k, v]) => ({ key: k, label: k, value: v }))
      .sort((a, b) => (isTime ? a.key.localeCompare(b.key) : b.value - a.value));
    return {
      headline: { value: rows.length, previousValue: prevCount ?? null, lastUpdated: new Date().toISOString() },
      series, chartType: isTime ? "line" : "bar",
    };
  }

  if (metric === "reports_submitted" || metric === "reports_overdue") {
    const isOverdue = metric === "reports_overdue";
    const dateCol = isOverdue ? "period_end" : "submitted_at";
    let q = supa.from("project_report_drafts")
      .select("id, project_id, period_end, submitted_at, status")
      .eq("organization_id", orgId).limit(10000);
    if (isOverdue) {
      q = q.neq("status", "submitted").neq("status", "approved").lt("period_end", new Date().toISOString().slice(0, 10));
    } else {
      q = q.not("submitted_at", "is", null).gte("submitted_at", fromIso).lte("submitted_at", toIso);
    }
    if (filters.project) q = q.eq("project_id", filters.project);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows: any[] = data ?? [];
    const buckets = new Map<string, number>();
    for (const r of rows) {
      const dt = r[dateCol] ? new Date(r[dateCol]) : new Date();
      const key = isTime ? bucketKey(dt, dimension) : (r.project_id || "Unassigned");
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    const series = Array.from(buckets.entries()).map(([k, v]) => ({ key: k, label: k, value: v }))
      .sort((a, b) => (isTime ? a.key.localeCompare(b.key) : b.value - a.value));
    return {
      headline: { value: rows.length, previousValue: null, lastUpdated: new Date().toISOString() },
      series, chartType: isTime ? "line" : "bar",
    };
  }

  // data_quality: % of unresolved flags out of total (lower is better → we surface score = 100 - pct)
  if (metric === "data_quality") {
    const [openRes, allRes] = await Promise.all([
      supa.from("data_quality_flags").select("id", { count: "exact", head: true })
        .eq("organization_id", orgId).eq("resolved", false),
      supa.from("data_quality_flags").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    ]);
    const open = openRes.count ?? 0;
    const all = allRes.count ?? 0;
    const score = all ? Math.max(0, Math.round(100 - (open / all) * 100)) : 100;
    return {
      headline: { value: score, previousValue: null, lastUpdated: new Date().toISOString() },
      series: [{ key: "score", label: "Data quality score", value: score }],
      chartType: "bar",
    };
  }

  return {
    headline: { value: 0, previousValue: null, lastUpdated: new Date().toISOString() },
    series: [], chartType: "bar",
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
    const userId = userData.user.id;

    const { data: orgRow, error: orgErr } = await supa.rpc("get_user_current_organization", { _user_id: userId });
    if (orgErr) return ok({ error: orgErr.message });
    const orgId: string | undefined = Array.isArray(orgRow) ? orgRow[0]?.organization_id : (orgRow as any)?.organization_id;
    if (!orgId) return ok({ error: "No active organization for user" });

    const body = (await req.json()) as Body;
    if (!body?.tab || !body?.metric || !body?.dimension) {
      return ok({ error: "tab, metric and dimension are required" });
    }

    let result: Result;
    if (body.tab === "people") result = await peopleHandler(supa, orgId, body);
    else if (body.tab === "programmes") result = await programmesHandler(supa, orgId, body);
    else if (body.tab === "money") result = await moneyHandler(supa, orgId, body);
    else if (body.tab === "impact") result = await impactHandler(supa, orgId, body);
    else if (body.tab === "operations") result = await operationsHandler(supa, orgId, body);
    else if (body.tab === "custom") {
      // Custom tab reuses whichever tab owns the metric — client must pass `sourceTab`
      const src = (body as any).sourceTab as string | undefined;
      if (src === "people") result = await peopleHandler(supa, orgId, { ...body, tab: "people" });
      else if (src === "programmes") result = await programmesHandler(supa, orgId, { ...body, tab: "programmes" });
      else if (src === "money") result = await moneyHandler(supa, orgId, { ...body, tab: "money" });
      else if (src === "impact") result = await impactHandler(supa, orgId, { ...body, tab: "impact" });
      else if (src === "operations") result = await operationsHandler(supa, orgId, { ...body, tab: "operations" });
      else return ok({ error: "invalid_source", message: "Custom queries require a sourceTab" });
    }
    else return ok({ error: "not_implemented", message: `${body.tab} tab is not yet implemented` });

    return ok(result);
  } catch (e) {
    return ok({ error: (e as Error).message ?? "Unknown error" });
  }
});