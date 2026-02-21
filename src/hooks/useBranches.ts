import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export function useBranches() {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  const { data: regions = [], isLoading: loadingRegions } = useQuery({
    queryKey: ["regions", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("regions").select("*").eq("organization_id", orgId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ["branches", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("*, regions(name)").eq("organization_id", orgId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: branchStaff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ["branch-staff", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("branch_staff").select("*, branches(name)").eq("organization_id", orgId!).order("assigned_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createRegion = useMutation({
    mutationFn: async (r: { name: string; description?: string; country?: string; county?: string }) => {
      const { error } = await supabase.from("regions").insert({ organization_id: orgId!, ...r });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["regions"] }); toast.success("Region created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const createBranch = useMutation({
    mutationFn: async (b: { name: string; code?: string; region_id?: string; address?: string; phone?: string; email?: string; manager_name?: string }) => {
      const { error } = await supabase.from("branches").insert({ organization_id: orgId!, ...b });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["branches"] }); toast.success("Branch created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const assignStaff = useMutation({
    mutationFn: async (s: { branch_id: string; user_id: string; role?: string; is_primary?: boolean }) => {
      const { error } = await supabase.from("branch_staff").insert({ organization_id: orgId!, ...s });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["branch-staff"] }); toast.success("Staff assigned"); },
    onError: (e: any) => toast.error(e.message),
  });

  return { regions, branches, branchStaff, loadingRegions, loadingBranches, loadingStaff, createRegion, createBranch, assignStaff };
}
