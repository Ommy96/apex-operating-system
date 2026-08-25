import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export type InterestKind = 'hobby' | 'interest';

export interface InterestType {
  id: string;
  organization_id: string;
  kind: InterestKind;
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

/** Per-org catalogue of hobbies / interests. Free entry is always allowed on top of this. */
export function useInterestTypes(kind?: InterestKind, includeInactive = false) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ['interest-types', orgId, kind ?? 'all', includeInactive],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      let q = (supabase as any)
        .from('interest_types')
        .select('*')
        .eq('organization_id', orgId!)
        .order('sort_order')
        .order('label');
      if (kind) q = q.eq('kind', kind);
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as InterestType[];
    },
  });
}

export function useSaveInterestType() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useMutation({
    mutationFn: async (t: Partial<InterestType> & { id?: string }) => {
      const payload: any = { ...t, organization_id: orgId };
      const q = t.id
        ? (supabase as any).from('interest_types').update(payload).eq('id', t.id).select('*').maybeSingle()
        : (supabase as any).from('interest_types').insert(payload).select('*').single();
      const { data, error } = await q;
      if (error) throw error;
      return data as InterestType;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['interest-types'] }),
  });
}

export function useDeleteInterestType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('interest_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['interest-types'] }),
  });
}
