import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient, useMutation } from '@tanstack/react-query';

export function useDonorPortal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const commonOpts = {
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  } as const;

  const { data: donorAccount, isLoading: accountLoading, dataUpdatedAt: accountUpdatedAt } = useQuery({
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
    ...commonOpts,
  });

  const { data: sponsoredBeneficiaries, isLoading: beneficiariesLoading, dataUpdatedAt: beneficiariesUpdatedAt } = useQuery({
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
    ...commonOpts,
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
    ...commonOpts,
  });

  // Allocations tied to this donor account (Impact Allocation Engine)
  const { data: donorAllocations, isLoading: allocationsLoading, dataUpdatedAt: allocationsUpdatedAt } = useQuery({
    queryKey: ['donor-allocations', donorAccount?.id],
    queryFn: async () => {
      if (!donorAccount?.id) return [];
      const { data, error } = await supabase
        .from('allocations')
        .select(`
          id, scope, status, amount_native, native_currency,
          amount_base, base_currency, fx_rate, fx_at, allocated_at,
          beneficiary:beneficiaries!allocations_beneficiary_id_fkey(id, display_name, photo_url),
          project:projects!allocations_project_id_fkey(id, name),
          program:programs!allocations_program_id_fkey(id, name)
        `)
        .eq('donor_account_id', donorAccount.id)
        .order('allocated_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!donorAccount?.id,
    ...commonOpts,
  });

  // Live donor pool balances (unallocated funds per scope)
  const { data: donorPools } = useQuery({
    queryKey: ['donor-pools', donorAccount?.id],
    queryFn: async () => {
      if (!donorAccount?.id) return [];
      const { data, error } = await supabase
        .from('donor_pools')
        .select(`
          id, scope, currency, balance_native, balance_base,
          scope_beneficiary_id, scope_project_id, scope_program_id,
          beneficiary:beneficiaries!donor_pools_scope_beneficiary_id_fkey(display_name),
          project:projects!donor_pools_scope_project_id_fkey(name),
          program:programs!donor_pools_scope_program_id_fkey(name)
        `)
        .eq('donor_account_id', donorAccount.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!donorAccount?.id,
    ...commonOpts,
  });

  // Impact stories for beneficiaries this donor sponsors
  const { data: impactStories, isLoading: storiesLoading } = useQuery({
    queryKey: ['donor-impact-stories', donorAccount?.organization_id, donorAccount?.id],
    queryFn: async () => {
      if (!donorAccount?.id) return [];
      const sponsoredIds = (sponsoredBeneficiaries || [])
        .map((bd: any) => bd.beneficiary?.id)
        .filter(Boolean);
      if (sponsoredIds.length === 0) return [];
      const { data, error } = await supabase
        .from('impact_stories')
        .select('id, title, story_text, theme, tags, photo_urls, published_at, beneficiary_id, project_id')
        .eq('org_id', donorAccount.organization_id)
        .eq('status', 'published')
        .is('deleted_at', null)
        .in('beneficiary_id', sponsoredIds)
        .order('published_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!donorAccount?.id && !!sponsoredBeneficiaries,
    ...commonOpts,
  });

  // Preferred currency mutation
  const updatePreferredCurrency = useMutation({
    mutationFn: async (currency: string) => {
      if (!donorAccount?.id) throw new Error('no_donor_account');
      const { error } = await supabase
        .from('donor_accounts')
        .update({ preferred_currency: currency })
        .eq('id', donorAccount.id);
      if (error) throw error;
      return currency;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donor-account'] });
    },
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
    donorAllocations,
    donorPools,
    impactStories,
    updatePreferredCurrency,
    fetchBeneficiaryAcademics,
    fetchBeneficiaryProgression,
    fetchBeneficiaryUpdates,
    getDocumentDownloadUrl,
    isLoading: accountLoading || beneficiariesLoading,
    documentsLoading,
    allocationsLoading,
    storiesLoading,
    isDonor: !!donorAccount,
    lastUpdatedAt: Math.max(accountUpdatedAt || 0, beneficiariesUpdatedAt || 0, allocationsUpdatedAt || 0),
    refetchAll: () => {
      queryClient.invalidateQueries({ queryKey: ['donor-account'] });
      queryClient.invalidateQueries({ queryKey: ['donor-beneficiaries'] });
      queryClient.invalidateQueries({ queryKey: ['donor-documents'] });
      queryClient.invalidateQueries({ queryKey: ['donor-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['donor-pools'] });
      queryClient.invalidateQueries({ queryKey: ['donor-impact-stories'] });
    },
  };
}
