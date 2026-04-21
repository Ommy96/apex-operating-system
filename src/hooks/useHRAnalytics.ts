import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

/**
 * Aggregates personnel KPIs and breakdowns for the HR Analytics tab.
 * All queries are organization-scoped and tolerant of missing optional columns.
 */
export function useHRAnalytics() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ["hr-analytics", orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      const [members, contracts, leaves, leaveTypes, volunteers, hours, checkIns, tasks] = await Promise.all([
        supabase
          .from("organization_members")
          .select("id, role, branch_id, joined_at")
          .eq("organization_id", orgId!),
        supabase
          .from("staff_performance_contracts")
          .select("id, status, overall_score, contract_period_end")
          .eq("organization_id", orgId!),
        supabase
          .from("leave_requests")
          .select("id, status, days_requested, leave_type_id, start_date, end_date")
          .eq("organization_id", orgId!),
        supabase.from("leave_types").select("id, name").eq("organization_id", orgId!),
        supabase
          .from("volunteers")
          .select("id, status, start_date, skills")
          .eq("organization_id", orgId!)
          .is("deleted_at", null),
        supabase
          .from("volunteer_hours")
          .select("id, hours, log_date, volunteer_id, verified_at")
          .eq("organization_id", orgId!)
          .order("log_date", { ascending: false })
          .limit(1000),
        supabase
          .from("field_check_ins")
          .select("id, checked_in_at, staff_user_id")
          .eq("organization_id", orgId!)
          .gte("checked_in_at", new Date(Date.now() - 30 * 86400_000).toISOString()),
        supabase
          .from("staff_tasks")
          .select("id, status, priority, due_date, assigned_to")
          .eq("organization_id", orgId!),
      ]);

      const m = members.data ?? [];
      const c = contracts.data ?? [];
      const l = leaves.data ?? [];
      const lt = leaveTypes.data ?? [];
      const v = volunteers.data ?? [];
      const h = hours.data ?? [];
      const f = checkIns.data ?? [];
      const t = tasks.data ?? [];

      // Role distribution
      const roleDist = m.reduce<Record<string, number>>((acc, x) => {
        const k = x.role || "unassigned";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});

      // Leave by type
      const ltMap = new Map(lt.map((x) => [x.id, x.name]));
      const leaveByType = l.reduce<Record<string, { count: number; days: number }>>((acc, x) => {
        const k = ltMap.get(x.leave_type_id) || "Other";
        acc[k] ||= { count: 0, days: 0 };
        acc[k].count += 1;
        acc[k].days += Number(x.days_requested ?? 0);
        return acc;
      }, {});

      // Pending leave
      const pendingLeave = l.filter((x) => x.status === "pending").length;
      const approvedLeaveDays = l
        .filter((x) => x.status === "approved")
        .reduce((s, x) => s + Number(x.days_requested ?? 0), 0);

      // Volunteer hours last 12 months — group by month
      const monthBuckets: Record<string, number> = {};
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthBuckets[key] = 0;
      }
      h.forEach((x) => {
        const d = new Date(x.log_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (key in monthBuckets) monthBuckets[key] += Number(x.hours ?? 0);
      });

      // Volunteer retention (active >= 6 months / total)
      const sixMonthsAgo = new Date(Date.now() - 182 * 86400_000);
      const retainedVolunteers = v.filter(
        (x) => x.status === "active" && x.start_date && new Date(x.start_date) <= sixMonthsAgo,
      ).length;
      const retentionRate = v.length ? (retainedVolunteers / v.length) * 100 : 0;

      // Contract status
      const contractsByStatus = c.reduce<Record<string, number>>((acc, x) => {
        acc[x.status] = (acc[x.status] ?? 0) + 1;
        return acc;
      }, {});
      const avgContractScore = (() => {
        const scored = c.filter((x) => x.overall_score != null);
        if (!scored.length) return 0;
        return scored.reduce((s, x) => s + Number(x.overall_score), 0) / scored.length;
      })();

      // Tasks
      const overdueTasks = t.filter(
        (x) => x.status !== "completed" && x.due_date && new Date(x.due_date) < new Date(),
      ).length;
      const tasksByStatus = t.reduce<Record<string, number>>((acc, x) => {
        acc[x.status] = (acc[x.status] ?? 0) + 1;
        return acc;
      }, {});

      // Field activity — unique active staff in last 30 days
      const activeFieldStaff = new Set(f.map((x) => x.staff_user_id)).size;

      return {
        totalStaff: m.length,
        totalVolunteers: v.length,
        activeVolunteers: v.filter((x) => x.status === "active").length,
        pendingLeave,
        approvedLeaveDays,
        activeFieldStaff,
        retentionRate,
        avgContractScore,
        overdueTasks,
        roleDist,
        leaveByType,
        contractsByStatus,
        tasksByStatus,
        volunteerHoursTrend: Object.entries(monthBuckets).map(([month, hours]) => ({ month, hours })),
        totalVolunteerHours: h.reduce((s, x) => s + Number(x.hours ?? 0), 0),
      };
    },
  });
}