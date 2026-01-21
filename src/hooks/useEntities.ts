import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export interface Entity {
  id: string;
  organization_id: string;
  entity_type_id: string;
  display_name: string;
  data: Record<string, unknown>;
  status: string;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntityFormData {
  display_name: string;
  data: Record<string, unknown>;
  status: string;
  tags: string[];
}

export function useEntities(entityTypeId?: string) {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  const { data: entities, isLoading, error } = useQuery({
    queryKey: ['entities', orgId, entityTypeId],
    queryFn: async () => {
      if (!orgId || !entityTypeId) return [];
      
      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .eq('organization_id', orgId)
        .eq('entity_type_id', entityTypeId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(e => ({
        ...e,
        data: (e.data as Record<string, unknown>) || {},
        tags: e.tags || [],
      })) as Entity[];
    },
    enabled: !!orgId && !!entityTypeId,
  });

  const createMutation = useMutation({
    mutationFn: async (formData: EntityFormData) => {
      if (!orgId || !entityTypeId) throw new Error('Missing organization or entity type');
      
      const { data, error } = await supabase.from('entities').insert([{
        organization_id: orgId,
        entity_type_id: entityTypeId,
        display_name: formData.display_name,
        data: JSON.parse(JSON.stringify(formData.data)),
        status: formData.status,
        tags: formData.tags,
      }]).select().single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', orgId, entityTypeId] });
      toast.success('Record created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create record: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data: formData }: { id: string; data: EntityFormData }) => {
      const { error } = await supabase.from('entities').update({
        display_name: formData.display_name,
        data: JSON.parse(JSON.stringify(formData.data)),
        status: formData.status,
        tags: formData.tags,
      }).eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', orgId, entityTypeId] });
      toast.success('Record updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update record: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('entities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities', orgId, entityTypeId] });
      toast.success('Record deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete record: ' + error.message);
    },
  });

  // Get stats for entities
  const { data: stats } = useQuery({
    queryKey: ['entities-stats', orgId, entityTypeId],
    queryFn: async () => {
      if (!orgId || !entityTypeId) return { total: 0, active: 0, inactive: 0 };
      
      const { data, error } = await supabase
        .from('entities')
        .select('status')
        .eq('organization_id', orgId)
        .eq('entity_type_id', entityTypeId);
      
      if (error) throw error;
      
      const total = data.length;
      const active = data.filter(e => e.status === 'active').length;
      const inactive = total - active;
      
      return { total, active, inactive };
    },
    enabled: !!orgId && !!entityTypeId,
  });

  return {
    entities: entities || [],
    stats: stats || { total: 0, active: 0, inactive: 0 },
    isLoading,
    error,
    createEntity: createMutation.mutate,
    updateEntity: updateMutation.mutate,
    deleteEntity: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
