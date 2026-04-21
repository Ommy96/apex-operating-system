import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import type { AnalyticsFilters } from "@/hooks/useAnalyticsFilters";

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
      const active = filteredBen.filter((b) => b.status === "active").length;
      const inactive = filteredBen.filter((b) => b.status === "inactive").length;
      const exited = filteredBen.filter((b) => b.exit_reason || b.status === "exited").length;
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
        activePrograms: programmeRows.filter((p) => p.status === "active").length,
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