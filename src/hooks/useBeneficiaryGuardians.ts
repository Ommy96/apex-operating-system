import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface BeneficiaryGuardian {
  id: string;
  full_name: string;
  guardian_type: string | null;
  phone: string | null;
  email: string | null;
  national_id: string | null;
  age: number | null;
  is_alive: boolean | null;
  employment_type: string | null;
  source_of_income: string | null;
  address: string | null;
  employment_details: string | null;
  date_of_death: string | null;
  created_at: string | null;
  relationship: string | null;
  is_primary: boolean;
  linkId: string;
}

export function useBeneficiaryGuardians(beneficiaryId: string | undefined) {
  return useQuery({
    queryKey: ['beneficiary-guardians', beneficiaryId],
    queryFn: async (): Promise<BeneficiaryGuardian[]> => {
      if (!beneficiaryId) return [];
      const { data, error } = await supabase
        .from('beneficiary_guardians')
        .select(`
          id, relationship, is_primary,
          guardians (
            id, full_name, guardian_type, phone, email, national_id,
            age, is_alive, employment_type,
            source_of_income, address, employment_details,
            date_of_death, created_at
          )
        `)
        .eq('beneficiary_id', beneficiaryId)
        .order('is_primary', { ascending: false })
        .order('created_at', { foreignTable: 'guardians', ascending: false });
      if (error) {
        logger.error('Failed to load guardians', error);
        throw error;
      }
      return (data || [])
        .filter((row: any) => row.guardians)
        .map((row: any) => ({
          ...row.guardians,
          relationship: row.relationship,
          is_primary: !!row.is_primary,
          linkId: row.id,
        }));
    },
    enabled: !!beneficiaryId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}