import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { startOfMonth, subYears, subDays, parseISO, isAfter, isBefore } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import type { AnalyticsFilters } from "@/hooks/useAnalyticsFilters";

interface OverviewKpis {
  totalBeneficiaries: number;
  totalBeneficiariesYoYDelta: number;
  sponsoredCount: number;
  programmeFundedCount: number;
  unsponsoredCount: number;
  unsponsoredCoveragePct: number;
  totalDonors: number;
  countiesCovered: number;
  reachThisMonth: number;
}

interface MonthlyGrowthPoint {
  label: string;
  value: number;
}

interface ProgrammeBeneficiaryCount {
  name: string;
  count: number;
}

interface FundingSlice {
  name: string;
  value: number;
}

interface OverviewAlerts {
  beneficiariesNotVisited90d: number;
  grantsDueSoon: number;
  unsponsoredCount: number;
}

export interface OverviewMetrics {
  kpis: OverviewKpis;
  growth: MonthlyGrowthPoint[];
  topProgrammes: ProgrammeBeneficiaryCount[];
  fundingByProgramme: FundingSlice[];
  alerts: OverviewAlerts;
  lastUpdated: Date;
}

const MONTH_LABEL = (d: Date) =>
  d.toLocaleDateString("en-KE", { month: "short", year: "2-digit" });

/**
 * Aggregates the headline numbers shown on the Overview tab.
 *
 * Returns KPIs, monthly growth (last 12 months), top 5 programmes by
 * enrolment, programme funding mix, and three high-priority alerts.
 */
export function useOverviewMetrics(filters: AnalyticsFilters) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const { data, isLoading } = useQuery({
    queryKey: [
      "overview-metrics",
      orgId,
      filters.dateRange?.from?.toISOString() ?? "",
      filters.dateRange?.to?.toISOString() ?? "",
      filters.county,
      filters.programId,
      filters.gender,
      filters.ageBucket,
    ],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<OverviewMetrics> => {
      if (!orgId) {
        return emptyMetrics();
      }

      const [
        beneficiariesRes,
        servicesRes,
        donorAccountsRes,
        programmesRes,
        visitationsRes,
        grantsRes,
        programDonorsRes,
      ] = await Promise.all([
        supabase
          .from("beneficiaries")
          .select(
            "id, county, gender, date_of_birth, created_at, status, deleted_at"
          )
          .eq("organization_id", orgId)
          .is("deleted_at", null),
        supabase
          .from("beneficiary_services")
          .select(
            "id, beneficiary_id, program_id, sponsor_donor_id, sponsor_name, sponsorship_status, created_at, enrolled_date, status"
          )
          .eq("organization_id", orgId),
        supabase
          .from("donor_accounts")
          .select("id, is_active")
          .eq("organization_id", orgId),
        supabase
          .from("programs")
          .select("id, name, is_active")
          .eq("organization_id", orgId),
        supabase
          .from("beneficiary_visitations")
          .select("beneficiary_id, visit_date")
          .eq("organization_id", orgId),
        supabase
          .from("grants")
          .select("id, grant_name, grant_amount, end_date, status, donor_name")
          .eq("organization_id", orgId),
        supabase
          .from("program_donors")
          .select("id, program_id, contribution_amount")
          .eq("organization_id", orgId),
      ]);

      const beneficiaries = beneficiariesRes.data ?? [];
      const services = servicesRes.data ?? [];
      const donorAccounts = donorAccountsRes.data ?? [];
      const programmes = programmesRes.data ?? [];
      const visitations = visitationsRes.data ?? [];
      const grants = grantsRes.data ?? [];
      const programDonors = programDonorsRes.data ?? [];

      // Apply filters (in-memory; volumes are bounded by org scope)
      const filtered = beneficiaries.filter((b) => {
        if (filters.county !== "all" && b.county !== filters.county) return false;
        if (filters.gender !== "all" && b.gender !== filters.gender) return false;
        if (filters.ageBucket !== "all" && b.date_of_birth) {
          const age = ageInYears(b.date_of_birth);
          if (!matchesAgeBucket(age, filters.ageBucket)) return false;
        }
        return true;
      });

      const filteredIds = new Set(filtered.map((b) => b.id));

      // Filter services by programme filter and beneficiary set
      const filteredServices = services.filter((s) => {
        if (!filteredIds.has(s.beneficiary_id)) return false;
        if (filters.programId !== "all" && s.program_id !== filters.programId)
          return false;
        return true;
      });

      // Sponsorship breakdown
      const sponsoredBeneficiaryIds = new Set(
        filteredServices
          .filter((s) => !!s.sponsor_donor_id || !!s.sponsor_name)
          .map((s) => s.beneficiary_id)
      );
      const programmeFundedIds = new Set(
        filteredServices
          .filter((s) => !s.sponsor_donor_id && !s.sponsor_name && !!s.program_id)
          .map((s) => s.beneficiary_id)
      );
      const enrolledIds = new Set(filteredServices.map((s) => s.beneficiary_id));
      const unsponsoredCount = Math.max(0, enrolledIds.size - sponsoredBeneficiaryIds.size);
      const coveragePct = enrolledIds.size > 0
        ? Math.round((sponsoredBeneficiaryIds.size / enrolledIds.size) * 100)
        : 0;

      // YoY delta on total beneficiaries (compare cumulative count today vs 1 year ago)
      const oneYearAgo = subYears(new Date(), 1);
      const lastYearCount = filtered.filter(
        (b) => b.created_at && isBefore(parseISO(b.created_at), oneYearAgo)
      ).length;
      const todayCount = filtered.length;
      const yoyDelta =
        lastYearCount > 0
          ? Math.round(((todayCount - lastYearCount) / lastYearCount) * 1000) / 10
          : 0;

      // Counties covered
      const counties = new Set(
        filtered.map((b) => b.county).filter((c): c is string => !!c)
      );

      // Reach this month: new enrolments in the current calendar month
      const monthStart = startOfMonth(new Date());
      const reachThisMonth = filteredServices.filter((s) => {
        const d = s.enrolled_date || s.created_at;
        return d && isAfter(parseISO(d), monthStart);
      }).length;

      // Growth: last 12 months of new beneficiary registrations
      const monthBuckets = new Map<string, number>();
      for (let i = 11; i >= 0; i--) {
        const dt = new Date();
        dt.setMonth(dt.getMonth() - i);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        monthBuckets.set(key, 0);
      }
      filtered.forEach((b) => {
        if (!b.created_at) return;
        const d = parseISO(b.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (monthBuckets.has(key)) {
          monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + 1);
        }
      });
      const growth: MonthlyGrowthPoint[] = Array.from(monthBuckets.entries()).map(
        ([key, value]) => {
          const [y, m] = key.split("-");
          const date = new Date(parseInt(y), parseInt(m) - 1, 1);
          return { label: MONTH_LABEL(date), value };
        }
      );

      // Top programmes by beneficiary count (distinct beneficiaries per programme)
      const programmeNameById = new Map(programmes.map((p) => [p.id, p.name]));
      const beneficiariesPerProgramme = new Map<string, Set<string>>();
      filteredServices.forEach((s) => {
        if (!s.program_id) return;
        if (!beneficiariesPerProgramme.has(s.program_id)) {
          beneficiariesPerProgramme.set(s.program_id, new Set());
        }
        beneficiariesPerProgramme.get(s.program_id)!.add(s.beneficiary_id);
      });
      const topProgrammes: ProgrammeBeneficiaryCount[] = Array.from(
        beneficiariesPerProgramme.entries()
      )
        .map(([id, set]) => ({
          name: programmeNameById.get(id) ?? "Unknown programme",
          count: set.size,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Funding mix by programme: sum contribution_amount from program_donors
      // grouped by programme name. Falls back to "Unassigned programme".
      const fundingByProgrammeMap = new Map<string, number>();
      programDonors.forEach((pd) => {
        const key = pd.program_id
          ? programmeNameById.get(pd.program_id) ?? "Unassigned programme"
          : "Unassigned programme";
        fundingByProgrammeMap.set(
          key,
          (fundingByProgrammeMap.get(key) ?? 0) + (Number(pd.contribution_amount) || 0)
        );
      });
      const fundingByProgramme: FundingSlice[] = Array.from(
        fundingByProgrammeMap.entries()
      )
        .map(([name, value]) => ({ name, value }))
        .filter((s) => s.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      // Alerts
      const cutoff90 = subDays(new Date(), 90);
      const lastVisitByBeneficiary = new Map<string, Date>();
      visitations.forEach((v) => {
        if (!v.visit_date || !v.beneficiary_id) return;
        const dt = parseISO(v.visit_date);
        const prev = lastVisitByBeneficiary.get(v.beneficiary_id);
        if (!prev || isAfter(dt, prev)) {
          lastVisitByBeneficiary.set(v.beneficiary_id, dt);
        }
      });
      const beneficiariesNotVisited90d = filtered.filter((b) => {
        const last = lastVisitByBeneficiary.get(b.id);
        return !last || isBefore(last, cutoff90);
      }).length;

      const sevenDaysOut = new Date();
      sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);
      const grantsDueSoon = grants.filter((g) => {
        if (!g.end_date) return false;
        const end = parseISO(g.end_date);
        return isAfter(end, new Date()) && isBefore(end, sevenDaysOut);
      }).length;

      return {
        kpis: {
          totalBeneficiaries: todayCount,
          totalBeneficiariesYoYDelta: yoyDelta,
          sponsoredCount: sponsoredBeneficiaryIds.size,
          programmeFundedCount: programmeFundedIds.size,
          unsponsoredCount,
          unsponsoredCoveragePct: coveragePct,
          totalDonors: donorAccounts.length,
          countiesCovered: counties.size,
          reachThisMonth,
        },
        growth,
        topProgrammes,
        fundingByProgramme,
        alerts: {
          beneficiariesNotVisited90d,
          grantsDueSoon,
          unsponsoredCount,
        },
        lastUpdated: new Date(),
      };
    },
  });

  const safe = useMemo(() => data ?? emptyMetrics(), [data]);
  return { metrics: safe, isLoading };
}

function emptyMetrics(): OverviewMetrics {
  return {
    kpis: {
      totalBeneficiaries: 0,
      totalBeneficiariesYoYDelta: 0,
      sponsoredCount: 0,
      programmeFundedCount: 0,
      unsponsoredCount: 0,
      unsponsoredCoveragePct: 0,
      totalDonors: 0,
      countiesCovered: 0,
      reachThisMonth: 0,
    },
    growth: [],
    topProgrammes: [],
    fundingByProgramme: [],
    alerts: {
      beneficiariesNotVisited90d: 0,
      grantsDueSoon: 0,
      unsponsoredCount: 0,
    },
    lastUpdated: new Date(),
  };
}

function ageInYears(dob: string): number {
  const birth = parseISO(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function matchesAgeBucket(age: number, bucket: string): boolean {
  switch (bucket) {
    case "0-5":
      return age >= 0 && age <= 5;
    case "6-12":
      return age >= 6 && age <= 12;
    case "13-17":
      return age >= 13 && age <= 17;
    case "18-35":
      return age >= 18 && age <= 35;
    case "36-60":
      return age >= 36 && age <= 60;
    case "60+":
      return age > 60;
    default:
      return true;
  }
}
