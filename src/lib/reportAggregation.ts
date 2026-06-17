import { supabase } from "@/integrations/supabase/client";

export interface QuantitativeReport {
  totals: {
    visits: number;
    observations: number;
    disbursements_value_base: number;
    activities_completed: number;
    new_enrollments: number;
    exits: number;
  };
  beneficiaries: {
    active: number;
    newly_enrolled: number;
    exited: number;
    high_risk: number;
  };
  indicators: Record<string, { label?: string; normalized?: number; raw?: number; unit?: string }>;
  highlights: Array<{
    id: string;
    title: string;
    date: string;
    category: string;
    snippet: string;
    photo_url?: string | null;
  }>;
}

function emptyReport(): QuantitativeReport {
  return {
    totals: { visits: 0, observations: 0, disbursements_value_base: 0, activities_completed: 0, new_enrollments: 0, exits: 0 },
    beneficiaries: { active: 0, newly_enrolled: 0, exited: 0, high_risk: 0 },
    indicators: {},
    highlights: [],
  };
}

/**
 * Build the quantitative JSON for a project over [period_start, period_end].
 * Reads field_logs, activities, beneficiaries, indicator_values directly.
 */
export async function buildProjectQuantitative(
  orgId: string,
  projectId: string,
  periodStart: string,
  periodEnd: string,
): Promise<QuantitativeReport> {
  const report = emptyReport();
  const sb = supabase as any;

  // Period bounds as ISO strings
  const startIso = `${periodStart}T00:00:00Z`;
  const endIso = `${periodEnd}T23:59:59Z`;

  // 1. field_logs (counts by category + highlights)
  const { data: logs } = await sb
    .from("field_logs")
    .select("id,title,body,category,logged_at,photo_urls")
    .eq("organization_id", orgId)
    .eq("project_id", projectId)
    .gte("logged_at", startIso)
    .lte("logged_at", endIso)
    .order("logged_at", { ascending: false });

  const fLogs = (logs as any[]) || [];
  report.totals.visits = fLogs.filter((l) => l.category === "visit").length;
  report.totals.observations = fLogs.filter((l) => l.category === "observation").length;

  // Top 5 highlights — prefer milestones/photos first, then most recent
  const ranked = [...fLogs].sort((a, b) => {
    const score = (l: any) => (l.category === "milestone" ? 3 : l.category === "photo" ? 2 : l.category === "incident" ? 2 : 1);
    return score(b) - score(a);
  });
  report.highlights = ranked.slice(0, 5).map((l) => ({
    id: l.id,
    title: l.title,
    date: l.logged_at,
    category: l.category,
    snippet: (l.body || "").slice(0, 180),
    photo_url: Array.isArray(l.photo_urls) && l.photo_urls.length > 0 ? l.photo_urls[0] : null,
  }));

  // 2. Activities completed in period
  const { count: actCompleted } = await sb
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("project_id", projectId)
    .eq("status", "completed")
    .gte("updated_at", startIso)
    .lte("updated_at", endIso);
  report.totals.activities_completed = actCompleted || 0;

  // 3. Disbursements in period (activity_disbursements joined on activities for this project)
  try {
    const { data: disb } = await sb
      .from("activity_disbursements")
      .select("amount, activity_id, activities!inner(project_id, organization_id)")
      .eq("activities.organization_id", orgId)
      .eq("activities.project_id", projectId)
      .gte("created_at", startIso)
      .lte("created_at", endIso);
    report.totals.disbursements_value_base = ((disb as any[]) || []).reduce(
      (s, d) => s + Number(d.amount || 0),
      0,
    );
  } catch {
    /* ignore if table not accessible */
  }

  // 4. Beneficiaries linked to this project
  const { data: links } = await sb
    .from("beneficiary_services")
    .select("beneficiary_id, enrolled_at, exited_at, status")
    .eq("organization_id", orgId)
    .eq("project_id", projectId);
  const linkRows = (links as any[]) || [];
  const activeIds = new Set(linkRows.filter((r) => !r.exited_at).map((r) => r.beneficiary_id));
  report.beneficiaries.active = activeIds.size;
  report.beneficiaries.newly_enrolled = linkRows.filter(
    (r) => r.enrolled_at && r.enrolled_at >= periodStart && r.enrolled_at <= periodEnd,
  ).length;
  report.beneficiaries.exited = linkRows.filter(
    (r) => r.exited_at && r.exited_at >= periodStart && r.exited_at <= periodEnd,
  ).length;
  report.totals.new_enrollments = report.beneficiaries.newly_enrolled;
  report.totals.exits = report.beneficiaries.exited;

  // High-risk count
  if (activeIds.size > 0) {
    try {
      const { data: risk } = await sb
        .from("beneficiary_risk_scores")
        .select("beneficiary_id, risk_level")
        .in("beneficiary_id", Array.from(activeIds));
      report.beneficiaries.high_risk = ((risk as any[]) || []).filter((r) =>
        ["high", "critical"].includes(String(r.risk_level || "").toLowerCase()),
      ).length;
    } catch {
      /* optional */
    }
  }

  // 5. Indicators reported in period (project-level)
  try {
    const { data: ivals } = await sb
      .from("indicator_values")
      .select("indicator_id, value, reporting_date, indicators(name, unit)")
      .eq("organization_id", orgId)
      .eq("project_id", projectId)
      .gte("reporting_date", periodStart)
      .lte("reporting_date", periodEnd);
    for (const v of (ivals as any[]) || []) {
      const key = v.indicator_id;
      const num = Number(v.value);
      if (!report.indicators[key]) {
        report.indicators[key] = {
          label: v.indicators?.name,
          unit: v.indicators?.unit,
          raw: isFinite(num) ? num : undefined,
        };
      } else if (isFinite(num)) {
        report.indicators[key].raw = ((report.indicators[key].raw || 0) + num);
      }
    }
  } catch {
    /* optional */
  }

  return report;
}

/**
 * Aggregate approved project reports into a program-level report.
 * - sums totals
 * - sums beneficiary counts
 * - weighted-averages normalized indicators by beneficiaries.active
 * - merges highlights (dedup by title+date)
 */
export function aggregateProgramQuantitative(reports: QuantitativeReport[]): QuantitativeReport {
  const out = emptyReport();
  if (!reports.length) return out;

  for (const r of reports) {
    out.totals.visits += r.totals.visits;
    out.totals.observations += r.totals.observations;
    out.totals.disbursements_value_base += r.totals.disbursements_value_base;
    out.totals.activities_completed += r.totals.activities_completed;
    out.totals.new_enrollments += r.totals.new_enrollments;
    out.totals.exits += r.totals.exits;
    out.beneficiaries.active += r.beneficiaries.active;
    out.beneficiaries.newly_enrolled += r.beneficiaries.newly_enrolled;
    out.beneficiaries.exited += r.beneficiaries.exited;
    out.beneficiaries.high_risk += r.beneficiaries.high_risk;
  }

  // Weighted indicator averages
  const acc: Record<string, { label?: string; unit?: string; sumW: number; sumWV: number; sumRaw: number }> = {};
  for (const r of reports) {
    const w = Math.max(1, r.beneficiaries.active);
    for (const [k, v] of Object.entries(r.indicators)) {
      if (!acc[k]) acc[k] = { label: v.label, unit: v.unit, sumW: 0, sumWV: 0, sumRaw: 0 };
      if (typeof v.normalized === "number") {
        acc[k].sumW += w;
        acc[k].sumWV += v.normalized * w;
      }
      if (typeof v.raw === "number") acc[k].sumRaw += v.raw;
    }
  }
  for (const [k, a] of Object.entries(acc)) {
    out.indicators[k] = {
      label: a.label,
      unit: a.unit,
      normalized: a.sumW > 0 ? a.sumWV / a.sumW : undefined,
      raw: a.sumRaw || undefined,
    };
  }

  // Merge & dedup highlights
  const seen = new Set<string>();
  for (const r of reports) {
    for (const h of r.highlights) {
      const key = `${h.title}::${h.date.slice(0, 10)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.highlights.push(h);
      if (out.highlights.length >= 10) break;
    }
    if (out.highlights.length >= 10) break;
  }

  return out;
}