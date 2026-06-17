import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { getCachedScope, putCachedScope } from "@/lib/offlineStorage";

export type WorkspaceData = {
  visitsToday: any[];
  activitiesToday: any[];
  reportsDueThisWeek: any[];
  pendingAllocations: any[];
  highRiskBeneficiaries: any[];
  staleBeneficiaries: any[];
  heldAllocations: any[];
  fieldLogsMissingFollowup: any[];
  workQueue: WorkQueueItem[];
  teamMembers: TeamMember[];
  loadedFromCache: boolean;
  loading: boolean;
};

export type WorkQueueItem = {
  id: string;
  label: string;
  href?: string;
  count: number;
  kind: "field_logs_review" | "reports_approval" | "exit_confirmation";
};

export type TeamMember = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role_on_project: string | null;
  recent_log_count: number;
  last_log_at: string | null;
};

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function startOfTodayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function endOfTodayISO() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}
function endOfWeekISO() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = 7 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export function useLeadWorkspaceData(projectId: string | null) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const [data, setData] = useState<WorkspaceData>({
    visitsToday: [],
    activitiesToday: [],
    reportsDueThisWeek: [],
    pendingAllocations: [],
    highRiskBeneficiaries: [],
    staleBeneficiaries: [],
    heldAllocations: [],
    fieldLogsMissingFollowup: [],
    workQueue: [],
    teamMembers: [],
    loadedFromCache: false,
    loading: true,
  });

  const load = useCallback(async () => {
    if (!orgId || !projectId) {
      setData((d) => ({ ...d, loading: false }));
      return;
    }

    const cacheKey = `lead_workspace:${orgId}:${projectId}`;
    const cached = await getCachedScope<WorkspaceData>(cacheKey);
    if (cached) {
      setData({ ...cached, loadedFromCache: true, loading: false });
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return;
    }

    try {
      const sb = supabase as any;
      const today0 = startOfTodayISO();
      const today1 = endOfTodayISO();
      const weekEnd = endOfWeekISO();
      const sixtyDaysAgo = new Date(Date.now() - SIXTY_DAYS_MS).toISOString();
      const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

      // Beneficiaries enrolled in this project (used for visit/risk lookups)
      const { data: enrolled } = await sb
        .from("beneficiary_services")
        .select("beneficiary_id")
        .eq("organization_id", orgId)
        .eq("project_id", projectId)
        .in("status", ["active", "enrolled"]);
      const beneficiaryIds = Array.from(
        new Set((enrolled || []).map((r: any) => r.beneficiary_id).filter(Boolean))
      );

      const [
        visitsTodayRes,
        activitiesTodayRes,
        reportsDueRes,
        pendingAllocRes,
        heldAllocRes,
        riskRes,
        recentVisitsRes,
        fieldLogsRes,
        submittedReportsRes,
        teamRes,
        recentLogsByStaffRes,
      ] = await Promise.all([
        sb
          .from("beneficiary_visitations")
          .select("id,beneficiary_id,visit_type,visit_date,location,staff_name")
          .eq("organization_id", orgId)
          .gte("visit_date", today0)
          .lte("visit_date", today1)
          .in("beneficiary_id", beneficiaryIds.length ? beneficiaryIds : ["00000000-0000-0000-0000-000000000000"]),
        sb
          .from("activities")
          .select("id,name,type,status,scheduled_at,location")
          .eq("organization_id", orgId)
          .eq("project_id", projectId)
          .gte("scheduled_at", today0)
          .lte("scheduled_at", today1),
        sb
          .from("project_report_drafts")
          .select("id,period_start,period_end,status,generated_at")
          .eq("organization_id", orgId)
          .eq("project_id", projectId)
          .lte("period_end", weekEnd)
          .in("status", ["draft", "submitted"]),
        sb
          .from("allocations")
          .select("id,amount_native,native_currency,status,allocated_at,beneficiary_id,scope")
          .eq("organization_id", orgId)
          .eq("project_id", projectId)
          .in("status", ["pending", "pending_review"]),
        sb
          .from("allocations")
          .select("id,amount_native,native_currency,status,allocated_at,beneficiary_id")
          .eq("organization_id", orgId)
          .eq("project_id", projectId)
          .eq("status", "held")
          .lte("allocated_at", sevenDaysAgo),
        beneficiaryIds.length
          ? sb
              .from("beneficiary_risk_scores")
              .select("beneficiary_id,overall_risk_level,assessment_date")
              .eq("organization_id", orgId)
              .in("beneficiary_id", beneficiaryIds)
              .in("overall_risk_level", ["high", "critical"])
          : Promise.resolve({ data: [] }),
        beneficiaryIds.length
          ? sb
              .from("beneficiary_visitations")
              .select("beneficiary_id,visit_date")
              .eq("organization_id", orgId)
              .in("beneficiary_id", beneficiaryIds)
              .gte("visit_date", sixtyDaysAgo)
          : Promise.resolve({ data: [] }),
        sb
          .from("field_logs")
          .select("id,title,category,logged_at,logged_by,beneficiary_id,metadata")
          .eq("organization_id", orgId)
          .eq("project_id", projectId)
          .order("logged_at", { ascending: false })
          .limit(200),
        sb
          .from("project_report_drafts")
          .select("id,period_start,period_end,status,submitted_at")
          .eq("organization_id", orgId)
          .eq("project_id", projectId)
          .eq("status", "submitted"),
        sb
          .from("project_team_members")
          .select("user_id,role_on_project")
          .eq("project_id", projectId),
        sb
          .from("field_logs")
          .select("logged_by,logged_at")
          .eq("organization_id", orgId)
          .eq("project_id", projectId)
          .gte("logged_at", sevenDaysAgo),
      ]);

      // Beneficiaries with no visit > 60 days
      const visited = new Set((recentVisitsRes.data || []).map((r: any) => r.beneficiary_id));
      const staleIds = beneficiaryIds.filter((id) => !visited.has(id));
      let staleBenes: any[] = [];
      if (staleIds.length) {
        const { data } = await sb
          .from("beneficiaries")
          .select("id,display_name,first_name,last_name")
          .eq("organization_id", orgId)
          .in("id", staleIds.slice(0, 50));
        staleBenes = data || [];
      }

      // High risk beneficiary detail
      let highRiskBenes: any[] = [];
      const riskRows = (riskRes.data || []) as any[];
      if (riskRows.length) {
        const ids = riskRows.map((r) => r.beneficiary_id);
        const { data } = await sb
          .from("beneficiaries")
          .select("id,display_name,first_name,last_name")
          .eq("organization_id", orgId)
          .in("id", ids);
        const byId = new Map((data || []).map((b: any) => [b.id, b]));
        highRiskBenes = riskRows.map((r) => ({
          ...r,
          beneficiary: byId.get(r.beneficiary_id) || null,
        }));
      }

      // Field logs missing follow-up: category in (incident, observation) without metadata.followed_up
      const fieldLogs = (fieldLogsRes.data || []) as any[];
      const missing = fieldLogs.filter(
        (f) =>
          ["incident", "observation"].includes(f.category) &&
          !(f.metadata && (f.metadata.followed_up || f.metadata.follow_up_done))
      );

      // Work queue
      const workQueue: WorkQueueItem[] = [];
      if (missing.length) {
        workQueue.push({
          id: "wq_logs",
          label: `Review ${missing.length} field log${missing.length === 1 ? "" : "s"} awaiting follow-up`,
          href: `/projects/${projectId}/reports`,
          count: missing.length,
          kind: "field_logs_review",
        });
      }
      const submittedCount = (submittedReportsRes.data || []).length;
      if (submittedCount) {
        workQueue.push({
          id: "wq_reports",
          label: `Approve ${submittedCount} submitted report${submittedCount === 1 ? "" : "s"}`,
          href: `/projects/${projectId}/reports`,
          count: submittedCount,
          kind: "reports_approval",
        });
      }
      // Exit confirmations: services flagged exited but without exit_date confirmation
      const { data: exitRows } = await sb
        .from("beneficiary_services")
        .select("id,beneficiary_id,exit_date,status")
        .eq("organization_id", orgId)
        .eq("project_id", projectId)
        .in("status", ["pending_exit", "exited"])
        .is("exit_date", null);
      if ((exitRows || []).length) {
        workQueue.push({
          id: "wq_exits",
          label: `Confirm ${exitRows!.length} pending exit resolution${exitRows!.length === 1 ? "" : "s"}`,
          href: `/projects/dashboard/${projectId}`,
          count: exitRows!.length,
          kind: "exit_confirmation",
        });
      }

      // Team
      const teamRows = (teamRes.data || []) as any[];
      const teamUserIds = teamRows.map((r) => r.user_id);
      let profiles: any[] = [];
      if (teamUserIds.length) {
        const { data } = await sb
          .from("profiles")
          .select("id,full_name,email")
          .in("id", teamUserIds);
        profiles = data || [];
      }
      const logsByStaff = new Map<string, { count: number; last: string }>();
      (recentLogsByStaffRes.data || []).forEach((l: any) => {
        if (!l.logged_by) return;
        const prev = logsByStaff.get(l.logged_by) || { count: 0, last: "" };
        prev.count += 1;
        if (!prev.last || l.logged_at > prev.last) prev.last = l.logged_at;
        logsByStaff.set(l.logged_by, prev);
      });
      const teamMembers: TeamMember[] = teamRows.map((r) => {
        const p = profiles.find((x: any) => x.id === r.user_id) || {};
        const stats = logsByStaff.get(r.user_id);
        return {
          user_id: r.user_id,
          full_name: p.full_name ?? null,
          email: p.email ?? null,
          role_on_project: r.role_on_project ?? null,
          recent_log_count: stats?.count ?? 0,
          last_log_at: stats?.last ?? null,
        };
      });

      const next: WorkspaceData = {
        visitsToday: visitsTodayRes.data || [],
        activitiesToday: activitiesTodayRes.data || [],
        reportsDueThisWeek: reportsDueRes.data || [],
        pendingAllocations: pendingAllocRes.data || [],
        highRiskBeneficiaries: highRiskBenes,
        staleBeneficiaries: staleBenes,
        heldAllocations: heldAllocRes.data || [],
        fieldLogsMissingFollowup: missing,
        workQueue,
        teamMembers,
        loadedFromCache: false,
        loading: false,
      };
      setData(next);
      await putCachedScope(cacheKey, next);
    } catch (e) {
      setData((d) => ({ ...d, loading: false }));
    }
  }, [orgId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, reload: load };
}