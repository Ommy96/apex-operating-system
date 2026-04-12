import { useQuery } from '@tanstack/react-query';
import { useOrganization } from './useOrganization';
import { supabase } from '@/integrations/supabase/client';

const ENTERPRISE_ONLY_FLAGS = ['ai_insights', 'multi_branch', 'whatsapp_integration', 'dhis2_integration', 'kobo_integration'];

export function useOrgPlanData() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const { data, isLoading } = useQuery({
    queryKey: ['org-plan-data', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('is_partner, subscription_tier, features_enabled, plan_override, partner_granted_at')
        .eq('id', orgId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  return { planData: data, isLoading };
}

export function useFeatureFlag(flagName: string): { enabled: boolean; loading: boolean } {
  const { planData, isLoading } = useOrgPlanData();

  if (isLoading) return { enabled: false, loading: true };
  if (!planData) return { enabled: false, loading: false };

  // Partners get everything
  if (planData.is_partner === true) return { enabled: true, loading: false };

  const tier = (planData.subscription_tier as string) || 'free';

  // Enterprise gets everything
  if (tier === 'enterprise') return { enabled: true, loading: false };

  // Professional gets most features except enterprise-only
  if (tier === 'professional' && !ENTERPRISE_ONLY_FLAGS.includes(flagName)) {
    return { enabled: true, loading: false };
  }

  // Free/starter: check features_enabled JSONB
  const orgFeatures = (planData.features_enabled as Record<string, unknown>) || {};
  const enabled = orgFeatures[flagName] === true || orgFeatures[flagName] === 'true';
  return { enabled, loading: false };
}
