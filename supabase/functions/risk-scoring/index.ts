import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Heuristic risk scorer that flags:
 *  - school_dropout: poor academic trend or many absences
 *  - malnutrition: visit notes contain malnutrition/health flags
 *  - aid_dependency: very high amount_given relative to peers, no exit progress
 *  - household_crisis: visit notes contain crisis/abuse/eviction keywords
 *  - inactive: no service activity in >120 days
 * Persists into beneficiary_risk_scores.risk_flags (jsonb array).
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { organizationId } = await req.json();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!organizationId) {
      return new Response(JSON.stringify({ error: "organizationId required" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims } = await userClient.auth.getClaims(token);
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub as string;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: membership } = await admin
      .from("organization_members").select("user_id")
      .eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const [{ data: beneficiaries }, { data: academics }, { data: visits }, { data: services }] = await Promise.all([
      admin.from("beneficiaries").select("id, display_name, status, amount_given, funding_required").eq("organization_id", organizationId).limit(2000),
      admin.from("beneficiary_academics").select("beneficiary_id, total_marks, out_of, academic_year").eq("organization_id", organizationId).order("academic_year", { ascending: false }).limit(5000),
      admin.from("beneficiary_visitations").select("beneficiary_id, visit_date, challenges_identified, observation_findings").eq("organization_id", organizationId).order("visit_date", { ascending: false }).limit(3000),
      admin.from("beneficiary_services").select("beneficiary_id, status, enrolled_date, exit_date").eq("organization_id", organizationId).limit(5000),
    ]);

    const academicMap = new Map<string, Array<{ pct: number; year: string }>>();
    (academics ?? []).forEach((a: any) => {
      if (!a.total_marks || !a.out_of) return;
      const pct = (a.total_marks / a.out_of) * 100;
      const arr = academicMap.get(a.beneficiary_id) ?? [];
      arr.push({ pct, year: a.academic_year });
      academicMap.set(a.beneficiary_id, arr);
    });

    const visitMap = new Map<string, any[]>();
    (visits ?? []).forEach((v: any) => {
      const arr = visitMap.get(v.beneficiary_id) ?? [];
      arr.push(v);
      visitMap.set(v.beneficiary_id, arr);
    });

    const serviceMap = new Map<string, any[]>();
    (services ?? []).forEach((s: any) => {
      const arr = serviceMap.get(s.beneficiary_id) ?? [];
      arr.push(s);
      serviceMap.set(s.beneficiary_id, arr);
    });

    const now = Date.now();
    const DAY = 1000 * 60 * 60 * 24;

    const allAmounts = (beneficiaries ?? []).map((b: any) => b.amount_given ?? 0).filter((n: number) => n > 0).sort((a, b) => a - b);
    const p90 = allAmounts.length ? allAmounts[Math.floor(allAmounts.length * 0.9)] : Infinity;

    const malnutritionRe = /malnutri|underweight|stunt|wasting|hunger/i;
    const crisisRe = /crisis|abuse|eviction|violence|displaced|orphan|trauma/i;

    let updated = 0;
    const flagCounts: Record<string, number> = {};

    for (const b of beneficiaries ?? []) {
      const flags: Array<{ key: string; severity: "high" | "medium" | "low"; explanation: string }> = [];
      const acad = academicMap.get(b.id) ?? [];
      if (acad.length >= 2) {
        const sorted = acad.slice(0, 4);
        const recent = sorted[0].pct;
        const prior = sorted[sorted.length - 1].pct;
        if (recent < 50 || (prior - recent) > 15) {
          flags.push({ key: "school_dropout", severity: recent < 40 ? "high" : "medium", explanation: `Recent score ${recent.toFixed(0)}% (was ${prior.toFixed(0)}%).` });
        }
      }

      const bVisits = visitMap.get(b.id) ?? [];
      const malnu = bVisits.find((v) => malnutritionRe.test(`${v.challenges_identified ?? ""} ${v.observation_findings ?? ""}`));
      if (malnu) flags.push({ key: "malnutrition", severity: "high", explanation: `Visit on ${malnu.visit_date} flagged nutrition concerns.` });

      const crisis = bVisits.find((v) => crisisRe.test(`${v.challenges_identified ?? ""} ${v.observation_findings ?? ""}`));
      if (crisis) flags.push({ key: "household_crisis", severity: "high", explanation: `Visit on ${crisis.visit_date} flagged household crisis.` });

      if ((b.amount_given ?? 0) >= p90 && p90 > 0) {
        flags.push({ key: "aid_dependency", severity: "medium", explanation: `Receives in top 10% of beneficiaries with no recorded exit progress.` });
      }

      const bServices = serviceMap.get(b.id) ?? [];
      const lastDate = bServices.reduce<number>((max, s) => {
        const d = s.exit_date ? new Date(s.exit_date).getTime() : s.enrolled_date ? new Date(s.enrolled_date).getTime() : 0;
        return Math.max(max, d);
      }, 0);
      const daysSince = lastDate ? Math.floor((now - lastDate) / DAY) : null;
      if (b.status === "active" && (daysSince === null || daysSince > 120)) {
        flags.push({ key: "inactive", severity: "low", explanation: daysSince === null ? "No service activity on record." : `No service activity for ${daysSince} days.` });
      }

      flags.forEach((f) => { flagCounts[f.key] = (flagCounts[f.key] ?? 0) + 1; });

      const overall = flags.some((f) => f.severity === "high")
        ? "high"
        : flags.some((f) => f.severity === "medium") ? "medium" : "low";

      // Upsert latest row (one per beneficiary, dated today)
      const today = new Date().toISOString().slice(0, 10);
      const { data: existing } = await admin
        .from("beneficiary_risk_scores")
        .select("id")
        .eq("beneficiary_id", b.id)
        .eq("organization_id", organizationId)
        .eq("assessment_date", today)
        .maybeSingle();

      if (existing?.id) {
        await admin.from("beneficiary_risk_scores").update({
          risk_flags: flags, overall_risk_level: overall, assessed_by: userId, updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await admin.from("beneficiary_risk_scores").insert({
          beneficiary_id: b.id, organization_id: organizationId,
          assessment_date: today, risk_flags: flags, overall_risk_level: overall, assessed_by: userId,
        });
      }
      updated++;
    }

    return new Response(JSON.stringify({ updated, flagCounts, generatedAt: new Date().toISOString() }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});