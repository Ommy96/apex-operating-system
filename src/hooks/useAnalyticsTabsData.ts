import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import type { AnalyticsFilters } from "@/hooks/useAnalyticsFilters";
import { forecastLinear, averageGrowthRate } from "@/lib/forecasting";

/**
 * Date helpers.  All filter dates are inclusive on the user-facing side,
 * so the upper bound is shifted to end-of-day before being sent to PostgREST.
 */
function toIso(d: Date | undefined): string | null {
  return d ? d.toISOString() : null;
}

function withinAge(dob: string | null, bucket: AnalyticsFilters["ageBucket"]): boolean {
  if (bucket === "all") return true;
  if (!dob) return false;
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400_000));
  switch (bucket) {
    case "0-5": return age >= 0 && age <= 5;
    case "6-12": return age >= 6 && age <= 12;
    case "13-17": return age >= 13 && age <= 17;
    case "18-35": return age >= 18 && age <= 35;
    case "36-60": return age >= 36 && age <= 60;
    case "60+": return age > 60;
  }
}

/* ------------------------------------------------------------------ */
/* Beneficiary intelligence                                            */
/* ------------------------------------------------------------------ */

export function useBeneficiaryIntelligence(filters: AnalyticsFilters) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const fromIso = toIso(filters.dateRange?.from);
  const toIsoStr = toIso(filters.dateRange?.to);

  return useQuery({
    queryKey: ["analytics-beneficiary", orgId, fromIso, toIsoStr, filters.county, filters.programId, filters.gender, filters.ageBucket],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      // Beneficiaries (apply non-date filters server-side, age client-side)
      let q = supabase
        .from("beneficiaries")
        .select("id, status, gender, date_of_birth, county, created_at, beneficiary_type, vulnerability_level, exit_reason")
        .eq("organization_id", orgId!)
        .is("deleted_at", null);
      if (filters.county !== "all") q = q.eq("county", filters.county);
      if (filters.gender !== "all") q = q.eq("gender", filters.gender as any);
      const { data: rows } = await q;
      const ben = (rows ?? []).filter((b) => withinAge(b.date_of_birth, filters.ageBucket));

      // Programme enrolments (used to filter by selected programme + count active)
      let svcQ = supabase
        .from("beneficiary_services")
        .select("beneficiary_id, program_id, status, enrolled_date, exit_date")
        .eq("organization_id", orgId!);
      if (filters.programId !== "all") svcQ = svcQ.eq("program_id", filters.programId);
      const { data: services = [] } = await svcQ;

      const enrolledIds = new Set((services ?? []).map((s) => s.beneficiary_id));
      const filteredBen = filters.programId === "all" ? ben : ben.filter((b) => enrolledIds.has(b.id));

      // KPIs
      const total = filteredBen.length;
      const active = filteredBen.filter((b) => (b.status || "").toLowerCase() === "active").length;
      const inactive = filteredBen.filter((b) => (b.status || "").toLowerCase() === "inactive").length;
      const exited = filteredBen.filter((b) => b.exit_reason || (b.status || "").toLowerCase() === "exited").length;
      const newInRange = filteredBen.filter((b) => {
        if (!fromIso || !toIsoStr) return false;
        const c = new Date(b.created_at).getTime();
        return c >= new Date(fromIso).getTime() && c <= new Date(toIsoStr).getTime();
      }).length;

      // Gender mix
      const genderMix = filteredBen.reduce<Record<string, number>>((acc, b) => {
        const k = (b.gender ?? "unspecified").toString();
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});

      // County mix (top 6)
      const countyMix = Object.entries(
        filteredBen.reduce<Record<string, number>>((acc, b) => {
          const k = b.county ?? "Unknown";
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([county, count]) => ({ county, count }));

      // Vulnerability tiers
      const vulnerabilityMix = filteredBen.reduce<Record<string, number>>((acc, b) => {
        const k = b.vulnerability_level ?? "unassessed";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});

      // Type mix
      const typeMix = filteredBen.reduce<Record<string, number>>((acc, b) => {
        const k = b.beneficiary_type ?? "unknown";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});

      // Enrolment trend by month within filter window
      const monthly: Record<string, number> = {};
      if (fromIso && toIsoStr) {
        const start = new Date(fromIso);
        const end = new Date(toIsoStr);
        const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
        while (cursor <= end) {
          const k = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
          monthly[k] = 0;
          cursor.setMonth(cursor.getMonth() + 1);
        }
        filteredBen.forEach((b) => {
          const d = new Date(b.created_at);
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (k in monthly) monthly[k] += 1;
        });
      }

      return {
        total,
        active,
        inactive,
        exited,
        newInRange,
        genderMix,
        countyMix,
        vulnerabilityMix,
        typeMix,
        enrolmentTrend: Object.entries(monthly).map(([month, count]) => ({ month, count })),
      };
    },
  });
}

/* ------------------------------------------------------------------ */
/* Programme & project                                                 */
/* ------------------------------------------------------------------ */

export function useProgrammeIntelligence(filters: AnalyticsFilters) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ["analytics-programme", orgId, filters.programId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      let progQ = supabase
        .from("programs")
        .select("id, name, status, annual_funding_required, start_date, end_date")
        .eq("organization_id", orgId!)
        .is("deleted_at", null);
      if (filters.programId !== "all") progQ = progQ.eq("id", filters.programId);
      const { data: programs = [] } = await progQ;

      let projQ = supabase
        .from("projects")
        .select("id, name, program_id, status, budget, sponsorship_target_amount, start_date, end_date")
        .eq("organization_id", orgId!)
        .is("deleted_at", null);
      if (filters.programId !== "all") projQ = projQ.eq("program_id", filters.programId);
      const { data: projects = [] } = await projQ;

      let svcQ = supabase
        .from("beneficiary_services")
        .select("program_id, project_id, beneficiary_id, status")
        .eq("organization_id", orgId!);
      if (filters.programId !== "all") svcQ = svcQ.eq("program_id", filters.programId);
      const { data: services = [] } = await svcQ;

      const enrolByProgram = (services ?? []).reduce<Record<string, Set<string>>>((acc, s) => {
        if (!s.program_id) return acc;
        acc[s.program_id] ||= new Set();
        acc[s.program_id].add(s.beneficiary_id);
        return acc;
      }, {});

      const programmeRows = (programs ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status ?? "unknown",
        beneficiaries: enrolByProgram[p.id]?.size ?? 0,
        annualFunding: Number(p.annual_funding_required ?? 0),
        projectCount: (projects ?? []).filter((pr) => pr.program_id === p.id).length,
      }));

      const projectStatusMix = (projects ?? []).reduce<Record<string, number>>((acc, p) => {
        const k = p.status ?? "planning";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});

      const totalBudget = (projects ?? []).reduce((s, p) => s + Number(p.budget ?? 0), 0);
      const totalSponsorshipTarget = (projects ?? []).reduce(
        (s, p) => s + Number(p.sponsorship_target_amount ?? 0),
        0,
      );

      // Project-end pipeline: ending in next 60 days
      const horizon = Date.now() + 60 * 86400_000;
      const endingSoon = (projects ?? []).filter(
        (p) => p.end_date && new Date(p.end_date).getTime() <= horizon && new Date(p.end_date).getTime() >= Date.now(),
      ).length;

      return {
        totalPrograms: programmeRows.length,
        totalProjects: (projects ?? []).length,
        activePrograms: programmeRows.filter((p) => (p.status || "").toLowerCase() === "active").length,
        endingSoon,
        totalBudget,
        totalSponsorshipTarget,
        programmeRows,
        projectStatusMix,
      };
    },
  });
}

/* ------------------------------------------------------------------ */
/* Funding intelligence                                                */
/* ------------------------------------------------------------------ */

export function useFundingIntelligence(filters: AnalyticsFilters) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const fromIso = toIso(filters.dateRange?.from);
  const toIsoStr = toIso(filters.dateRange?.to);

  return useQuery({
    queryKey: ["analytics-funding", orgId, fromIso, toIsoStr, filters.programId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      // Program-level donations
      let progDonQ = supabase
        .from("program_donors")
        .select("contribution_amount, contribution_date, donor_name, program_id")
        .eq("organization_id", orgId!);
      if (filters.programId !== "all") progDonQ = progDonQ.eq("program_id", filters.programId);
      if (fromIso) progDonQ = progDonQ.gte("contribution_date", fromIso);
      if (toIsoStr) progDonQ = progDonQ.lte("contribution_date", toIsoStr);
      const { data: progDonors = [] } = await progDonQ;

      // Beneficiary sponsorships
      let benDonQ = supabase
        .from("beneficiary_donors")
        .select("amount_received, donation_date, donor_name, program_id")
        .eq("organization_id", orgId!);
      if (filters.programId !== "all") benDonQ = benDonQ.eq("program_id", filters.programId);
      if (fromIso) benDonQ = benDonQ.gte("donation_date", fromIso);
      if (toIsoStr) benDonQ = benDonQ.lte("donation_date", toIsoStr);
      const { data: benDonors = [] } = await benDonQ;

      // Grants
      const { data: grants = [] } = await supabase
        .from("grants")
        .select("grant_amount, amount_received, status, end_date, application_deadline, donor_name, currency")
        .eq("organization_id", orgId!);

      // Expenses (within range)
      let expQ = supabase
        .from("expenses")
        .select("amount, expense_date, program_id, currency")
        .eq("organization_id", orgId!);
      if (filters.programId !== "all") expQ = expQ.eq("program_id", filters.programId);
      if (fromIso) expQ = expQ.gte("expense_date", fromIso);
      if (toIsoStr) expQ = expQ.lte("expense_date", toIsoStr);
      const { data: expenses = [] } = await expQ;

      const programContribTotal = (progDonors ?? []).reduce(
        (s, x) => s + Number(x.contribution_amount ?? 0),
        0,
      );
      const sponsorshipTotal = (benDonors ?? []).reduce(
        (s, x) => s + Number(x.amount_received ?? 0),
        0,
      );
      const grantsReceived = (grants ?? []).reduce((s, x) => s + Number(x.amount_received ?? 0), 0);
      const grantsAwarded = (grants ?? []).reduce((s, x) => s + Number(x.grant_amount ?? 0), 0);
      const totalIncome = programContribTotal + sponsorshipTotal + grantsReceived;
      const totalExpenses = (expenses ?? []).reduce((s, x) => s + Number(x.amount ?? 0), 0);
      const burnRate = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

      // Donor mix (top 6 by total contribution)
      const donorTotals: Record<string, number> = {};
      (progDonors ?? []).forEach((d) => {
        const name = d.donor_name ?? "Unknown";
        donorTotals[name] = (donorTotals[name] ?? 0) + Number(d.contribution_amount ?? 0);
      });
      (benDonors ?? []).forEach((d) => {
        const name = d.donor_name ?? "Unknown";
        donorTotals[name] = (donorTotals[name] ?? 0) + Number(d.amount_received ?? 0);
      });
      const topDonors = Object.entries(donorTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, total]) => ({ name, total }));

      // Income trend by month
      const monthly: Record<string, { income: number; expense: number }> = {};
      const ensure = (k: string) => (monthly[k] ||= { income: 0, expense: 0 });
      const monthKey = (iso: string | null) => {
        if (!iso) return null;
        const d = new Date(iso);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      };
      (progDonors ?? []).forEach((d) => {
        const k = monthKey(d.contribution_date);
        if (k) ensure(k).income += Number(d.contribution_amount ?? 0);
      });
      (benDonors ?? []).forEach((d) => {
        const k = monthKey(d.donation_date);
        if (k) ensure(k).income += Number(d.amount_received ?? 0);
      });
      (expenses ?? []).forEach((e) => {
        const k = monthKey(e.expense_date);
        if (k) ensure(k).expense += Number(e.amount ?? 0);
      });
      const cashflowTrend = Object.entries(monthly)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, v]) => ({ month, income: v.income, expense: v.expense }));

      // Grants ending soon (<=60 days)
      const horizon = Date.now() + 60 * 86400_000;
      const grantsExpiring = (grants ?? []).filter(
        (g) => g.end_date && new Date(g.end_date).getTime() >= Date.now() && new Date(g.end_date).getTime() <= horizon,
      ).length;

      const distinctDonors = Object.keys(donorTotals).length;
      const sponsorshipCoveragePct = grantsAwarded > 0 ? (grantsReceived / grantsAwarded) * 100 : 0;

      return {
        programContribTotal,
        sponsorshipTotal,
        grantsReceived,
        grantsAwarded,
        totalIncome,
        totalExpenses,
        burnRate,
        distinctDonors,
        grantsExpiring,
        sponsorshipCoveragePct,
        topDonors,
        cashflowTrend,
      };
    },
  });
}

/* ------------------------------------------------------------------ */
/* Visitation intelligence                                             */
/* ------------------------------------------------------------------ */

export function useVisitationIntelligence(filters: AnalyticsFilters) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const fromIso = toIso(filters.dateRange?.from);
  const toIsoStr = toIso(filters.dateRange?.to);

  return useQuery({
    queryKey: [
      "analytics-visitation",
      orgId,
      fromIso,
      toIsoStr,
      filters.county,
      filters.programId,
      filters.gender,
      filters.ageBucket,
    ],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      // Pull beneficiaries for filter scoping (county, gender, age, program)
      let benQ = supabase
        .from("beneficiaries")
        .select("id, county, gender, date_of_birth, status")
        .eq("organization_id", orgId!)
        .is("deleted_at", null);
      if (filters.county !== "all") benQ = benQ.eq("county", filters.county);
      if (filters.gender !== "all") benQ = benQ.eq("gender", filters.gender as any);
      const { data: benRows = [] } = await benQ;
      const ben = (benRows ?? []).filter((b) => withinAge(b.date_of_birth, filters.ageBucket));

      let programScopedIds: Set<string> | null = null;
      if (filters.programId !== "all") {
        const { data: svc = [] } = await supabase
          .from("beneficiary_services")
          .select("beneficiary_id")
          .eq("organization_id", orgId!)
          .eq("program_id", filters.programId);
        programScopedIds = new Set((svc ?? []).map((s) => s.beneficiary_id));
      }

      const allowedIds = new Set(
        ben
          .filter((b) => !programScopedIds || programScopedIds.has(b.id))
          .map((b) => b.id),
      );

      // Visitations within window
      let visQ = supabase
        .from("beneficiary_visitations")
        .select(
          "id, beneficiary_id, visit_date, visit_type, follow_up_required, follow_up_date, staff_name, location",
        )
        .eq("organization_id", orgId!);
      if (fromIso) visQ = visQ.gte("visit_date", fromIso);
      if (toIsoStr) visQ = visQ.lte("visit_date", toIsoStr);
      const { data: visits = [] } = await visQ;

      const scoped = (visits ?? []).filter((v) => allowedIds.size === 0 ? true : allowedIds.has(v.beneficiary_id));

      // KPIs
      const totalVisits = scoped.length;
      const uniqueBeneficiariesVisited = new Set(scoped.map((v) => v.beneficiary_id)).size;
      const followUpsRequired = scoped.filter((v) => v.follow_up_required).length;
      const followUpsOverdue = scoped.filter(
        (v) => v.follow_up_required && v.follow_up_date && new Date(v.follow_up_date).getTime() < Date.now(),
      ).length;

      // Beneficiaries with no visit in window (gap)
      const visitedSet = new Set(scoped.map((v) => v.beneficiary_id));
      const neverVisited = ben.filter(
        (b) => (!programScopedIds || programScopedIds.has(b.id)) && !visitedSet.has(b.id) && (b.status || "").toLowerCase() === "active",
      ).length;

      const coveragePct =
        ben.length > 0
          ? (uniqueBeneficiariesVisited /
              ben.filter((b) => !programScopedIds || programScopedIds.has(b.id)).length) *
            100
          : 0;

      // Type mix
      const typeMix = scoped.reduce<Record<string, number>>((acc, v) => {
        const k = v.visit_type ?? "unspecified";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});

      // Monthly trend
      const monthly: Record<string, number> = {};
      scoped.forEach((v) => {
        const d = new Date(v.visit_date);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthly[k] = (monthly[k] ?? 0) + 1;
      });
      const visitTrend = Object.entries(monthly)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, count]) => ({ month, count }));

      // Top staff by visit count
      const staffMap: Record<string, number> = {};
      scoped.forEach((v) => {
        const k = v.staff_name ?? "Unassigned";
        staffMap[k] = (staffMap[k] ?? 0) + 1;
      });
      const topStaff = Object.entries(staffMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, count]) => ({ name, count }));

      // Upcoming follow-ups (next 14 days)
      const horizon = Date.now() + 14 * 86400_000;
      const upcomingFollowUps = scoped
        .filter(
          (v) =>
            v.follow_up_required &&
            v.follow_up_date &&
            new Date(v.follow_up_date).getTime() >= Date.now() &&
            new Date(v.follow_up_date).getTime() <= horizon,
        )
        .sort(
          (a, b) =>
            new Date(a.follow_up_date!).getTime() - new Date(b.follow_up_date!).getTime(),
        )
        .slice(0, 8);

      return {
        totalVisits,
        uniqueBeneficiariesVisited,
        followUpsRequired,
        followUpsOverdue,
        neverVisited,
        coveragePct,
        typeMix,
        visitTrend,
        topStaff,
        upcomingFollowUps,
      };
    },
  });
}

/* ------------------------------------------------------------------ */
/* Risk intelligence                                                   */
/* ------------------------------------------------------------------ */

export function useRiskIntelligence(filters: AnalyticsFilters) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: [
      "analytics-risk",
      orgId,
      filters.county,
      filters.programId,
      filters.gender,
      filters.ageBucket,
    ],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      // Beneficiary scoping
      let benQ = supabase
        .from("beneficiaries")
        .select("id, display_name, county, gender, date_of_birth, status, vulnerability_level")
        .eq("organization_id", orgId!)
        .is("deleted_at", null);
      if (filters.county !== "all") benQ = benQ.eq("county", filters.county);
      if (filters.gender !== "all") benQ = benQ.eq("gender", filters.gender as any);
      const { data: benRows = [] } = await benQ;
      const ben = (benRows ?? []).filter((b) => withinAge(b.date_of_birth, filters.ageBucket));

      let programScopedIds: Set<string> | null = null;
      if (filters.programId !== "all") {
        const { data: svc = [] } = await supabase
          .from("beneficiary_services")
          .select("beneficiary_id")
          .eq("organization_id", orgId!)
          .eq("program_id", filters.programId);
        programScopedIds = new Set((svc ?? []).map((s) => s.beneficiary_id));
      }
      const scopedBen = ben.filter((b) => !programScopedIds || programScopedIds.has(b.id));
      const scopedIds = new Set(scopedBen.map((b) => b.id));

      // Risk scores - latest per beneficiary
      const { data: scoreRows = [] } = await supabase
        .from("beneficiary_risk_scores")
        .select(
          "beneficiary_id, assessment_date, dropout_risk_score, engagement_score, academic_trend_score, followup_compliance_score, vulnerability_index, overall_risk_level, risk_flags",
        )
        .eq("organization_id", orgId!)
        .order("assessment_date", { ascending: false });

      const latestByBen = new Map<string, (typeof scoreRows)[number]>();
      (scoreRows ?? []).forEach((row) => {
        if (!latestByBen.has(row.beneficiary_id)) latestByBen.set(row.beneficiary_id, row);
      });
      const scoped = Array.from(latestByBen.values()).filter((r) =>
        scopedIds.size === 0 ? true : scopedIds.has(r.beneficiary_id),
      );

      // KPIs
      const assessed = scoped.length;
      const unassessed = Math.max(scopedBen.length - assessed, 0);
      const high = scoped.filter((r) => r.overall_risk_level === "high" || r.overall_risk_level === "critical").length;
      const medium = scoped.filter((r) => r.overall_risk_level === "medium").length;
      const low = scoped.filter((r) => r.overall_risk_level === "low").length;

      const avg = (key: keyof typeof scoped[number]) => {
        const vals = scoped
          .map((r) => Number(r[key] ?? 0))
          .filter((n) => !Number.isNaN(n));
        if (!vals.length) return 0;
        return vals.reduce((s, v) => s + v, 0) / vals.length;
      };

      const avgDropout = avg("dropout_risk_score");
      const avgEngagement = avg("engagement_score");
      const avgAcademic = avg("academic_trend_score");
      const avgFollowup = avg("followup_compliance_score");
      const avgVulnerability = avg("vulnerability_index");

      // Vulnerability tier mix from beneficiaries (separate from risk score)
      const vulnerabilityMix = scopedBen.reduce<Record<string, number>>((acc, b) => {
        const k = b.vulnerability_level ?? "unassessed";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});

      // Top at-risk beneficiaries (highest dropout score)
      const benIndex = new Map(scopedBen.map((b) => [b.id, b]));
      const topAtRisk = scoped
        .filter((r) => benIndex.has(r.beneficiary_id))
        .sort((a, b) => Number(b.dropout_risk_score ?? 0) - Number(a.dropout_risk_score ?? 0))
        .slice(0, 8)
        .map((r) => {
          const b = benIndex.get(r.beneficiary_id)!;
          return {
            id: r.beneficiary_id,
            name: b.display_name,
            county: b.county ?? "—",
            level: r.overall_risk_level ?? "unknown",
            dropout: Number(r.dropout_risk_score ?? 0),
            engagement: Number(r.engagement_score ?? 0),
          };
        });

      // Risk-level radar data
      const radarMetrics = [
        { metric: "Dropout", value: Math.round(avgDropout) },
        { metric: "Engagement", value: Math.round(avgEngagement) },
        { metric: "Academic", value: Math.round(avgAcademic) },
        { metric: "Follow-up", value: Math.round(avgFollowup) },
        { metric: "Vulnerability", value: Math.round(avgVulnerability) },
      ];

      const coveragePct = scopedBen.length > 0 ? (assessed / scopedBen.length) * 100 : 0;

      return {
        assessed,
        unassessed,
        coveragePct,
        high,
        medium,
        low,
        avgDropout,
        avgEngagement,
        avgAcademic,
        avgFollowup,
        avgVulnerability,
        vulnerabilityMix,
        topAtRisk,
        radarMetrics,
      };
    },
  });
}
/* ------------------------------------------------------------------ */
/* Demographics deep-dive                                              */
/* ------------------------------------------------------------------ */

export function useDemographicsIntelligence(filters: AnalyticsFilters) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: [
      "analytics-demographics",
      orgId,
      filters.county,
      filters.programId,
      filters.gender,
      filters.ageBucket,
    ],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      let benQ = supabase
        .from("beneficiaries")
        .select(
          "id, gender, date_of_birth, county, sub_county, beneficiary_type, disability_status, has_special_needs, religion, marital_status, household_size, income_level",
        )
        .eq("organization_id", orgId!)
        .is("deleted_at", null);
      if (filters.county !== "all") benQ = benQ.eq("county", filters.county);
      if (filters.gender !== "all") benQ = benQ.eq("gender", filters.gender as any);
      const { data: rows = [] } = await benQ;
      let ben = (rows ?? []).filter((b) => withinAge(b.date_of_birth, filters.ageBucket));

      if (filters.programId !== "all") {
        const { data: svc = [] } = await supabase
          .from("beneficiary_services")
          .select("beneficiary_id")
          .eq("organization_id", orgId!)
          .eq("program_id", filters.programId);
        const ids = new Set((svc ?? []).map((s) => s.beneficiary_id));
        ben = ben.filter((b) => ids.has(b.id));
      }

      // Age bucket distribution
      const buckets = { "0-5": 0, "6-12": 0, "13-17": 0, "18-35": 0, "36-60": 0, "60+": 0, unknown: 0 };
      ben.forEach((b) => {
        if (!b.date_of_birth) return (buckets.unknown += 1);
        const age = Math.floor((Date.now() - new Date(b.date_of_birth).getTime()) / (365.25 * 86400_000));
        if (age <= 5) buckets["0-5"] += 1;
        else if (age <= 12) buckets["6-12"] += 1;
        else if (age <= 17) buckets["13-17"] += 1;
        else if (age <= 35) buckets["18-35"] += 1;
        else if (age <= 60) buckets["36-60"] += 1;
        else buckets["60+"] += 1;
      });
      const ageDistribution = Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));

      // Gender × age cross-tab
      const crossKey = (b: any) => {
        if (!b.date_of_birth) return "unknown";
        const age = Math.floor((Date.now() - new Date(b.date_of_birth).getTime()) / (365.25 * 86400_000));
        if (age <= 5) return "0-5";
        if (age <= 12) return "6-12";
        if (age <= 17) return "13-17";
        if (age <= 35) return "18-35";
        if (age <= 60) return "36-60";
        return "60+";
      };
      const cross: Record<string, { bucket: string; male: number; female: number; other: number }> = {};
      ben.forEach((b) => {
        const k = crossKey(b);
        cross[k] ||= { bucket: k, male: 0, female: 0, other: 0 };
        const g = (b.gender ?? "other").toString().toLowerCase();
        if (g === "male") cross[k].male += 1;
        else if (g === "female") cross[k].female += 1;
        else cross[k].other += 1;
      });
      const order = ["0-5", "6-12", "13-17", "18-35", "36-60", "60+", "unknown"];
      const ageGenderCross = order.filter((k) => cross[k]).map((k) => cross[k]);

      // Sub-county top 8
      const subCountyTop = Object.entries(
        ben.reduce<Record<string, number>>((acc, b) => {
          const k = b.sub_county ?? "Unknown";
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));

      // Disability + special needs
      const disabilityCount = ben.filter((b) => b.disability_status && b.disability_status !== "none").length;
      const specialNeedsCount = ben.filter((b) => b.has_special_needs).length;

      // Religion mix
      const religionMix = Object.entries(
        ben.reduce<Record<string, number>>((acc, b) => {
          const k = b.religion ?? "Unspecified";
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      // Income level distribution
      const incomeMix = Object.entries(
        ben.reduce<Record<string, number>>((acc, b) => {
          const k = b.income_level ?? "Unspecified";
          acc[k] = (acc[k] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([name, value]) => ({ name, value }));

      // Household size: average + distribution buckets
      const sizes = ben.map((b) => Number(b.household_size ?? 0)).filter((n) => n > 0);
      const avgHouseholdSize = sizes.length ? sizes.reduce((s, v) => s + v, 0) / sizes.length : 0;
      const householdBuckets = { "1-2": 0, "3-4": 0, "5-6": 0, "7+": 0 };
      sizes.forEach((n) => {
        if (n <= 2) householdBuckets["1-2"] += 1;
        else if (n <= 4) householdBuckets["3-4"] += 1;
        else if (n <= 6) householdBuckets["5-6"] += 1;
        else householdBuckets["7+"] += 1;
      });
      const householdDistribution = Object.entries(householdBuckets).map(([bucket, count]) => ({ bucket, count }));

      return {
        total: ben.length,
        ageDistribution,
        ageGenderCross,
        subCountyTop,
        disabilityCount,
        specialNeedsCount,
        religionMix,
        incomeMix,
        avgHouseholdSize,
        householdDistribution,
      };
    },
  });
}

/* ------------------------------------------------------------------ */
/* Forecasting intelligence                                            */
/* ------------------------------------------------------------------ */

export function useForecastIntelligence(filters: AnalyticsFilters) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ["analytics-forecast", orgId, filters.programId],
    enabled: !!orgId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // Last 12 months window
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth() - 11, 1);
      const startIso = start.toISOString();

      // Beneficiary growth (created_at)
      let benQ = supabase
        .from("beneficiaries")
        .select("created_at")
        .eq("organization_id", orgId!)
        .is("deleted_at", null)
        .gte("created_at", startIso);
      const { data: ben = [] } = await benQ;

      // Income (program donors + beneficiary donors)
      let progDonQ = supabase
        .from("program_donors")
        .select("contribution_amount, contribution_date, program_id")
        .eq("organization_id", orgId!)
        .gte("contribution_date", startIso);
      if (filters.programId !== "all") progDonQ = progDonQ.eq("program_id", filters.programId);
      const { data: progDonors = [] } = await progDonQ;

      let benDonQ = supabase
        .from("beneficiary_donors")
        .select("amount_received, donation_date, program_id")
        .eq("organization_id", orgId!)
        .gte("donation_date", startIso);
      if (filters.programId !== "all") benDonQ = benDonQ.eq("program_id", filters.programId);
      const { data: benDonors = [] } = await benDonQ;

      // Expenses
      let expQ = supabase
        .from("expenses")
        .select("amount, expense_date, program_id")
        .eq("organization_id", orgId!)
        .gte("expense_date", startIso);
      if (filters.programId !== "all") expQ = expQ.eq("program_id", filters.programId);
      const { data: expenses = [] } = await expQ;

      // Build month buckets (last 12)
      const months: string[] = [];
      const labels: string[] = [];
      const cursor = new Date(start);
      while (cursor <= end) {
        const k = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
        months.push(k);
        labels.push(cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }));
        cursor.setMonth(cursor.getMonth() + 1);
      }
      const monthIdx = (iso: string | null) => {
        if (!iso) return -1;
        const d = new Date(iso);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return months.indexOf(k);
      };

      const benSeries = new Array(months.length).fill(0) as number[];
      ben.forEach((b: any) => {
        const i = monthIdx(b.created_at);
        if (i >= 0) benSeries[i] += 1;
      });

      const incomeSeries = new Array(months.length).fill(0) as number[];
      progDonors.forEach((d: any) => {
        const i = monthIdx(d.contribution_date);
        if (i >= 0) incomeSeries[i] += Number(d.contribution_amount ?? 0);
      });
      benDonors.forEach((d: any) => {
        const i = monthIdx(d.donation_date);
        if (i >= 0) incomeSeries[i] += Number(d.amount_received ?? 0);
      });

      const expenseSeries = new Array(months.length).fill(0) as number[];
      expenses.forEach((e: any) => {
        const i = monthIdx(e.expense_date);
        if (i >= 0) expenseSeries[i] += Number(e.amount ?? 0);
      });

      const PROJECT = 6;
      const benForecast = forecastLinear(benSeries, PROJECT);
      const incomeForecast = forecastLinear(incomeSeries, PROJECT);
      const expenseForecast = forecastLinear(expenseSeries, PROJECT);

      const futureLabels: string[] = [];
      const f = new Date(end.getFullYear(), end.getMonth() + 1, 1);
      for (let i = 0; i < PROJECT; i++) {
        futureLabels.push(f.toLocaleDateString("en-US", { month: "short", year: "2-digit" }));
        f.setMonth(f.getMonth() + 1);
      }

      const buildSeries = (
        actuals: number[],
        forecast: number[],
      ) => {
        const out: { label: string; actual: number | null; forecast: number | null }[] = [];
        actuals.forEach((v, i) => {
          out.push({ label: labels[i], actual: v, forecast: i === actuals.length - 1 ? v : null });
        });
        forecast.forEach((v, i) => {
          out.push({ label: futureLabels[i], actual: null, forecast: v });
        });
        return out;
      };

      return {
        beneficiaryGrowthSeries: buildSeries(benSeries, benForecast),
        incomeSeries: buildSeries(incomeSeries, incomeForecast),
        expenseSeries: buildSeries(expenseSeries, expenseForecast),
        beneficiaryAvgGrowth: averageGrowthRate(benSeries),
        incomeAvgGrowth: averageGrowthRate(incomeSeries),
        expenseAvgGrowth: averageGrowthRate(expenseSeries),
        projectedBeneficiaries6Mo: benForecast.reduce((s, v) => s + v, 0),
        projectedIncome6Mo: incomeForecast.reduce((s, v) => s + v, 0),
        projectedExpense6Mo: expenseForecast.reduce((s, v) => s + v, 0),
      };
    },
  });
}

/* ------------------------------------------------------------------ */
/* Data quality intelligence                                           */
/* ------------------------------------------------------------------ */

export function useDataQualityIntelligence(filters: AnalyticsFilters) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ["analytics-quality", orgId, filters.programId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: ben = [] } = await supabase
        .from("beneficiaries")
        .select(
          "id, display_name, date_of_birth, gender, county, photo_url, consent_given, status, beneficiary_type",
        )
        .eq("organization_id", orgId!)
        .is("deleted_at", null);

      const total = ben.length;
      const checks = [
        { key: "Date of Birth", missing: ben.filter((b) => !b.date_of_birth).length },
        { key: "Gender", missing: ben.filter((b) => !b.gender).length },
        { key: "County", missing: ben.filter((b) => !b.county).length },
        { key: "Photo", missing: ben.filter((b) => !b.photo_url).length },
        { key: "Consent", missing: ben.filter((b) => !b.consent_given).length },
      ];
      const completenessByField = checks.map((c) => ({
        field: c.key,
        missing: c.missing,
        complete: total - c.missing,
        completePct: total > 0 ? ((total - c.missing) / total) * 100 : 0,
      }));
      const overallCompleteness =
        total > 0
          ? completenessByField.reduce((s, c) => s + c.completePct, 0) / completenessByField.length
          : 0;

      // Duplicate display_name detection
      const nameMap: Record<string, string[]> = {};
      ben.forEach((b) => {
        const k = (b.display_name ?? "").trim().toLowerCase();
        if (!k) return;
        nameMap[k] ||= [];
        nameMap[k].push(b.id);
      });
      const duplicateGroups = Object.entries(nameMap).filter(([, ids]) => ids.length > 1);
      const duplicateCount = duplicateGroups.reduce((s, [, ids]) => s + ids.length, 0);

      // Orphans: beneficiaries with no enrolment
      const { data: services = [] } = await supabase
        .from("beneficiary_services")
        .select("beneficiary_id")
        .eq("organization_id", orgId!);
      const enrolled = new Set((services ?? []).map((s) => s.beneficiary_id));
      const orphanBeneficiaries = ben.filter((b) => !enrolled.has(b.id) && (b.status || "").toLowerCase() === "active").length;

      // Stale records: active but no update in >180 days — cheap proxy via separate fetch
      const { data: stale = [] } = await supabase
        .from("beneficiaries")
        .select("id, updated_at")
        .eq("organization_id", orgId!)
        .is("deleted_at", null)
        .eq("status", "active")
        .lt("updated_at", new Date(Date.now() - 180 * 86400_000).toISOString())
        .limit(500);
      const staleCount = (stale ?? []).length;

      // Activities & visitations missing details
      const { data: acts = [] } = await (supabase as any)
        .from("activities")
        .select("id, notes, status, completed_at")
        .eq("organization_id", orgId!);
      const activitiesMissingOutcome = ((acts as any[]) ?? []).filter(
        (a: any) => (a.status || "").toLowerCase() === "completed" && !a.notes,
      ).length;

      const { data: visits = [] } = await supabase
        .from("beneficiary_visitations")
        .select("id, observation_findings, follow_up_required, follow_up_date")
        .eq("organization_id", orgId!);
      const visitsMissingFindings = (visits ?? []).filter((v) => !v.observation_findings).length;
      const visitsMissingFollowupDate = (visits ?? []).filter(
        (v) => v.follow_up_required && !v.follow_up_date,
      ).length;

      return {
        total,
        overallCompleteness,
        completenessByField,
        duplicateGroupsCount: duplicateGroups.length,
        duplicateCount,
        orphanBeneficiaries,
        staleCount,
        activitiesMissingOutcome,
        visitsMissingFindings,
        visitsMissingFollowupDate,
      };
    },
  });
}
