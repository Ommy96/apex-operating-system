// Project anomaly scanner — rule-based, runs nightly via pg_cron.
// Also computes burn-vs-impact snapshots per project for the current period.
// Returns HTTP 200 even on handled errors so callers can render toasts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

type Period = "monthly" | "quarterly" | "yearly";

function periodBounds(period: Period, now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (period === "monthly") {
    return {
      start: new Date(Date.UTC(y, m, 1)),
      end: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59)),
    };
  }
  if (period === "quarterly") {
    const qStart = Math.floor(m / 3) * 3;
    return {
      start: new Date(Date.UTC(y, qStart, 1)),
      end: new Date(Date.UTC(y, qStart + 3, 0, 23, 59, 59)),
    };
  }
  return {
    start: new Date(Date.UTC(y, 0, 1)),
    end: new Date(Date.UTC(y, 11, 31, 23, 59, 59)),
  };
}

function elapsedFraction(start: Date, end: Date, now = new Date()) {
  const total = end.getTime() - start.getTime();
  const used = Math.max(0, Math.min(total, now.getTime() - start.getTime()));
  return total > 0 ? used / total : 0;
}

function safeDiv(a: number, b: number) {
  return b > 0 ? a / b : 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  let body: { organization_id?: string; period?: Period } = {};
  try {
    if (req.method === "POST") body = await req.json().catch(() => ({}));
  } catch { /* ignore */ }
  const period: Period = (body.period as Period) || "monthly";

  try {
    // 1) Projects in scope
    let projectsQ = supabase
      .from("projects")
      .select("id, organization_id, name, budget, start_date, end_date, status")
      .is("deleted_at", null);
    if (body.organization_id) projectsQ = projectsQ.eq("organization_id", body.organization_id);
    const { data: projects, error: projErr } = await projectsQ;
    if (projErr) throw projErr;

    const { start, end } = periodBounds(period);
    const startISO = start.toISOString();
    const endISO = end.toISOString();
    const elapsed = elapsedFraction(start, end);
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400_000).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400_000).toISOString();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400_000).toISOString();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400_000).toISOString();

    let flagsRaised = 0;
    let flagsResolved = 0;
    let snapshotsWritten = 0;
    const projectSummaries: any[] = [];

    for (const p of projects || []) {
      const orgId = p.organization_id;
      const projectId = p.id;
      const detected: { kind: string; severity: "info" | "warning" | "critical"; detail: any }[] = [];

      // === Burn rate ===
      const { data: allocations } = await supabase
        .from("allocations")
        .select("amount_base, base_currency, status, allocated_at")
        .eq("organization_id", orgId)
        .eq("project_id", projectId)
        .gte("allocated_at", startISO)
        .lte("allocated_at", endISO);

      const allocatedBase = (allocations || []).reduce(
        (s, a: any) => s + Number(a.amount_base ?? 0),
        0
      );
      const baseVolume = allocatedBase;
      const budgetBase = Number(p.budget ?? 0);
      // For monthly we treat budget as full project budget pro-rated; if no budget, burn=0
      const budgetForPeriod =
        period === "yearly" ? budgetBase :
        period === "quarterly" ? budgetBase / 4 :
        budgetBase / 12;
      const burnRate = safeDiv(allocatedBase, budgetForPeriod);
      const expectedBurn = elapsed; // 0..1
      if (budgetForPeriod > 0 && burnRate > expectedBurn * 1.3 && expectedBurn > 0.05) {
        detected.push({
          kind: "burn_overrun",
          severity: burnRate > expectedBurn * 1.6 ? "critical" : "warning",
          detail: {
            burn_rate: Number(burnRate.toFixed(3)),
            expected: Number(expectedBurn.toFixed(3)),
            allocated_base: allocatedBase,
            budget_for_period: budgetForPeriod,
            period,
          },
        });
      }

      // === Report overdue ===
      const { data: overdueReports } = await supabase
        .from("project_report_drafts")
        .select("id, period_end, submitted_at, status")
        .eq("organization_id", orgId)
        .eq("project_id", projectId)
        .is("submitted_at", null)
        .lt("period_end", fourteenDaysAgo);
      if ((overdueReports || []).length) {
        detected.push({
          kind: "report_overdue",
          severity: "warning",
          detail: {
            overdue_count: overdueReports!.length,
            oldest_period_end: overdueReports!
              .map((r: any) => r.period_end)
              .sort()[0],
          },
        });
      }

      // === Allocations on hold > 14 days ===
      const { data: heldAllocs } = await supabase
        .from("allocations")
        .select("id, allocated_at, amount_base")
        .eq("organization_id", orgId)
        .eq("project_id", projectId)
        .eq("status", "held")
        .lte("allocated_at", fourteenDaysAgo);
      if ((heldAllocs || []).length) {
        detected.push({
          kind: "allocations_on_hold",
          severity: "warning",
          detail: {
            count: heldAllocs!.length,
            total_base: heldAllocs!.reduce(
              (s, a: any) => s + Number(a.amount_base ?? 0),
              0
            ),
          },
        });
      }

      // === Enrollment drop > 15% in 30 days ===
      const { count: activeNow } = await supabase
        .from("beneficiary_services")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("project_id", projectId)
        .in("status", ["active", "enrolled"]);
      const { count: active30 } = await supabase
        .from("beneficiary_services")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("project_id", projectId)
        .in("status", ["active", "enrolled"])
        .lte("enrolled_date", thirtyDaysAgo);
      if ((active30 || 0) >= 5) {
        const drop = ((active30 || 0) - (activeNow || 0)) / (active30 || 1);
        if (drop > 0.15) {
          detected.push({
            kind: "enrollment_drop",
            severity: drop > 0.3 ? "critical" : "warning",
            detail: {
              from: active30,
              to: activeNow,
              drop_pct: Number((drop * 100).toFixed(1)),
              window_days: 30,
            },
          });
        }
      }

      // === Attendance drop > 20% in 30 days (activity_participants.attended) ===
      const { data: actsRecent } = await supabase
        .from("activities")
        .select("id, completed_at, scheduled_at")
        .eq("organization_id", orgId)
        .eq("project_id", projectId)
        .gte("scheduled_at", sixtyDaysAgo);
      const recentActIds = (actsRecent || [])
        .filter((a: any) => a.scheduled_at >= thirtyDaysAgo)
        .map((a: any) => a.id);
      const prevActIds = (actsRecent || [])
        .filter((a: any) => a.scheduled_at < thirtyDaysAgo)
        .map((a: any) => a.id);
      async function attRate(ids: string[]) {
        if (!ids.length) return null;
        const { data: parts } = await supabase
          .from("activity_participants")
          .select("attended")
          .in("activity_id", ids);
        const total = (parts || []).length;
        if (!total) return null;
        const att = (parts || []).filter((p: any) => p.attended).length;
        return att / total;
      }
      const [recAtt, prevAtt] = await Promise.all([attRate(recentActIds), attRate(prevActIds)]);
      if (recAtt !== null && prevAtt !== null && prevAtt > 0) {
        const drop = (prevAtt - recAtt) / prevAtt;
        if (drop > 0.2) {
          detected.push({
            kind: "attendance_drop",
            severity: drop > 0.4 ? "critical" : "warning",
            detail: {
              from: Number((prevAtt * 100).toFixed(1)),
              to: Number((recAtt * 100).toFixed(1)),
              drop_pct: Number((drop * 100).toFixed(1)),
            },
          });
        }
      }

      // === Field log frequency drop > 50% vs trailing 90 days ===
      const { count: logs30 } = await supabase
        .from("field_logs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("project_id", projectId)
        .gte("logged_at", thirtyDaysAgo);
      const { count: logs90 } = await supabase
        .from("field_logs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("project_id", projectId)
        .gte("logged_at", ninetyDaysAgo);
      const baseline30 = (logs90 || 0) / 3; // avg per 30d window
      if (baseline30 >= 3) {
        const drop = (baseline30 - (logs30 || 0)) / baseline30;
        if (drop > 0.5) {
          detected.push({
            kind: "field_log_frequency_drop",
            severity: drop > 0.75 ? "critical" : "warning",
            detail: {
              last_30: logs30,
              avg_30: Number(baseline30.toFixed(1)),
              drop_pct: Number((drop * 100).toFixed(1)),
            },
          });
        }
      }

      // === Impact velocity from indicator_values ===
      const { data: indVals } = await supabase
        .from("indicator_values")
        .select("indicator_id, value, period_start, period_end, target_value")
        .eq("organization_id", orgId)
        .eq("project_id", projectId)
        .gte("period_start", startISO)
        .lte("period_end", endISO);
      let actual = 0;
      let planned = 0;
      (indVals || []).forEach((v: any) => {
        const val = Number(v.value ?? 0);
        const tgt = Number(v.target_value ?? 0);
        if (tgt > 0) {
          actual += val;
          planned += tgt;
        }
      });
      const impactVelocity = safeDiv(actual, planned);

      // === Upsert snapshot ===
      const snap = {
        organization_id: orgId,
        project_id: projectId,
        period,
        period_start: startISO.slice(0, 10),
        period_end: endISO.slice(0, 10),
        burn_rate: Number(burnRate.toFixed(4)),
        impact_velocity: Number(impactVelocity.toFixed(4)),
        base_volume: baseVolume,
        budget_base: budgetBase,
        allocated_base: allocatedBase,
        indicator_actual: actual,
        indicator_planned: planned,
        detail: { elapsed: Number(elapsed.toFixed(3)) },
        computed_at: now.toISOString(),
      };
      const { error: upErr } = await supabase
        .from("burn_impact_snapshots")
        .upsert(snap, { onConflict: "organization_id,project_id,period,period_start" });
      if (!upErr) snapshotsWritten++;

      // === Persist flags (idempotent: skip if same kind already open) ===
      const { data: openFlags } = await supabase
        .from("project_anomaly_flags")
        .select("id, kind")
        .eq("organization_id", orgId)
        .eq("project_id", projectId)
        .is("resolved_at", null);
      const openKinds = new Set((openFlags || []).map((f: any) => f.kind));
      const detectedKinds = new Set(detected.map((d) => d.kind));

      for (const f of detected) {
        if (openKinds.has(f.kind)) {
          await supabase
            .from("project_anomaly_flags")
            .update({ detail: f.detail, severity: f.severity, detected_at: now.toISOString() })
            .eq("organization_id", orgId)
            .eq("project_id", projectId)
            .eq("kind", f.kind)
            .is("resolved_at", null);
        } else {
          const { error: insErr } = await supabase
            .from("project_anomaly_flags")
            .insert({
              organization_id: orgId,
              project_id: projectId,
              kind: f.kind,
              severity: f.severity,
              detail: f.detail,
            });
          if (!insErr) flagsRaised++;
        }
      }
      // Auto-resolve flags whose condition cleared
      for (const k of openKinds) {
        if (!detectedKinds.has(k as string)) {
          await supabase
            .from("project_anomaly_flags")
            .update({
              resolved_at: now.toISOString(),
              resolution_note: "Auto-resolved: condition cleared",
            })
            .eq("organization_id", orgId)
            .eq("project_id", projectId)
            .eq("kind", k)
            .is("resolved_at", null);
          flagsResolved++;
        }
      }

      projectSummaries.push({
        project_id: projectId,
        burn_rate: snap.burn_rate,
        impact_velocity: snap.impact_velocity,
        flags: detected.map((d) => d.kind),
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        period,
        projects_scanned: (projects || []).length,
        flags_raised: flagsRaised,
        flags_resolved: flagsResolved,
        snapshots_written: snapshotsWritten,
        projects: projectSummaries,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, message: String(e?.message ?? e) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});