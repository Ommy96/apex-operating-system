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
    else return ok({ error: "not_implemented", message: `${body.tab} tab is not yet implemented` });

    return ok(result);
  } catch (e) {
    return ok({ error: (e as Error).message ?? "Unknown error" });
  }
});