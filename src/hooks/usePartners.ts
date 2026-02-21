import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export function usePartners() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  const { data: partners = [], isLoading: loadingPartners } = useQuery({
    queryKey: ["partners", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_organizations").select("*").eq("organization_id", orgId!).order("partner_name");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: sharedResources = [], isLoading: loadingResources } = useQuery({
    queryKey: ["partner-resources", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_shared_resources").select("*, partner_organizations(partner_name)").eq("organization_id", orgId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: jointActivities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ["partner-activities", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_activities").select("*, partner_organizations(partner_name)").eq("organization_id", orgId!).order("activity_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const createPartner = useMutation({
    mutationFn: async (p: { partner_name: string; partner_type?: string; contact_person?: string; contact_email?: string; contact_phone?: string; website?: string; description?: string; country?: string; partnership_start?: string }) => {
      const { error } = await supabase.from("partner_organizations").insert({ organization_id: orgId!, created_by: user?.id, ...p });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["partners"] }); toast.success("Partner added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const createResource = useMutation({
    mutationFn: async (r: { partner_id: string; resource_type: string; title: string; description?: string; value_amount?: number; direction?: string }) => {
      const { error } = await supabase.from("partner_shared_resources").insert({ organization_id: orgId!, ...r });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["partner-resources"] }); toast.success("Resource added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const createActivity = useMutation({
    mutationFn: async (a: { partner_id: string; title: string; description?: string; activity_date?: string; location?: string; participants_count?: number }) => {
      const { error } = await supabase.from("partner_activities").insert({ organization_id: orgId!, created_by: user?.id, ...a });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["partner-activities"] }); toast.success("Activity created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const totalResourceValue = sharedResources.reduce((sum, r) => sum + Number(r.value_amount || 0), 0);

  return { partners, sharedResources, jointActivities, loadingPartners, loadingResources, loadingActivities, createPartner, createResource, createActivity, totalResourceValue };
}
