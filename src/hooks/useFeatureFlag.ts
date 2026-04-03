import { useQuery } from '@tanstack/react-query';
import { useOrganization } from './useOrganization';

export function useFeatureFlag(flagName: string): { enabled: boolean; loading: boolean } {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const { data: features, isLoading } = useQuery({
    queryKey: ['org-features', orgId],
    queryFn: async () => {
      // Features are stored in the organization record fetched by useOrganization
      // We access them from the currentOrganization context
      return {};
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000,
  });

  // Read from the organization's features_enabled JSONB
  const orgFeatures = (currentOrganization as any)?.features_enabled;
  const enabled = orgFeatures?.[flagName] === true || orgFeatures?.[flagName] === 'true';

  return { enabled, loading: isLoading };
}
