import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useDonorPortal() {
  const { user } = useAuth();

  const { data: donorAccount, isLoading: accountLoading } = useQuery({
    queryKey: ['donor-account', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('donor_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: sponsoredBeneficiaries, isLoading: beneficiariesLoading } = useQuery({
    queryKey: ['donor-beneficiaries', donorAccount?.id, donorAccount?.donor_name, donorAccount?.organization_id],
    queryFn: async () => {
      if (!donorAccount) return [];
      const { data, error } = await supabase
        .from('beneficiary_donors')
        .select(`
          id,
          amount_received,
          donation_date,
          notes,
          program_id,
          beneficiary:beneficiaries!beneficiary_donors_beneficiary_id_fkey(
            id, display_name, first_name, last_name, photo_url,
            beneficiary_type, gender, grade, academic_level,
            institution_name, status, date_of_birth, county
          )
        `)
        .eq('donor_name', donorAccount.donor_name)
        .eq('organization_id', donorAccount.organization_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!donorAccount,
  });

  const { data: donorDocuments, isLoading: documentsLoading } = useQuery({
    queryKey: ['donor-documents', donorAccount?.organization_id],
    queryFn: async () => {
      if (!donorAccount) return [];
      const { data, error } = await supabase
        .from('managed_documents')
        .select('*')
        .eq('organization_id', donorAccount.organization_id)
        .eq('donor_visible', true)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!donorAccount,
  });

  const fetchBeneficiaryAcademics = async (beneficiaryId: string) => {
    const { data, error } = await supabase
      .from('beneficiary_academics')
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .order('academic_year', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const fetchBeneficiaryProgression = async (beneficiaryId: string) => {
    const { data, error } = await supabase
      .from('beneficiary_progression_history')
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .order('progression_date', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const fetchBeneficiaryUpdates = async (beneficiaryId: string) => {
    const { data, error } = await supabase
      .from('sponsorship_updates' as any)
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .eq('visible_to_donor', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const getDocumentDownloadUrl = async (fileUrl: string) => {
    const path = fileUrl.replace(/^.*\/managed-documents\//, '');
    const { data } = await supabase.storage
      .from('managed-documents')
      .createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  };

  return {
    donorAccount,
    sponsoredBeneficiaries,
    donorDocuments,
    fetchBeneficiaryAcademics,
    fetchBeneficiaryProgression,
    fetchBeneficiaryUpdates,
    getDocumentDownloadUrl,
    isLoading: accountLoading || beneficiariesLoading,
    documentsLoading,
    isDonor: !!donorAccount,
  };
}
