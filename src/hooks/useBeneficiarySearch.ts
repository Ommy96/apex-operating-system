import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

/**
 * Definitive beneficiary search.
 *
 * Returns ALL beneficiaries in the org regardless of category, type, age or
 * household status. The only filters applied are:
 *   - same organization
 *   - not soft-deleted
 *   - not explicitly deactivated (is_active = true OR NULL)
 *
 * Use this hook everywhere a user picks a beneficiary (relationships,
 * household formation, sibling selectors, etc.) so children registered under
 * the legacy "student" model still show up.
 */
export interface BeneficiarySearchResult {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  county: string | null;
  sub_county: string | null;
  household_id: string | null;
  unique_id: string | null;
  beneficiary_category: string | null;
  photo_url: string | null;
  is_active: boolean | null;
}

export async function searchBeneficiaries(
  searchTerm: string,
  orgId: string,
  excludeIds: string[] = [],
  limit = 15,
): Promise<BeneficiarySearchResult[]> {
  const term = (searchTerm || '').trim().replace(/[%,]/g, '');
  if (term.length < 2) return [];

  let query = supabase
    .from('beneficiaries')
    .select(
      'id, display_name, first_name, last_name, date_of_birth, gender, county, sub_county, household_id, unique_id, beneficiary_category, photo_url, is_active',
    )
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .or('is_active.is.null,is_active.eq.true')
    .or(
      [
        `display_name.ilike.%${term}%`,
        `first_name.ilike.%${term}%`,
        `last_name.ilike.%${term}%`,
        `unique_id.ilike.%${term}%`,
      ].join(','),
    )
    .limit(limit);

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data as BeneficiarySearchResult[]) || [];
}

export function useBeneficiarySearch(excludeIds: string[] = [], limit = 15) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const excludeKey = excludeIds.slice().sort().join(',');

  const { data: results = [], isLoading, isFetching } = useQuery({
    queryKey: ['beneficiary-search', orgId, debouncedTerm, excludeKey],
    queryFn: async () => {
      if (!orgId) return [] as BeneficiarySearchResult[];
      return searchBeneficiaries(debouncedTerm, orgId, excludeIds, limit);
    },
    enabled: !!orgId && debouncedTerm.length >= 2,
    staleTime: 30 * 1000,
  });

  return { searchTerm, setSearchTerm, debouncedTerm, results, isLoading, isFetching };
}