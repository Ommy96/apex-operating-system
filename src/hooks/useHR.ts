import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

export function useHR() {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  // ========== PERFORMANCE CONTRACTS ==========
  const contracts = useQuery({
    queryKey: ["hr-contracts", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_performance_contracts")
        .select("*, staff_contract_objectives(*)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createContract = useMutation({
    mutationFn: async (values: {
      staff_user_id: string;
      contract_title: string;
      contract_period_start: string;
      contract_period_end: string;
    }) => {
      const { data, error } = await supabase
        .from("staff_performance_contracts")
        .insert({ ...values, organization_id: orgId!, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-contracts"] });
      toast.success("Performance contract created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateContract = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; status?: string; overall_score?: number; reviewer_comments?: string }) => {
      const { error } = await supabase
        .from("staff_performance_contracts")
        .update({ ...values, reviewer_id: user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-contracts"] });
      toast.success("Contract updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createObjective = useMutation({
    mutationFn: async (values: {
      contract_id: string;
      objective_title: string;
      description?: string;
      weight?: number;
      target_value?: number;
      unit?: string;
      sort_order?: number;
    }) => {
      const { data, error } = await supabase
        .from("staff_contract_objectives")
        .insert(values)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-contracts"] });
      toast.success("Objective added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateObjective = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; actual_value?: number; score?: number; evidence?: string }) => {
      const { error } = await supabase.from("staff_contract_objectives").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-contracts"] });
      toast.success("Objective updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ========== LEAVE MANAGEMENT ==========
  const leaveTypes = useQuery({
    queryKey: ["leave-types", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_types")
        .select("*")
        .eq("organization_id", orgId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createLeaveType = useMutation({
    mutationFn: async (values: { name: string; description?: string; default_days_per_year?: number; is_paid?: boolean; color?: string }) => {
      const { data, error } = await supabase
        .from("leave_types")
        .insert({ ...values, organization_id: orgId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
      toast.success("Leave type created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const leaveRequests = useQuery({
    queryKey: ["leave-requests", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*, leave_types(name, color)")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createLeaveRequest = useMutation({
    mutationFn: async (values: {
      leave_type_id: string;
      start_date: string;
      end_date: string;
      days_requested: number;
      reason?: string;
    }) => {
      const { data, error } = await supabase
        .from("leave_requests")
        .insert({ ...values, organization_id: orgId!, staff_user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Leave request submitted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateLeaveRequest = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; status: string; rejection_reason?: string }) => {
      const updateData: any = { ...values };
      if (values.status === "approved") {
        updateData.approved_by = user?.id;
        updateData.approved_at = new Date().toISOString();
      }
      const { error } = await supabase.from("leave_requests").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Leave request updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ========== FIELD CHECK-INS ==========
  const checkIns = useQuery({
    queryKey: ["field-check-ins", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("field_check_ins")
        .select("*")
        .eq("organization_id", orgId!)
        .order("checked_in_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createCheckIn = useMutation({
    mutationFn: async (values: {
      latitude: number;
      longitude: number;
      accuracy_meters?: number;
      check_in_type?: string;
      location_name?: string;
      notes?: string;
      beneficiary_id?: string;
      activity_id?: string;
    }) => {
      const { data, error } = await supabase
        .from("field_check_ins")
        .insert({ ...values, organization_id: orgId!, staff_user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-check-ins"] });
      toast.success("Check-in recorded");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const checkOut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("field_check_ins")
        .update({ checked_out_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-check-ins"] });
      toast.success("Checked out");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ========== TASK MANAGEMENT ==========
  const tasks = useQuery({
    queryKey: ["staff-tasks", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_tasks")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createTask = useMutation({
    mutationFn: async (values: {
      title: string;
      description?: string;
      assigned_to?: string;
      priority?: string;
      due_date?: string;
      program_id?: string;
      project_id?: string;
      tags?: string[];
    }) => {
      const { data, error } = await supabase
        .from("staff_tasks")
        .insert({ ...values, organization_id: orgId!, assigned_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-tasks"] });
      toast.success("Task created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; status?: string; priority?: string; title?: string; description?: string; due_date?: string }) => {
      const updateData: any = { ...values };
      if (values.status === "completed") {
        updateData.completed_at = new Date().toISOString();
      }
      const { error } = await supabase.from("staff_tasks").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-tasks"] });
      toast.success("Task updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-tasks"] });
      toast.success("Task deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ========== ORG MEMBERS (for staff selectors) ==========
  const orgMembers = useQuery({
    queryKey: ["org-members-hr", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, role")
        .eq("organization_id", orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Real-time subscriptions for HR tables
  useRealtimeSubscription([
    { table: "staff_performance_contracts", queryKeys: [["hr-contracts", orgId || ""]], orgId, enabled: !!orgId },
    { table: "staff_contract_objectives", queryKeys: [["hr-contracts", orgId || ""]], enabled: !!orgId },
    { table: "leave_requests", queryKeys: [["leave-requests", orgId || ""]], orgId, enabled: !!orgId },
    { table: "staff_check_ins", queryKeys: [["check-ins", orgId || ""]], orgId, enabled: !!orgId },
    { table: "staff_tasks", queryKeys: [["staff-tasks", orgId || ""]], orgId, enabled: !!orgId },
  ]);

  return {
    contracts, createContract, updateContract, createObjective, updateObjective,
    leaveTypes, createLeaveType, leaveRequests, createLeaveRequest, updateLeaveRequest,
    checkIns, createCheckIn, checkOut,
    tasks, createTask, updateTask, deleteTask,
    orgMembers,
  };
}
