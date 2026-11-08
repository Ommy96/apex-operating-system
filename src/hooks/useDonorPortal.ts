import { useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ensureWritten } from '@/lib/settingsWrite';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { contactBirthdayAllowed, receivedContribution } from '@/lib/donorMoney';

const sb = supabase as any;

const commonOpts = {
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
} as const;

export interface DonorProgramme {
  id: string;
  name: string;
  description: string | null;
  beneficiaryIds: string[];
  count: number;
  contributedBase: number;
  currency: string;
}

export function useDonorPortal(period: string = 'all') {
  const { user } = useAuth();
  const queryClient = useQueryClient();

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

  const donorId = donorAccount?.id;
  const orgId = donorAccount?.organization_id;
  const currency = (donorAccount as any)?.preferred_currency || 'USD';

  /* ------------------------------------------------------------------ */
  /* Sponsored beneficiaries — live from beneficiary_donors               */
  /* ------------------------------------------------------------------ */
  const { data: sponsoredBeneficiaries, isLoading: beneficiariesLoading, dataUpdatedAt: beneficiariesUpdatedAt } = useQuery({
    queryKey: ['donor-beneficiaries', donorId, currency, period],
    queryFn: async () => {
      if (!donorAccount) return [];
      const { data, error } = await sb
        .from('beneficiary_donors')
        .select(`
          id,
          amount_received,
          donation_date,
          notes,
          program_id,
          beneficiary:beneficiaries!beneficiary_donors_beneficiary_id_fkey(
            id, first_name, photo_url, beneficiary_code,
            beneficiary_type, gender, grade, academic_level,
            institution_name, status, date_of_birth, county,
            bio, hobbies_list, interests, career_ambition,
            favourite_subject, personal_strengths, consent_given
          )
        `)
        .eq('donor_name', donorAccount.donor_name)
        .eq('organization_id', donorAccount.organization_id);
      if (error) throw error;
      return (data || []).map((row: any) => ({ ...row, beneficiary: row.beneficiary ? { ...row.beneficiary, display_name: row.beneficiary.consent_given ? row.beneficiary.first_name : 'Sponsored participant', photo_url: row.beneficiary.consent_given ? row.beneficiary.photo_url : null } : null }));
    },
    enabled: !!donorAccount,
    ...commonOpts,
  });

  const sponsoredIds = useMemo(
    () => Array.from(new Set((sponsoredBeneficiaries || []).map((bd: any) => bd.beneficiary?.id).filter(Boolean))),
    [sponsoredBeneficiaries],
  );

  /* ------------------------------------------------------------------ */
  /* Enrollments — which programmes/projects their beneficiaries are in   */
  /* ------------------------------------------------------------------ */
  const { data: enrollments = [] } = useQuery({
    queryKey: ['donor-enrollments', donorId, sponsoredIds],
    queryFn: async () => {
      if (!sponsoredIds.length) return [];
      const out: any[] = [];
      for (let i = 0; i < sponsoredIds.length; i += 100) {
        const chunk = sponsoredIds.slice(i, i + 100);
        const { data, error } = await sb
          .from('beneficiary_services')
          .select(`
            id, beneficiary_id, program_id, project_id, status, enrolled_date, exit_date, project_name,
            program:programs!beneficiary_services_program_id_fkey(id, name, description),
            project:projects!beneficiary_services_project_id_fkey(id, name)
          `)
          .in('beneficiary_id', chunk);
        if (error) throw error;
        out.push(...(data || []));
      }
      return out;
    },
    enabled: !!donorId && sponsoredIds.length > 0,
    ...commonOpts,
  });

  /* ------------------------------------------------------------------ */
  /* Allocations (live) + committed intents fallback                      */
  /* ------------------------------------------------------------------ */
  const { data: donorAllocations, isLoading: allocationsLoading, dataUpdatedAt: allocationsUpdatedAt } = useQuery({
    queryKey: ['donor-allocations', donorId, currency, period],
    queryFn: async () => {
      if (!donorId) return [];
      const { data, error } = await sb
        .from('allocations')
        .select(`
          id, scope, status, amount_native, native_currency,
          amount_base, base_currency, fx_rate, fx_at, fx_snapshot, allocated_at,
          beneficiary:beneficiaries!allocations_beneficiary_id_fkey(id, display_name, photo_url),
          project:projects!allocations_project_id_fkey(id, name),
          program:programs!allocations_program_id_fkey(id, name)
        `)
        .eq('donor_account_id', donorId)
        .order('allocated_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!donorId,
    ...commonOpts,
  });

  const { data: donationIntents = [] } = useQuery({
    queryKey: ['donor-intents', donorId, currency, period],
    queryFn: async () => {
      if (!donorId) return [];
      const { data, error } = await sb
        .from('donation_intents')
        .select('id, kind, restriction, committed_amount, committed_currency, committed_at, target_beneficiary_id, target_program_id, target_project_id')
        .eq('donor_account_id', donorId)
        .order('committed_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
    enabled: !!donorId,
    ...commonOpts,
  });

  const { data: donorPools } = useQuery({
    queryKey: ['donor-pools', donorId, currency],
    queryFn: async () => {
      if (!donorId) return [];
      const { data, error } = await sb
        .from('donor_pools')
        .select(`
          id, scope, currency, balance_native, balance_base,
          scope_beneficiary_id, scope_project_id, scope_program_id,
          beneficiary:beneficiaries!donor_pools_scope_beneficiary_id_fkey(display_name),
          project:projects!donor_pools_scope_project_id_fkey(name),
          program:programs!donor_pools_scope_program_id_fkey(name)
        `)
        .eq('donor_account_id', donorId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!donorId,
    ...commonOpts,
  });

  /* ------------------------------------------------------------------ */
  /* Documents: org-level donor-visible + per-beneficiary shared docs     */
  /* ------------------------------------------------------------------ */
  const { data: donorDocuments, isLoading: documentsLoading } = useQuery({
    queryKey: ['donor-documents', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('managed_documents')
        .select('*')
        .eq('organization_id', orgId)
        .eq('donor_visible', true)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
    ...commonOpts,
  });

  const { data: sharedBeneficiaryDocuments = [] } = useQuery({
    queryKey: ['donor-shared-beneficiary-documents', donorId, sponsoredIds],
    queryFn: async () => {
      if (!sponsoredIds.length) return [];
      const { data, error } = await sb
        .from('beneficiary_uploads')
        .select('id, beneficiary_id, document_name, document_type, description, file_url, file_size, created_at, share_with_sponsor')
        .eq('share_with_sponsor', true)
        .in('beneficiary_id', sponsoredIds.slice(0, 300))
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!donorId && sponsoredIds.length > 0,
    ...commonOpts,
  });

  /* ------------------------------------------------------------------ */
  /* Impact stories — beneficiary- or programme-connected                 */
  /* ------------------------------------------------------------------ */
  const { data: impactStories, isLoading: storiesLoading } = useQuery({
    queryKey: ['donor-impact-stories', donorId, sponsoredIds],
    queryFn: async () => {
      if (!donorId) return [];
      const { data, error } = await sb
        .from('impact_stories')
        .select('id, title, story_text, theme, tags, photo_urls, published_at, beneficiary_id, project_id, program_id')
        .eq('status', 'published')
        .is('deleted_at', null)
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!donorId,
    ...commonOpts,
  });

  /* ------------------------------------------------------------------ */
  /* Programme rollup for this donor                                      */
  /* ------------------------------------------------------------------ */
  const programmes: DonorProgramme[] = useMemo(() => {
    const map = new Map<string, DonorProgramme>();
    const add = (id: string, name: string, description: string | null, beneficiaryId?: string | null, amount = 0, currencyCode = 'KES') => {
      if (!id) return;
      const existing = map.get(id) || {
        id, name, description, beneficiaryIds: [], count: 0, contributedBase: 0, currency: currencyCode,
      };
      if (beneficiaryId && !existing.beneficiaryIds.includes(beneficiaryId)) {
        existing.beneficiaryIds.push(beneficiaryId);
        existing.count = existing.beneficiaryIds.length;
      }
      existing.contributedBase += amount;
      if (!existing.description && description) existing.description = description;
      map.set(id, existing);
    };

    (enrollments || []).forEach((e: any) => {
      if (e.program?.id) add(e.program.id, e.program.name, e.program.description ?? null, e.beneficiary_id);
    });
    (sponsoredBeneficiaries || []).forEach((bd: any) => {
      if (bd.program_id) {
        const existing = map.get(bd.program_id);
        add(bd.program_id, existing?.name || 'Programme', existing?.description ?? null, bd.beneficiary?.id, Number(bd.amount_received) || 0);
      }
    });
    (donorAllocations || []).forEach((a: any) => {
      if (a.program?.id) add(a.program.id, a.program.name, null, a.beneficiary?.id ?? null, Number(a.amount_base) || 0, a.base_currency || 'KES');
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [enrollments, sponsoredBeneficiaries, donorAllocations]);

  /* ------------------------------------------------------------------ */
  /* Upcoming milestones (birthdays, anniversaries)                       */
  /* ------------------------------------------------------------------ */
  const { data: org } = useQuery({
    queryKey: ['donor-org', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await sb
        .from('organizations')
        .select('id, name, website, donor_birthday_alerts_enabled')
        .eq('id', orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    ...commonOpts,
  });

  const { data: contactConsents = {} } = useQuery({
    queryKey: ['donor-contact-consent', donorId, sponsoredIds],
    enabled: !!donorId && sponsoredIds.length > 0,
    queryFn: async () => Object.fromEntries(await Promise.all(sponsoredIds.map(async (id: any) => {
      const { data, error } = await sb.rpc('donor_contact_permitted', { _beneficiary: id });
      if (error) throw error;
      return [id, data === true];
    }))), ...commonOpts,
  });

  const milestones = useMemo(() => {
    const birthdaysEnabled = org?.donor_birthday_alerts_enabled !== false;
    const now = new Date();
    const items: {
      kind: 'birthday' | 'anniversary';
      beneficiaryId: string;
      name: string;
      photoUrl: string | null;
      date: Date;
      daysAway: number;
      turningAge?: number;
    }[] = [];

    (sponsoredBeneficiaries || []).forEach((bd: any) => {
      const b = bd.beneficiary;
      if (!b) return;

      if (contactBirthdayAllowed(b.date_of_birth, contactConsents[b.id] === true, birthdaysEnabled)) {
        const dob = new Date(b.date_of_birth);
        const next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
        if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) next.setFullYear(now.getFullYear() + 1);
        const days = Math.round((next.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000);
        if (days <= 7) {
          items.push({
            kind: 'birthday',
            beneficiaryId: b.id,
            name: b.first_name || b.display_name,
            photoUrl: b.consent_given ? b.photo_url : null,
            date: next,
            daysAway: days,
            turningAge: next.getFullYear() - dob.getFullYear(),
          });
        }
      }

      if (bd.donation_date) {
        const start = new Date(bd.donation_date);
        const next = new Date(now.getFullYear(), start.getMonth(), start.getDate());
        if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) next.setFullYear(now.getFullYear() + 1);
        const days = Math.round((next.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86_400_000);
        if (days <= 30 && next.getFullYear() > start.getFullYear()) {
          items.push({
            kind: 'anniversary',
            beneficiaryId: b.id,
            name: b.first_name || b.display_name,
            photoUrl: b.consent_given ? b.photo_url : null,
            date: next,
            daysAway: days,
          });
        }
      }
    });

    return items.sort((a, b) => a.daysAway - b.daysAway);
  }, [sponsoredBeneficiaries, org, contactConsents]);

  /* ------------------------------------------------------------------ */
  /* Mutations                                                            */
  /* ------------------------------------------------------------------ */
  const updatePreferredCurrency = useMutation({
    mutationFn: async (curr: string) => {
      if (!donorId) throw new Error('no_donor_account');
      const result = await sb.rpc('set_donor_currency', { _currency: curr });
      ensureWritten(result, 'Currency preference');
      return curr;
    },
    onMutate: async (curr: string) => {
      await queryClient.cancelQueries({ queryKey: ['donor-account', user?.id] });
      const prev = queryClient.getQueryData(['donor-account', user?.id]);
      queryClient.setQueryData(['donor-account', user?.id], (old: any) =>
        old ? { ...old, preferred_currency: curr } : old,
      );
      return { prev };
    },
    onError: (_e, _v, ctx: any) => {
      if (ctx?.prev) queryClient.setQueryData(['donor-account', user?.id], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['donor-account'] });
      queryClient.invalidateQueries({ queryKey: ['currency-rates-all'] });
    },
  });

  const sendCorrespondence = useMutation({
    mutationFn: async (input: { beneficiaryId: string; message: string; kind?: string; subject?: string }) => {
      if (!donorId || !orgId) throw new Error('no_donor_account');
      const { data, error } = await sb
        .from('sponsor_correspondence')
        .insert({
          organization_id: orgId,
          donor_account_id: donorId,
          beneficiary_id: input.beneficiaryId,
          kind: input.kind || 'birthday_message',
          subject: input.subject || null,
          message: input.message,
        })
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['donor-correspondence'] }),
  });

  const { data: correspondence = [] } = useQuery({
    queryKey: ['donor-correspondence', donorId],
    queryFn: async () => {
      if (!donorId) return [];
      const { data, error } = await sb
        .from('sponsor_correspondence')
        .select('*')
        .eq('donor_account_id', donorId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!donorId,
    ...commonOpts,
  });

  /* ------------------------------------------------------------------ */
  /* Live invalidation                                                    */
  /* ------------------------------------------------------------------ */
  const invalidateDonorKeys = () => {
    [
      'donor-account', 'donor-beneficiaries', 'donor-enrollments', 'donor-documents',
      'donor-shared-beneficiary-documents', 'donor-allocations', 'donor-intents',
      'donor-pools', 'donor-impact-stories', 'donor-correspondence', 'donor-portal',
    ].forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  };

  useRealtimeSubscription(['allocations', 'donations', 'beneficiary_donors', 'sponsor_relationships', 'beneficiary_services', 'impact_stories', 'sponsorship_updates', 'visit_requests', 'beneficiary_uploads', 'managed_documents'].map(table => ({ table, orgId, enabled: !!donorId, queryKeys: [['donor-portal'], ...['donor-account', 'donor-beneficiaries', 'donor-allocations', 'donor-intents', 'donor-pools', 'donor-impact-stories', 'donor-documents', 'donor-shared-beneficiary-documents', 'donor-enrollments'].map(key => [key])] })));

  /* ------------------------------------------------------------------ */
  /* Totals: allocations first, committed intents / recorded gifts as     */
  /* the live fallback so real funding never reads as zero.               */
  /* ------------------------------------------------------------------ */
  const { data: receivedDonations = [], dataUpdatedAt: receivedUpdatedAt } = useQuery({
    queryKey: ['donor-portal', 'received', donorId, currency, period], enabled: !!donorId,
    queryFn: async () => {
      const { data, error } = await sb.from('donations').select('id, amount, currency, status, completed_at, created_at').eq('donor_account_id', donorId).eq('organization_id', orgId);
      if (error) throw error;
      return (data || []).filter(receivedContribution);
    }, ...commonOpts,
  });
  const totals = useMemo(() => {
    const recorded = (sponsoredBeneficiaries || []).reduce((sum: number, bd: any) => sum + Number(bd.amount_received || 0), 0);
    return { recorded, contributed: recorded, currency: 'KES', source: 'recorded_gifts' as const };
  }, [sponsoredBeneficiaries]);

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
    const { data, error } = await sb
      .from('sponsorship_updates')
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .eq('visible_to_donor', true)
      .not('approved_at', 'is', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  };

  const getDocumentDownloadUrl = async (fileUrl: string) => {
    const path = fileUrl.replace(/^.*\/managed-documents\//, '');
    const { data, error } = await supabase.storage
      .from('managed-documents')
      .createSignedUrl(path, 300);
    if (error) throw error;
    return data?.signedUrl || null;
  };

  /** Short-lived signed URL for a beneficiary document + audit log of the access. */
  const getSharedDocumentUrl = async (doc: any) => {
    const path = String(doc.file_url || '').replace(/^.*\/beneficiary-documents\//, '');
    const { data, error } = await supabase.storage
      .from('beneficiary-documents')
      .createSignedUrl(path, 300);
    if (error) return null;
    try {
      await sb.from('audit_logs').insert({
        organization_id: orgId,
        user_id: user?.id,
        action: 'donor_document_view',
        entity_type: 'beneficiary_uploads',
        entity_id: doc.id,
        metadata: { donor_account_id: donorId, beneficiary_id: doc.beneficiary_id },
      });
    } catch {
      /* audit failure must not block the donor */
    }
    return data?.signedUrl || null;
  };

  return {
    donorAccount,
    currency,
    org,
    sponsoredBeneficiaries,
    enrollments,
    programmes,
    milestones,
    correspondence,
    donorDocuments,
    sharedBeneficiaryDocuments,
    donorAllocations,
    donationIntents,
    donorPools,
    impactStories,
    totals,
    receivedDonations,
    updatePreferredCurrency,
    sendCorrespondence,
    fetchBeneficiaryAcademics,
    fetchBeneficiaryProgression,
    fetchBeneficiaryUpdates,
    getDocumentDownloadUrl,
    getSharedDocumentUrl,
    isLoading: accountLoading || beneficiariesLoading,
    documentsLoading,
    allocationsLoading,
    storiesLoading,
    isDonor: !!donorAccount,
    lastUpdatedAt: Math.min(...[accountUpdatedAt, beneficiariesUpdatedAt, allocationsUpdatedAt, receivedUpdatedAt].filter(Boolean)),
    refetchAll: invalidateDonorKeys,
  };
}
