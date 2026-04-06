import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { differenceInDays, subDays } from "date-fns";

export type RiskSeverity = "critical" | "high" | "medium" | "low";

export interface RiskItem {
  id: string;
  severity: RiskSeverity;
  category: "financial" | "programme" | "compliance" | "data_quality";
  description: string;
  entityName: string;
  link?: string;
}

export function useRiskAssessment() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ["risk-assessment", orgId],
    queryFn: async (): Promise<RiskItem[]> => {
      if (!orgId) return [];
      const risks: RiskItem[] = [];

      const [
        { data: grants },
        { data: activities },
        { data: complaints },
        { data: beneficiaries },
        { data: enrollments },
      ] = await Promise.all([
        supabase.from("grants").select("id, grant_name, status, end_date, grant_amount").eq("organization_id", orgId),
        supabase.from("activities").select("id, title, status, planned_date, organization_id").eq("organization_id", orgId).is("deleted_at", null),
        supabase.from("complaints").select("id, subject, status, created_at").eq("organization_id", orgId),
        supabase.from("beneficiaries").select("id, display_name").eq("organization_id", orgId).is("deleted_at", null),
        supabase.from("beneficiary_services").select("beneficiary_id").eq("organization_id", orgId),
      ]);

      // Grant deadline risks
      grants?.forEach(g => {
        if (g.end_date) {
          const daysLeft = differenceInDays(new Date(g.end_date), new Date());
          if (daysLeft < 0) {
            risks.push({ id: `grant-expired-${g.id}`, severity: "high", category: "financial", description: `Grant expired ${Math.abs(daysLeft)} days ago`, entityName: g.grant_name || "Unnamed grant", link: "/financial" });
          } else if (daysLeft < 7) {
            risks.push({ id: `grant-ending-${g.id}`, severity: "high", category: "financial", description: `Grant ending in ${daysLeft} days`, entityName: g.grant_name || "Unnamed grant", link: "/financial" });
          } else if (daysLeft < 30) {
            risks.push({ id: `grant-soon-${g.id}`, severity: "medium", category: "financial", description: `Grant ending in ${daysLeft} days`, entityName: g.grant_name || "Unnamed grant", link: "/financial" });
          }
        }
      });

      // Overdue activities
      const overdueActivities = activities?.filter(a => a.status !== "completed" && a.planned_date && new Date(a.planned_date) < subDays(new Date(), 0)) || [];
      if (overdueActivities.length > 3) {
        risks.push({ id: "overdue-activities", severity: "high", category: "programme", description: `${overdueActivities.length} activities are overdue`, entityName: "Activities", link: "/programs" });
      } else if (overdueActivities.length > 0) {
        risks.push({ id: "overdue-activities", severity: "medium", category: "programme", description: `${overdueActivities.length} activities overdue`, entityName: "Activities", link: "/programs" });
      }

      // Unresolved complaints
      const unresolvedComplaints = complaints?.filter(c => c.status !== "resolved" && differenceInDays(new Date(), new Date(c.created_at)) > 7) || [];
      if (unresolvedComplaints.length > 0) {
        const severity: RiskSeverity = unresolvedComplaints.some(c => differenceInDays(new Date(), new Date(c.created_at)) > 14) ? "critical" : "high";
        risks.push({ id: "unresolved-complaints", severity, category: "compliance", description: `${unresolvedComplaints.length} complaints unresolved for 7+ days`, entityName: "Complaints", link: "/complaint-management" });
      }

      // Beneficiaries without enrollment
      const enrolledIds = new Set(enrollments?.map(e => e.beneficiary_id) || []);
      const unenrolled = beneficiaries?.filter(b => !enrolledIds.has(b.id)) || [];
      if (unenrolled.length > 0) {
        risks.push({ id: "unenrolled-beneficiaries", severity: "low", category: "data_quality", description: `${unenrolled.length} beneficiaries with no programme enrollment`, entityName: "Beneficiaries", link: "/beneficiaries" });
      }

      // No-activity activities (activities with no attendance)
      const noAttendance = activities?.filter(a => a.status === "completed") || [];
      if (noAttendance.length > 10) {
        risks.push({ id: "no-attendance-data", severity: "low", category: "data_quality", description: `${noAttendance.length} completed activities — verify attendance data`, entityName: "Activities" });
      }

      return risks.sort((a, b) => {
        const order: Record<RiskSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a.severity] - order[b.severity];
      });
    },
    enabled: !!orgId,
    refetchInterval: 5 * 60 * 1000,
  });
}
