import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useOrganization } from "./useOrganization";
import { toast } from "sonner";

export interface StakeholderAccess {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  stakeholder_type: string;
  access_level: string;
  allowed_program_ids: string[] | null;
  allowed_grant_ids: string[] | null;
  can_view_beneficiary_data: boolean;
  can_download_reports: boolean;
  access_token: string;
  token_expires_at: string | null;
  last_accessed_at: string | null;
  is_active: boolean;
  created_at: string;
}

function genToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function useStakeholderAccessList() {
  const { currentOrganization } = useOrganization();
  return useQuery({
    queryKey: ["stakeholder-access", currentOrganization?.organization_id],
    enabled: !!currentOrganization?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stakeholder_access")
        .select("*")
        .eq("organization_id", currentOrganization!.organization_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as StakeholderAccess[];
    },
  });
}

export function useCreateStakeholderAccess() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  return useMutation({
    mutationFn: async (input: Partial<StakeholderAccess> & { email: string; full_name: string }) => {
      if (!currentOrganization?.organization_id) throw new Error("No organization");
      const payload = {
        organization_id: currentOrganization.organization_id,
        email: input.email,
        full_name: input.full_name,
        stakeholder_type: input.stakeholder_type ?? "donor",
        access_level: input.access_level ?? "summary",
        allowed_program_ids: input.allowed_program_ids ?? null,
        allowed_grant_ids: input.allowed_grant_ids ?? null,
        can_view_beneficiary_data: input.can_view_beneficiary_data ?? false,
        can_download_reports: input.can_download_reports ?? false,
        access_token: genToken(),
        token_expires_at: input.token_expires_at ?? null,
        is_active: true,
        created_by: user?.id,
        updated_by: user?.id,
      };
      const { data, error } = await supabase
        .from("stakeholder_access")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data as StakeholderAccess;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stakeholder-access"] });
      toast.success("Stakeholder access created");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to create access"),
  });
}

export function useUpdateStakeholderAccess() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<StakeholderAccess> & { id: string }) => {
      const { data, error } = await supabase
        .from("stakeholder_access")
        .update({ ...patch, updated_by: user?.id })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stakeholder-access"] });
      toast.success("Updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Update failed"),
  });
}

export function useRevokeStakeholderAccess() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("stakeholder_access")
        .update({ is_active: false, updated_by: user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stakeholder-access"] });
      toast.success("Access revoked");
    },
  });
}

export function useStakeholderPortal(token: string | undefined) {
  return useQuery({
    queryKey: ["stakeholder-portal", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_stakeholder_portal_data", { _token: token! });
      if (error) throw error;
      return data as any;
    },
  });
}