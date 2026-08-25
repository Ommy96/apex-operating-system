import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

const sb = supabase as any;

export type SponsorshipFundingModel = 'direct_attribution' | 'pooled';

export const FUNDING_MODEL_LABELS: Record<SponsorshipFundingModel, string> = {
  direct_attribution: 'Direct attribution',
  pooled: 'Pooled (community benefit)',
};

export const FUNDING_MODEL_HELP: Record<SponsorshipFundingModel, string> = {
  direct_attribution: "A sponsor's payments allocate to their own beneficiary's needs.",
  pooled: 'Sponsorship payments credit the programme pool; the sponsor–child link is relational only.',
};

/** Donor-facing copy — never imply direct attribution when pooling. */
export function donorSupportCopy(
  model: SponsorshipFundingModel,
  programmeName: string | null | undefined,
  childName: string | null | undefined,
) {
  const programme = programmeName || 'programme';
  const child = childName || 'your sponsored child';
  return model === 'pooled'
    ? `Your support funds the ${programme} programme, which supports ${child} and others in their community.`
    : `Your support is allocated directly to ${child}'s recorded needs.`;
}

export function useFundingModel() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();

  const query = useQuery({
    enabled: !!orgId,
    queryKey: ['org-funding-model', orgId],
    staleTime: 60_000,
    queryFn: async (): Promise<SponsorshipFundingModel> => {
      const { data, error } = await sb
        .from('organizations')
        .select('sponsorship_funding_model')
        .eq('id', orgId)
        .maybeSingle();
      if (error) throw error;
      return (data?.sponsorship_funding_model as SponsorshipFundingModel) || 'direct_attribution';
    },
  });

  const setModel = useMutation({
    mutationFn: async (model: SponsorshipFundingModel) => {
      if (!orgId) throw new Error('No organization context');
      const { error } = await sb
        .from('organizations')
        .update({ sponsorship_funding_model: model })
        .eq('id', orgId);
      if (error) throw error;
      return model;
    },
    onSuccess: (model) => {
      qc.invalidateQueries({ queryKey: ['org-funding-model'] });
      toast.success(`Funding model set to ${FUNDING_MODEL_LABELS[model]}`);
    },
    onError: (e: any) => toast.error(e.message || 'Could not update funding model'),
  });

  return {
    model: query.data ?? 'direct_attribution',
    isPooled: (query.data ?? 'direct_attribution') === 'pooled',
    isLoading: query.isLoading,
    setModel,
  };
}
