import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";
import { FieldDefinition } from "@/components/ProgramFieldBuilder";

export interface Project {
  id: string;
  organization_id: string;
  program_id: string;
  project_code: string | null;
  name: string;
  slug: string;
  description: string | null;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  location: string | null;
  custom_fields: FieldDefinition[];
  custom_data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectFormData {
  program_id: string;
  project_code: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  start_date: string;
  end_date: string;
  budget: number | null;
  location: string;
  custom_fields: FieldDefinition[];
}

export function useProjects(programId?: string) {
  const { currentOrganization } = useOrganization();
  const queryClient = useQueryClient();
  const orgId = currentOrganization?.organization_id;

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects', orgId, programId],
    queryFn: async () => {
      if (!orgId) return [];
      
      let query = supabase
        .from('projects')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      
      if (programId) {
        query = query.eq('program_id', programId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data.map(p => ({
        ...p,
        custom_fields: (p.custom_fields as unknown as FieldDefinition[]) || [],
        custom_data: (p.custom_data as Record<string, unknown>) || {},
      })) as Project[];
    },
    enabled: !!orgId,
  });

  const createMutation = useMutation({
    mutationFn: async (formData: ProjectFormData) => {
      if (!orgId) throw new Error('No organization selected');
      
      const slug = formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const { data, error } = await supabase.from('projects').insert([{
        organization_id: orgId,
        program_id: formData.program_id,
        project_code: formData.project_code || null,
        name: formData.name,
        slug,
        description: formData.description || null,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        budget: formData.budget,
        location: formData.location || null,
        custom_fields: JSON.parse(JSON.stringify(formData.custom_fields)),
      }]).select().single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', orgId] });
      toast.success('Project created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create project: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data: formData }: { id: string; data: ProjectFormData }) => {
      const slug = formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      
      const { error } = await supabase.from('projects').update({
        program_id: formData.program_id,
        project_code: formData.project_code || null,
        name: formData.name,
        slug,
        description: formData.description || null,
        status: formData.status,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        budget: formData.budget,
        location: formData.location || null,
        custom_fields: JSON.parse(JSON.stringify(formData.custom_fields)),
      }).eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', orgId] });
      toast.success('Project updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update project: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', orgId] });
      toast.success('Project deleted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete project: ' + error.message);
    },
  });

  return {
    projects: projects || [],
    isLoading,
    error,
    createProject: createMutation.mutate,
    updateProject: updateMutation.mutate,
    deleteProject: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
