import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export interface NeedType {
  id: string;
  organization_id: string;
  key: string;
  label: string;
  description: string | null;
  default_cost: number | null;
  default_currency: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface BeneficiaryNeed {
  id: string;
  organization_id: string;
  beneficiary_id: string;
  need_type_id: string;
  status: 'unmet' | 'partially_met' | 'met';
  estimated_cost: number | null;
  currency: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes: string | null;
  met_by_project_id: string | null;
  met_by_sponsorship_id: string | null;
  status_source: 'auto' | 'manual';
  manual_status_note: string | null;
  funded_amount: number;
  need_type?: NeedType;
}

export function useNeedTypes(includeInactive = false) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ['need-types', orgId, includeInactive],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase.from('need_types' as any).select('*').eq('organization_id', orgId!).order('sort_order').order('label');
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as NeedType[];
    },
  });
}

export function useSaveNeedType() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useMutation({
    mutationFn: async (t: Partial<NeedType> & { id?: string }) => {
      const payload: any = { ...t, organization_id: orgId };
      if (t.id) {
        const { data, error } = await supabase
          .from('need_types' as any)
          .update(payload)
          .eq('id', t.id)
          .select('*')
          .maybeSingle();
        if (error) throw error;
        return data as unknown as NeedType;
      } else {
        const { data, error } = await supabase
          .from('need_types' as any)
          .insert(payload)
          .select('*')
          .single();
        if (error) throw error;
        return data as unknown as NeedType;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['need-types'] }),
  });
}

export function useDeleteNeedType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('need_types' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['need-types'] }),
  });
}

export function useBeneficiaryNeeds(beneficiaryId: string | undefined) {
  return useQuery({
    queryKey: ['beneficiary-needs', beneficiaryId],
    enabled: !!beneficiaryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiary_needs' as any)
        .select('*, need_type:need_types(*)')
        .eq('beneficiary_id', beneficiaryId!)
        .order('created_at');
      if (error) throw error;
      return (data || []) as unknown as BeneficiaryNeed[];
    },
  });
}

export function useSaveBeneficiaryNeed() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useMutation({
    mutationFn: async (n: Partial<BeneficiaryNeed> & { id?: string; beneficiary_id: string; need_type_id: string }) => {
      const payload: any = { ...n, organization_id: orgId };
      delete payload.need_type;
      if (n.id) {
        const { error } = await supabase.from('beneficiary_needs' as any).update(payload).eq('id', n.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('beneficiary_needs' as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['beneficiary-needs', v.beneficiary_id] }),
  });
}

export function useDeleteBeneficiaryNeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; beneficiary_id: string }) => {
      const { error } = await supabase.from('beneficiary_needs' as any).delete().eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['beneficiary-needs', v.beneficiary_id] }),
  });
}

/**
 * Clear a manual override on a need so its status is derived automatically again.
 * Immediately recomputes the derived status via the recompute_need_status RPC.
 */
export function useReturnNeedToAuto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; beneficiary_id: string }) => {
      const { error } = await supabase
        .from('beneficiary_needs' as any)
        .update({ status_source: 'auto', manual_status_note: null } as any)
        .eq('id', p.id);
      if (error) throw error;
      // Trigger on the update fires recompute automatically, but call RPC as belt-and-braces.
      await supabase.rpc('recompute_need_status' as any, { p_beneficiary_id: p.beneficiary_id });
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['beneficiary-needs', v.beneficiary_id] }),
  });
}