import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Count of distinct ACTIVE beneficiaries enrolled in a single project.
 * Source: beneficiary_services (NEVER count from beneficiaries directly
 * for a project/program context).
 */
export function useProjectBeneficiaryCount(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-beneficiary-count', projectId],
    queryFn: async () => {
      if (!projectId) return 0;
      const { data, error } = await supabase
        .from('beneficiary_services')
        .select('beneficiary_id')
        .eq('project_id', projectId)
        .eq('status', 'active');
      if (error) throw error;
      const unique = new Set((data || []).map((r: any) => r.beneficiary_id));
      return unique.size;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Count of distinct ACTIVE beneficiaries enrolled in a program (across all
 * its projects).
 */
export function useProgramBeneficiaryCount(programId: string | undefined) {
  return useQuery({
    queryKey: ['program-beneficiary-count', programId],
    queryFn: async () => {
      if (!programId) return 0;
      const { data, error } = await supabase
        .from('beneficiary_services')
        .select('beneficiary_id')
        .eq('program_id', programId)
        .eq('status', 'active');
      if (error) throw error;
      const unique = new Set((data || []).map((r: any) => r.beneficiary_id));
      return unique.size;
    },
    enabled: !!programId,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Batch loader: distinct active beneficiary count per project, returned as
 * a `{ [projectId]: count }` map. Use when rendering a list of project cards.
 */
export function useProjectBeneficiaryCounts(projectIds: string[]) {
  const key = projectIds.slice().sort().join(',');
  return useQuery({
    queryKey: ['project-beneficiary-counts-batch', key],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const id of projectIds) counts[id] = 0;
      if (!projectIds.length) return counts;
      const { data, error } = await supabase
        .from('beneficiary_services')
        .select('project_id, beneficiary_id')
        .in('project_id', projectIds)
        .eq('status', 'active');
      if (error) throw error;
      const seen: Record<string, Set<string>> = {};
      for (const row of (data || []) as { project_id: string; beneficiary_id: string }[]) {
        if (!row.project_id) continue;
        if (!seen[row.project_id]) seen[row.project_id] = new Set();
        seen[row.project_id].add(row.beneficiary_id);
      }
      for (const [pid, set] of Object.entries(seen)) counts[pid] = set.size;
      return counts;
    },
    enabled: projectIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}