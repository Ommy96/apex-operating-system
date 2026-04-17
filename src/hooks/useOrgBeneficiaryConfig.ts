import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from './useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export type OrgType =
  | 'education'
  | 'health'
  | 'livelihood'
  | 'disaster_response'
  | 'refugee'
  | 'elderly'
  | 'disability'
  | 'child_welfare'
  | 'general'
  | 'other';

export interface OrgBeneficiaryConfig {
  id: string;
  org_id: string;
  org_type: OrgType;
  collect_education_data: boolean;
  collect_health_data: boolean;
  collect_economic_data: boolean;
  collect_household_data: boolean;
  collect_religion: boolean;
  collect_hiv_status: boolean;
  collect_nutritional_status: boolean;
  collect_disability_details: boolean;
  custom_fields: any[];
  beneficiary_terminology: string;
  beneficiary_terminology_plural?: string | null;
  custom_vulnerability_tags?: string[] | null;
}

const DEFAULT_CONFIG: Partial<OrgBeneficiaryConfig> = {
  org_type: 'general',
  collect_education_data: true,
  collect_health_data: true,
  collect_economic_data: false,
  collect_household_data: true,
  collect_religion: true,
  collect_hiv_status: false,
  collect_nutritional_status: false,
  collect_disability_details: false,
  custom_fields: [],
  beneficiary_terminology: 'Beneficiary',
};

export function useOrgBeneficiaryConfig() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const query = useQuery({
    queryKey: ['org-beneficiary-config', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('org_beneficiary_config' as any)
        .select('*')
        .eq('org_id', orgId)
        .maybeSingle();

      if (error) {
        logger.error('Failed to load org beneficiary config', error);
        return { ...DEFAULT_CONFIG, org_id: orgId } as OrgBeneficiaryConfig;
      }
      if (!data) return { ...DEFAULT_CONFIG, org_id: orgId } as OrgBeneficiaryConfig;
      return data as unknown as OrgBeneficiaryConfig;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    config: query.data ?? ({ ...DEFAULT_CONFIG, org_id: orgId ?? '' } as OrgBeneficiaryConfig),
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useInvalidateOrgBeneficiaryConfig() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  return () =>
    qc.invalidateQueries({
      queryKey: ['org-beneficiary-config', currentOrganization?.organization_id],
    });
}
