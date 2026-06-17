import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Eligibility scoring engine.
 *
 * Modes (in payload `mode`):
 *  - "beneficiary_project": score one (beneficiaryId, projectId) pair
 *  - "beneficiary":         score one beneficiary across every project in org
 *  - "project":             score every (non-enrolled) beneficiary against one project
 *  - "recompute_all":       score every beneficiary against every project in org
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json().catch(() => ({}));
    const { organizationId, mode, beneficiaryId, projectId } = payload as {
      organizationId?: string;
      mode?: string;
      beneficiaryId?: string;
      projectId?: string;
    };

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return ok({ error: "Unauthorized" });
    if (!organizationId) return ok({ error: "organizationId required" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await userClient.auth.getClaims(token);
    if (!claims?.claims?.sub) return ok({ error: "Unauthorized" });
    const userId = claims.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: membership } = await admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership) return ok({ error: "Forbidden" });

    const m = mode || "beneficiary_project";

    // Resolve targets
    let projectIds: string[] = [];
    let beneficiaryIds: string[] = [];

    if (m === "beneficiary_project") {
      if (!beneficiaryId || !projectId) return ok({ error: "beneficiaryId+projectId required" });
      projectIds = [projectId];
      beneficiaryIds = [beneficiaryId];
    } else if (m === "beneficiary") {
      if (!beneficiaryId) return ok({ error: "beneficiaryId required" });
      beneficiaryIds = [beneficiaryId];
      const { data: pr } = await admin.from("projects").select("id").eq("organization_id", organizationId);
      projectIds = (pr || []).map((p: any) => p.id);
    } else if (m === "project") {
      if (!projectId) return ok({ error: "projectId required" });
      projectIds = [projectId];
      // beneficiaries not already exited from this project
      const { data: enrolled } = await admin
        .from("beneficiary_services")
        .select("beneficiary_id")
        .eq("organization_id", organizationId)
        .eq("project_id", projectId);
      const enrolledIds = new Set((enrolled || []).map((r: any) => r.beneficiary_id));
      const { data: bens } = await admin
        .from("beneficiaries")
        .select("id")
        .eq("organization_id", organizationId)
        .is("deleted_at", null);
      beneficiaryIds = (bens || []).map((b: any) => b.id).filter((id: string) => !enrolledIds.has(id));
    } else if (m === "recompute_all") {
      const { data: pr } = await admin.from("projects").select("id").eq("organization_id", organizationId);
      projectIds = (pr || []).map((p: any) => p.id);
      const { data: bens } = await admin
        .from("beneficiaries")
        .select("id")
        .eq("organization_id", organizationId)
        .is("deleted_at", null);
      beneficiaryIds = (bens || []).map((b: any) => b.id);
    } else {
      return ok({ error: "unknown mode" });
    }

    if (projectIds.length === 0 || beneficiaryIds.length === 0) {
      return ok({ success: true, scored: 0 });
    }

    // Fetch all rules for the target projects
    const { data: rules } = await admin
      .from("project_eligibility_rules")
      .select("*")
      .eq("organization_id", organizationId)
      .in("project_id", projectIds);
    const rulesByProject = new Map<string, any[]>();
    for (const r of rules || []) {
      if (!rulesByProject.has(r.project_id)) rulesByProject.set(r.project_id, []);
      rulesByProject.get(r.project_id)!.push(r);
    }

    // Fetch beneficiaries
    const { data: bens } = await admin
      .from("beneficiaries")
      .select("*")
      .in("id", beneficiaryIds);
    const benById = new Map<string, any>((bens || []).map((b: any) => [b.id, b]));

    // Fetch baselines for these beneficiaries+projects so 'baseline.<key>' sources work
    const { data: baselines } = await admin
      .from("beneficiary_baselines")
      .select("beneficiary_id, project_id, indicator_key, value")
      .in("beneficiary_id", beneficiaryIds)
      .in("project_id", projectIds);
    const baselineByKey = new Map<string, Map<string, any>>();
    for (const b of baselines || []) {
      const k = `${b.beneficiary_id}:${b.project_id}`;
      if (!baselineByKey.has(k)) baselineByKey.set(k, new Map());
      baselineByKey.get(k)!.set(b.indicator_key, b.value);
    }

    const rows: any[] = [];
    let scored = 0;

    for (const pid of projectIds) {
      const projectRules = rulesByProject.get(pid) || [];
      for (const bid of beneficiaryIds) {
        const ben = benById.get(bid);
        if (!ben) continue;
        const baselineMap = baselineByKey.get(`${bid}:${pid}`) || new Map();

        let score = 0;
        let maxScore = 0;
        const matched: any[] = [];
        const failedRequired: any[] = [];

        for (const rule of projectRules) {
          const points = Number(rule.points_if_match || 0) * Number(rule.weight || 1);
          maxScore += Math.max(0, points);
          const fieldVal = resolveSource(rule.source, ben, baselineMap);
          const ok = evaluate(rule.operator, fieldVal, rule.value);
          if (ok) {
            score += points;
            matched.push({ rule_id: rule.id, name: rule.name, points });
          } else if (rule.required) {
            failedRequired.push({ rule_id: rule.id, name: rule.name });
          }
        }

        const eligible = failedRequired.length === 0 && (projectRules.length === 0 || score > 0);

        rows.push({
          organization_id: organizationId,
          beneficiary_id: bid,
          project_id: pid,
          score: Math.round(score),
          max_score: Math.round(maxScore),
          eligible,
          matched_rules: matched,
          failed_required_rules: failedRequired,
          computed_at: new Date().toISOString(),
        });
        scored++;
      }
    }

    // Upsert in chunks
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await admin
        .from("beneficiary_eligibility_scores")
        .upsert(chunk, { onConflict: "beneficiary_id,project_id" });
      if (error) return ok({ error: error.message });
    }

    return ok({ success: true, scored, projects: projectIds.length, beneficiaries: beneficiaryIds.length });
  } catch (err: any) {
    return ok({ error: err?.message || "Unhandled error" });
  }
});

function resolveSource(source: string, ben: any, baseline: Map<string, any>): any {
  if (!source) return null;
  const [domain, ...rest] = source.split(".");
  const key = rest.join(".");
  if (domain === "beneficiary") {
    if (key === "age") {
      if (ben.age != null) return Number(ben.age);
      if (ben.date_of_birth) {
        const d = new Date(ben.date_of_birth);
        if (!isNaN(d.getTime())) {
          const diff = Date.now() - d.getTime();
          return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
        }
      }
      return null;
    }
    // direct column lookup, else search in custom JSON fields (additional_data, etc.)
    if (key in ben) return ben[key];
    for (const blob of ["additional_data", "custom_fields", "metadata"]) {
      if (ben[blob] && typeof ben[blob] === "object" && key in ben[blob]) return ben[blob][key];
    }
    return null;
  }
  if (domain === "baseline") {
    return baseline.get(key) ?? null;
  }
  return null;
}

function evaluate(op: string, fieldRaw: any, valueRaw: any): boolean {
  if (op === "is_null") return fieldRaw === null || fieldRaw === undefined || fieldRaw === "";
  if (op === "not_null") return !(fieldRaw === null || fieldRaw === undefined || fieldRaw === "");

  if (fieldRaw === null || fieldRaw === undefined) return false;

  // Try numeric comparisons first
  const numField = typeof fieldRaw === "number" ? fieldRaw : Number(fieldRaw);
  const numValue = typeof valueRaw === "number" ? valueRaw : Number(valueRaw);

  switch (op) {
    case "<":  return Number.isFinite(numField) && Number.isFinite(numValue) && numField < numValue;
    case "<=": return Number.isFinite(numField) && Number.isFinite(numValue) && numField <= numValue;
    case ">":  return Number.isFinite(numField) && Number.isFinite(numValue) && numField > numValue;
    case ">=": return Number.isFinite(numField) && Number.isFinite(numValue) && numField >= numValue;
    case "=":  {
      if (Number.isFinite(numField) && Number.isFinite(numValue)) return numField === numValue;
      return String(fieldRaw).toLowerCase() === String(valueRaw).toLowerCase();
    }
    case "between": {
      if (!Array.isArray(valueRaw) || valueRaw.length < 2) return false;
      const lo = Number(valueRaw[0]), hi = Number(valueRaw[1]);
      return Number.isFinite(numField) && numField >= lo && numField <= hi;
    }
    case "in":
      return Array.isArray(valueRaw) && valueRaw.some((v) => String(v).toLowerCase() === String(fieldRaw).toLowerCase());
    case "not_in":
      return Array.isArray(valueRaw) && !valueRaw.some((v) => String(v).toLowerCase() === String(fieldRaw).toLowerCase());
  }
  return false;
}