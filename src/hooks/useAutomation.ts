import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

export function useAutomation() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  // ========== AUTOMATION RULES ==========
  const rules = useQuery({
    queryKey: ["automation-rules", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_rules")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createRule = useMutation({
    mutationFn: async (values: {
      name: string;
      description?: string;
      trigger_event: string;
      trigger_conditions?: any;
      actions?: any;
    }) => {
      const { data, error } = await supabase
        .from("automation_rules")
        .insert({ ...values, organization_id: orgId!, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success("Automation rule created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; is_active?: boolean; name?: string; actions?: any; trigger_conditions?: any }) => {
      const { error } = await supabase.from("automation_rules").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success("Rule updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("automation_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success("Rule deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const automationLogs = useQuery({
    queryKey: ["automation-logs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_logs")
        .select("*")
        .eq("organization_id", orgId!)
        .order("executed_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // ========== ALERT RULES ==========
  const alertRules = useQuery({
    queryKey: ["alert-rules", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_rules")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createAlertRule = useMutation({
    mutationFn: async (values: {
      name: string;
      description?: string;
      category?: string;
      severity?: string;
      condition_type: string;
      condition_config?: any;
      cooldown_hours?: number;
    }) => {
      const { data, error } = await supabase
        .from("alert_rules")
        .insert({ ...values, organization_id: orgId!, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      toast.success("Alert rule created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateAlertRule = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; is_active?: boolean }) => {
      const { error } = await supabase.from("alert_rules").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      toast.success("Alert rule updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAlertRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alert_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      toast.success("Alert rule deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const alertInstances = useQuery({
    queryKey: ["alert-instances", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_instances")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const resolveAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alert_instances")
        .update({ is_resolved: true, resolved_by: user?.id, resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-instances"] });
      toast.success("Alert resolved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markAlertRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alert_instances").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alert-instances"] }),
    onError: (e: any) => toast.error(e.message),
  });

  // ========== DONOR REPORT TEMPLATES ==========
  const reportTemplates = useQuery({
    queryKey: ["donor-report-templates", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donor_report_templates")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createReportTemplate = useMutation({
    mutationFn: async (values: {
      name: string;
      description?: string;
      template_type?: string;
      donor_name?: string;
      include_financials?: boolean;
      include_beneficiary_stats?: boolean;
      include_program_progress?: boolean;
      program_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("donor_report_templates")
        .insert({ ...values, organization_id: orgId!, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donor-report-templates"] });
      toast.success("Report template created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteReportTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("donor_report_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donor-report-templates"] });
      toast.success("Template deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reportRuns = useQuery({
    queryKey: ["donor-report-runs", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donor_report_runs")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const generateReport = useMutation({
    mutationFn: async (values: {
      template_id: string;
      template_name: string;
      report_period_start: string;
      report_period_end: string;
    }) => {
      // Generate report data by aggregating org stats
      const [beneficiaries, programs, expenses] = await Promise.all([
        supabase.from("beneficiaries").select("id, display_name, status, beneficiary_type", { count: "exact" }).eq("organization_id", orgId!).is("deleted_at", null),
        supabase.from("programs").select("id, name, is_active", { count: "exact" }).eq("organization_id", orgId!),
        supabase.from("expenses").select("amount, status, expense_date").eq("organization_id", orgId!).gte("expense_date", values.report_period_start).lte("expense_date", values.report_period_end),
      ]);

      const totalExpenses = (expenses.data || []).reduce((sum, e) => sum + (e.amount || 0), 0);
      const approvedExpenses = (expenses.data || []).filter(e => e.status === "approved").reduce((sum, e) => sum + (e.amount || 0), 0);

      const generatedData = {
        summary: {
          total_beneficiaries: beneficiaries.count || 0,
          active_beneficiaries: (beneficiaries.data || []).filter(b => b.status === "active").length,
          total_programs: programs.count || 0,
          active_programs: (programs.data || []).filter(p => p.is_active).length,
          total_expenditure: totalExpenses,
          approved_expenditure: approvedExpenses,
        },
        generated_at: new Date().toISOString(),
        period: { start: values.report_period_start, end: values.report_period_end },
      };

      const { data, error } = await supabase
        .from("donor_report_runs")
        .insert({
          ...values,
          organization_id: orgId!,
          generated_by: user?.id,
          generated_data: generatedData,
          status: "completed",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["donor-report-runs"] });
      toast.success("Report generated successfully");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Real-time subscriptions for automation tables
  useRealtimeSubscription([
    { table: "automation_rules", queryKeys: [["automation-rules", orgId || ""]], orgId, enabled: !!orgId },
    { table: "automation_logs", queryKeys: [["automation-logs", orgId || ""]], orgId, enabled: !!orgId },
    { table: "alert_rules", queryKeys: [["alert-rules", orgId || ""]], orgId, enabled: !!orgId },
    { table: "alert_instances", queryKeys: [["alert-instances", orgId || ""]], orgId, enabled: !!orgId },
  ]);

  return {
    rules, createRule, updateRule, deleteRule, automationLogs,
    alertRules, createAlertRule, updateAlertRule, deleteAlertRule, alertInstances, resolveAlert, markAlertRead,
    reportTemplates, createReportTemplate, deleteReportTemplate, reportRuns, generateReport,
  };
}
