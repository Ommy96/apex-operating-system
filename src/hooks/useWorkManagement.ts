import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgStaff } from "@/hooks/useOrgStaff";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { toast } from "sonner";
import type { WorkRecordType } from "@/lib/workManagement";

const sb = supabase as any;

export interface WorkTask {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "todo" | "in_progress" | "blocked" | "completed" | "cancelled";
  due_date: string | null;
  completed_at: string | null;
  program_id: string | null;
  project_id: string | null;
  case_id: string | null;
  related_record_type: WorkRecordType | null;
  related_record_id: string | null;
  is_sensitive: boolean;
}

export interface WorkRecordOption {
  id: string;
  label: string;
  type: WorkRecordType;
}

export function useWorkManagement() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  useRealtimeSubscription([
    { table: "staff_tasks", queryKeys: [["staff-tasks", orgId || ""], ["case-tasks"], ["task-workload"]], orgId, enabled: Boolean(orgId) },
  ]);

  const tasks = useQuery({
    queryKey: ["staff-tasks", orgId],
    enabled: Boolean(orgId),
    queryFn: async (): Promise<WorkTask[]> => {
      const { data, error } = await sb
        .from("staff_tasks")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const orgMembers = useOrgStaff(orgId);

  const cases = useQuery({
    queryKey: ["work-case-options", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await sb
        .from("beneficiary_cases")
        .select("id, case_number, case_type, beneficiary:beneficiaries(display_name, first_name, last_name)")
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .not("case_status", "in", "(closed,lost_to_follow_up)")
        .order("opened_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const workload = useQuery({
    queryKey: ["task-workload", orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await sb.rpc("get_staff_task_workload", { _org_id: orgId });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createTask = useMutation({
    mutationFn: async (values: {
      title: string;
      description?: string;
      assigned_to?: string;
      priority?: string;
      due_date?: string;
      case_id?: string;
      related_record_type?: WorkRecordType;
      related_record_id?: string;
      is_sensitive?: boolean;
    }) => {
      if (!orgId) throw new Error("No organisation selected");
      if (!user?.id) throw new Error("Sign in to create a task");
      if (!values.title.trim()) throw new Error("Task title is required");
      const insert = {
        ...values,
        description: values.description?.trim() || null,
        assigned_to: values.assigned_to || null,
        due_date: values.due_date || null,
        case_id: values.case_id || null,
        related_record_type: values.related_record_type || null,
        related_record_id: values.related_record_id || null,
        is_sensitive: Boolean(values.is_sensitive),
        organization_id: orgId,
        assigned_by: user.id,
      };
      const { data, error } = await sb.from("staff_tasks").insert(insert).select().single();
      if (error) throw error;
      return data as WorkTask;
    },
    onSuccess: (task) => {
      void queryClient.invalidateQueries({ queryKey: ["staff-tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["case-tasks", task.case_id] });
      void queryClient.invalidateQueries({ queryKey: ["task-workload"] });
      toast.success("Task created");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WorkTask["status"] }) => {
      const { error: updateError } = await sb.from("staff_tasks").update({ status }).eq("id", id).select("id").single();
      if (updateError) throw updateError;
      return { id };
    },
    onSuccess: ({ id }) => {
      void queryClient.invalidateQueries({ queryKey: ["staff-tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["case-tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["task-workload"] });
      toast.success("Task status updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { tasks, orgMembers, cases, workload, createTask, updateTaskStatus, orgId };
}

export function useCaseTasks(caseId: string | undefined) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ["case-tasks", orgId, caseId],
    enabled: Boolean(orgId && caseId),
    queryFn: async (): Promise<WorkTask[]> => {
      const { data, error } = await sb
        .from("staff_tasks")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useWorkRecordOptions(type: WorkRecordType | "none") {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ["work-record-options", orgId, type],
    enabled: Boolean(orgId && type !== "none"),
    queryFn: async (): Promise<WorkRecordOption[]> => {
      if (!orgId || type === "none") return [];
      const config: Record<WorkRecordType, { table: string; columns: string; date?: string; label: (row: any) => string }> = {
        life_event: { table: "life_events", columns: "id,title,event_type,occurred_on", date: "occurred_on", label: (r) => r.title || r.event_type || "Life event" },
        vulnerability_assessment: { table: "vulnerability_assessments", columns: "id,category_label,created_at", date: "created_at", label: (r) => r.category_label || "Vulnerability assessment" },
        need: { table: "beneficiary_needs", columns: "id,status,created_at,need_type:need_types(label)", date: "created_at", label: (r) => r.need_type?.label || `Need · ${r.status}` },
        home_visit: { table: "home_visits", columns: "id,visit_date,created_at", date: "visit_date", label: () => "Home visit" },
        school_visit: { table: "school_visits", columns: "id,visit_date,institution_name", date: "visit_date", label: (r) => r.institution_name || "School visit" },
        donor_request: { table: "donation_intents", columns: "id,kind,created_at", date: "created_at", label: (r) => `Donation request · ${String(r.kind).replace(/_/g, " ")}` },
      };
      const selected = config[type];
      let query = sb.from(selected.table).select(selected.columns).eq("organization_id", orgId).limit(100);
      if (["life_event", "vulnerability_assessment", "home_visit", "school_visit"].includes(type)) query = query.is("deleted_at", null);
      if (selected.date) query = query.order(selected.date, { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id,
        type,
        label: `${selected.label(row)} · ${format(new Date(row[selected.date || "created_at"] || row.created_at || Date.now()), "MMM d, yyyy")}`,
      }));
    },
  });
}