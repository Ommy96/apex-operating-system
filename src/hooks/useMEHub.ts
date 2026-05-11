import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export interface MEHubStats {
  totalBeneficiaries: number;
  activeCases: number;
  visitsThisMonth: number;
  activePrograms: number;
  indicatorsOnTrack: number;
  indicatorsAtRisk: number;
  indicatorsOffTrack: number;
  dataDueThisWeek: number;
  collectionsOverdue: number;
  collectionsCollectedThisWeek: number;
  openCases: number;
  highPriorityCases: number;
  overdueFollowUps: number;
  activitiesWithoutBeneficiaries: number;
  totalActivitiesRecent: number;
  dataQualityFlagsUnresolved: number;
  topOffTrackIndicators: Array<{
    id: string;
    name: string;
    target: number | null;
    current: number | null;
    percent: number;
  }>;
  overdueCollections: Array<{
    id: string;
    indicator_name: string | null;
    due_date: string;
    days_overdue: number;
    responsible: string | null;
  }>;
  overdueFollowUpList: Array<{
    id: string;
    beneficiary_display: string;
    days_overdue: number;
    assigned_to: string | null;
  }>;
}

function startOfWeek(d = new Date()) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWeek(d = new Date()) {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function useMEHub() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ["me-hub", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<MEHubStats> => {
      if (!orgId) throw new Error("No organisation");

      const now = new Date();
      const weekStart = startOfWeek(now).toISOString();
      const weekEnd = endOfWeek(now).toISOString();
      const monthStart = startOfMonth(now).toISOString();
      const todayIso = now.toISOString().slice(0, 10);

      const beneficiariesCount: any = await supabase.from("beneficiaries").select("id", { count: "exact", head: true }).eq("organization_id", orgId).is("deleted_at", null);
      const programsCount: any = await supabase.from("programs").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("is_active", true);
      const visitsMonth: any = await supabase
        .from("beneficiary_visitations")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .gte("visit_date", monthStart);
      const indicators: any = await supabase
        .from("indicators")
        .select("id, name, target_value")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .is("deleted_at", null);
      const scheduleAll: any = await supabase
        .from("me_data_schedule")
        .select("id, indicator_id, due_date, status, assigned_to")
        .eq("organization_id", orgId);
      const cases: any = await supabase
        .from("beneficiary_cases")
        .select("id, priority, case_status", { count: "exact" })
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .neq("case_status", "closed")
        .neq("case_status", "resolved");
      const casesHigh: any = await supabase
        .from("beneficiary_cases")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .in("priority", ["high", "critical"])
        .neq("case_status", "closed");
      const followUps: any = await supabase
        .from("case_entries")
        .select("id, beneficiary_id, follow_up_date, structured_data")
        .eq("organization_id", orgId)
        .eq("follow_up_completed", false)
        .not("follow_up_date", "is", null)
        .lt("follow_up_date", todayIso)
        .limit(50);
      const dqFlags: any = await supabase
        .from("data_quality_flags")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("is_resolved", false);
      const recentActivities: any = await supabase
        .from("activities")
        .select("id, attendees_count, beneficiaries_reached")
        .eq("organization_id", orgId)
        .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .limit(500);

      // Latest indicator value for each indicator
      const indicatorIds = (indicators.data ?? []).map((i) => i.id);
      const latestValues = indicatorIds.length
        ? await supabase
            .from("indicator_values")
            .select("indicator_id, actual_value, period_start")
            .in("indicator_id", indicatorIds)
            .order("period_start", { ascending: false })
            .limit(1000)
        : { data: [], error: null };

      const latestByIndicator = new Map<string, number>();
      (latestValues.data ?? []).forEach((v: any) => {
        if (!latestByIndicator.has(v.indicator_id)) {
          latestByIndicator.set(v.indicator_id, Number(v.actual_value) || 0);
        }
      });

      let onTrack = 0;
      let atRisk = 0;
      let offTrack = 0;
      const scored: Array<{ id: string; name: string; target: number | null; current: number | null; percent: number }> = [];
      (indicators.data ?? []).forEach((ind: any) => {
        const target = ind.target_value ? Number(ind.target_value) : null;
        const current = latestByIndicator.get(ind.id) ?? null;
        if (!target || target === 0 || current === null) {
          scored.push({ id: ind.id, name: ind.name, target, current, percent: 0 });
          return;
        }
        const pct = (current / target) * 100;
        if (pct >= 80) onTrack++;
        else if (pct >= 50) atRisk++;
        else offTrack++;
        scored.push({ id: ind.id, name: ind.name, target, current, percent: pct });
      });
      const topOffTrackIndicators = scored
        .filter((s) => s.target && s.percent < 80)
        .sort((a, b) => a.percent - b.percent)
        .slice(0, 4);

      // Schedule status
      const schedule = scheduleAll.data ?? [];
      const collectionsOverdue = schedule.filter((s: any) => s.status !== "collected" && new Date(s.due_date) < now).length;
      const dataDueThisWeek = schedule.filter((s: any) => s.status !== "collected" && new Date(s.due_date) >= startOfWeek(now) && new Date(s.due_date) <= endOfWeek(now)).length;
      const collectionsCollectedThisWeek = schedule.filter((s: any) => s.status === "collected" && new Date(s.due_date) >= startOfWeek(now) && new Date(s.due_date) <= endOfWeek(now)).length;

      const overdueCollections = schedule
        .filter((s: any) => s.status !== "collected" && new Date(s.due_date) < now)
        .sort((a: any, b: any) => +new Date(a.due_date) - +new Date(b.due_date))
        .slice(0, 4)
        .map((s: any) => {
          const ind = indicators.data?.find((i: any) => i.id === s.indicator_id);
          return {
            id: s.id,
            indicator_name: ind?.name ?? null,
            due_date: s.due_date,
            days_overdue: Math.max(0, Math.floor((+now - +new Date(s.due_date)) / 86400000)),
            responsible: s.assigned_to ?? null,
          };
        });

      // Case data
      const allCases = cases.data ?? [];
      const openCases = allCases.length;

      const overdueFollowUpList = (followUps.data ?? [])
        .slice(0, 4)
        .map((f: any) => ({
          id: f.id,
          beneficiary_display: "Beneficiary",
          days_overdue: Math.max(0, Math.floor((+now - +new Date(f.follow_up_date)) / 86400000)),
          assigned_to: null as string | null,
        }));

      // Activities without beneficiary linkage
      const activitiesArr = recentActivities.data ?? [];
      const totalActivitiesRecent = activitiesArr.length;
      const activitiesWithoutBeneficiaries = activitiesArr.filter((a: any) => !a.beneficiaries_reached || a.beneficiaries_reached === 0).length;

      return {
        totalBeneficiaries: beneficiariesCount.count ?? 0,
        activeCases: openCases,
        visitsThisMonth: visitsMonth.count ?? 0,
        activePrograms: programsCount.count ?? 0,
        indicatorsOnTrack: onTrack,
        indicatorsAtRisk: atRisk,
        indicatorsOffTrack: offTrack,
        dataDueThisWeek,
        collectionsOverdue,
        collectionsCollectedThisWeek,
        openCases,
        highPriorityCases: casesHigh.count ?? 0,
        overdueFollowUps: followUps.data?.length ?? 0,
        activitiesWithoutBeneficiaries,
        totalActivitiesRecent,
        dataQualityFlagsUnresolved: dqFlags.count ?? 0,
        topOffTrackIndicators,
        overdueCollections,
        overdueFollowUpList,
      };
    },
    staleTime: 60_000,
  });
}

export function computeDataQualityScore(s: MEHubStats | undefined): number {
  if (!s) return 0;
  // 40% — % indicator collections without flags (proxy: 1 - flags/total schedule)
  const totalSchedule = s.collectionsCollectedThisWeek + s.collectionsOverdue + s.dataDueThisWeek;
  const flagsRatio = totalSchedule > 0 ? Math.min(1, s.dataQualityFlagsUnresolved / Math.max(totalSchedule, 1)) : 0;
  const flagsScore = (1 - flagsRatio) * 40;
  // 30% — % indicators on schedule
  const onScheduleScore = totalSchedule > 0 ? (s.collectionsCollectedThisWeek / totalSchedule) * 30 : 30;
  // 30% — % activities with beneficiary linkage
  const linkScore = s.totalActivitiesRecent > 0
    ? ((s.totalActivitiesRecent - s.activitiesWithoutBeneficiaries) / s.totalActivitiesRecent) * 30
    : 30;
  return Math.round(flagsScore + onScheduleScore + linkScore);
}