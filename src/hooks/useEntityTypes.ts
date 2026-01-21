import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { FieldDefinition } from "@/components/ProgramFieldBuilder";

export interface EntityType {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  field_schema: FieldDefinition[];
  settings: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EntityTypeFormData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  field_schema: FieldDefinition[];
  settings: Record<string, unknown>;
  is_active: boolean;
}

export function useEntityTypes() {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  const { data: entityTypes, isLoading, error } = useQuery({
    queryKey: ['entity-types', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('entity_types')
        .select('*')
        .eq('organization_id', orgId)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data.map(et => ({
        ...et,
        field_schema: (et.field_schema as unknown as FieldDefinition[]) || [],
        settings: (et.settings as Record<string, unknown>) || {},
      })) as EntityType[];
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async (formData: EntityTypeFormData) => {
      if (!orgId) throw new Error('No organization selected');
      
      const { data, error } = await supabase.from('entity_types').insert([{
        organization_id: orgId,
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        icon: formData.icon,
        color: formData.color,
        field_schema: JSON.parse(JSON.stringify(formData.field_schema)),
        settings: JSON.parse(JSON.stringify(formData.settings)),
        is_active: formData.is_active,
      }]).select().single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-types', orgId] });
      toast.success('Entity type created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create entity type: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data: formData }: { id: string; data: EntityTypeFormData }) => {
      const { error } = await supabase.from('entity_types').update({
        name: formData.name,
        slug: formData.slug,
        description: formData.description || null,
        icon: formData.icon,
        color: formData.color,
        field_schema: JSON.parse(JSON.stringify(formData.field_schema)),
        settings: JSON.parse(JSON.stringify(formData.settings)),
        is_active: formData.is_active,
      }).eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-types', orgId] });
      toast.success('Entity type updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update entity type: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('entity_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entity-types', orgId] });
      toast.success('Entity type deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete entity type: ' + error.message);
    },
  });

  return {
    entityTypes: entityTypes || [],
    isLoading,
    error,
    createEntityType: createMutation.mutate,
    updateEntityType: updateMutation.mutate,
    deleteEntityType: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
