import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface ChildForLinking {
  id: string;
  student_id: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: string | null;
  academic_level: string | null;
  institution_name: string | null;
}

export function useBeneficiaryLinking(searchTerm: string, enabled: boolean = true) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const { data: children, isLoading, error } = useQuery({
    queryKey: ['children-for-linking', orgId, searchTerm],
    queryFn: async () => {
      if (!orgId) return [];
      
      // If search term is empty, fetch recent children
      if (!searchTerm.trim()) {
        const { data, error } = await supabase
          .from('children')
          .select('id, student_id, first_name, last_name, gender, academic_level, institution_name')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) throw error;
        return (data || []).map(c => ({
          ...c,
          full_name: `${c.first_name} ${c.last_name}`,
        })) as ChildForLinking[];
      }

      // Use the search function
      const { data, error } = await supabase.rpc('search_children_for_linking', {
        _org_id: orgId,
        _search_term: searchTerm.trim(),
      });
      
      if (error) throw error;
      return (data || []) as ChildForLinking[];
    },
    enabled: !!orgId && enabled,
    staleTime: 10000, // Cache for 10 seconds
  });

  return {
    children: children || [],
    isLoading,
    error,
  };
}

export function useUniqueBeneficiaryCount() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const { data: count, isLoading, error, refetch } = useQuery({
    queryKey: ['unique-beneficiary-count', orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      
      const { data, error } = await supabase.rpc('get_unique_beneficiary_count', {
        _org_id: orgId,
      });
      
      if (error) throw error;
      return data as number;
    },
    enabled: !!orgId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  return {
    uniqueCount: count || 0,
    isLoading,
    error,
    refetch,
  };
}
