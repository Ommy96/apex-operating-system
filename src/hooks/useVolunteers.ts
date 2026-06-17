import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

export function useVolunteers() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  const { data: volunteers = [], isLoading: loadingVolunteers } = useQuery({
    queryKey: ["volunteers", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("volunteers")
        .select("*")
        .eq("organization_id", orgId!)
        .or("is_deleted.is.null,is_deleted.eq.false")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["volunteer-assignments", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("volunteer_assignments")
        .select("*, volunteers(full_name)")
        .eq("organization_id", orgId!)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: hoursLog = [], isLoading: loadingHours } = useQuery({
    queryKey: ["volunteer-hours", orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("volunteer_hours")
        .select("*, volunteers(full_name)")
        .eq("organization_id", orgId!)
        .order("log_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createVolunteer = useMutation({
    mutationFn: async (vol: { full_name: string; email?: string; phone?: string; skills?: string[]; availability?: string; start_date?: string; notes?: string }) => {
      const { error } = await supabase.from("volunteers").insert({ organization_id: orgId!, created_by: user?.id, ...vol });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["volunteers"] }); toast.success("Volunteer added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const createAssignment = useMutation({
    mutationFn: async (a: { volunteer_id: string; role_title: string; start_date: string; program_id?: string; description?: string; supervisor_name?: string }) => {
      const { error } = await supabase.from("volunteer_assignments").insert({ organization_id: orgId!, ...a });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["volunteer-assignments"] }); toast.success("Assignment created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const logHours = useMutation({
    mutationFn: async (h: { volunteer_id: string; log_date: string; hours: number; description?: string; assignment_id?: string }) => {
      const { error } = await supabase.from("volunteer_hours").insert({ organization_id: orgId!, ...h });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["volunteer-hours"] }); toast.success("Hours logged"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteVolunteer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("volunteers")
        .update({ is_deleted: true, deleted_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["volunteers"] });
      toast.success("Volunteer deleted", {
        action: {
          label: "Undo",
          onClick: async () => {
            await supabase
              .from("volunteers")
              .update({ is_deleted: false, deleted_at: null } as any)
              .eq("id", id);
            queryClient.invalidateQueries({ queryKey: ["volunteers"] });
            toast.success("Volunteer restored");
          },
        },
        duration: 10_000,
      });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalHours = hoursLog.reduce((sum, h) => sum + Number(h.hours || 0), 0);

  // Real-time subscriptions
  useRealtimeSubscription([
    { table: "volunteers", queryKeys: [["volunteers", orgId || ""]], orgId, enabled: !!orgId },
    { table: "volunteer_assignments", queryKeys: [["volunteer-assignments", orgId || ""]], orgId, enabled: !!orgId },
    { table: "volunteer_hours", queryKeys: [["volunteer-hours", orgId || ""]], orgId, enabled: !!orgId },
  ]);

  return {
    volunteers, assignments, hoursLog,
    loadingVolunteers, loadingAssignments, loadingHours,
    createVolunteer, createAssignment, logHours, deleteVolunteer,
    totalHours,
  };
}
