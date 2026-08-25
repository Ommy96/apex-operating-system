import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

const sb = supabase as any;

export type SponsorRelationshipStatus = 'active' | 'lapsed' | 'ended' | 'transferred';
export type SponsorRelationshipType = 'primary' | 'co_sponsor' | 'correspondent';

export interface SponsorRelationship {
  id: string;
  organization_id: string;
  donor_account_id: string | null;
  donor_name: string | null;
  beneficiary_id: string;
  started_on: string;
  ended_on: string | null;
  status: SponsorRelationshipStatus;
  relationship_type: SponsorRelationshipType;
  correspondence_enabled: boolean;
  package_id: string | null;
  end_reason: string | null;
  transferred_to_beneficiary_id: string | null;
  notes: string | null;
  created_at: string;
  donor?: { id: string; donor_name: string; email: string | null } | null;
  package?: { id: string; name: string; monthly_cost: number | null; currency: string | null } | null;
}

const SELECT =
  '*, donor:donor_accounts!sponsor_relationships_donor_account_id_fkey(id, donor_name, email), package:sponsorship_packages!sponsor_relationships_package_id_fkey(id, name, monthly_cost, currency)';

/** Relationships for one beneficiary (all statuses, newest first). */
export function useSponsorRelationships(beneficiaryId?: string | null) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    enabled: !!orgId && !!beneficiaryId,
    queryKey: ['sponsor-relationships', orgId, beneficiaryId],
    queryFn: async (): Promise<SponsorRelationship[]> => {
      const { data, error } = await sb
        .from('sponsor_relationships')
        .select(SELECT)
        .eq('organization_id', orgId)
        .eq('beneficiary_id', beneficiaryId)
        .order('started_on', { ascending: false });
      if (error) throw error;
      return (data || []) as SponsorRelationship[];
    },
  });
}

/** Relationships for one donor account. */
export function useDonorRelationships(donorAccountId?: string | null) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    enabled: !!orgId && !!donorAccountId,
    queryKey: ['donor-relationships', orgId, donorAccountId],
    queryFn: async (): Promise<SponsorRelationship[]> => {
      const { data, error } = await sb
        .from('sponsor_relationships')
        .select(`${SELECT}, beneficiary:beneficiaries!sponsor_relationships_beneficiary_id_fkey(id, display_name, first_name, last_name, beneficiary_code, lifecycle_stage)`)
        .eq('organization_id', orgId)
        .eq('donor_account_id', donorAccountId)
        .order('started_on', { ascending: false });
      if (error) throw error;
      return (data || []) as SponsorRelationship[];
    },
  });
}

/** All active relationships in the org — used to spot unsponsored beneficiaries. */
export function useActiveSponsorships() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    enabled: !!orgId,
    queryKey: ['sponsor-relationships-active', orgId],
    queryFn: async (): Promise<SponsorRelationship[]> => {
      const { data, error } = await sb
        .from('sponsor_relationships')
        .select('id, beneficiary_id, donor_account_id, donor_name, status, relationship_type')
        .eq('organization_id', orgId)
        .eq('status', 'active');
      if (error) throw error;
      return (data || []) as SponsorRelationship[];
    },
  });
}

export function useCreateSponsorRelationship() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  return useMutation({
    mutationFn: async (input: {
      beneficiary_id: string;
      donor_account_id?: string | null;
      donor_name?: string | null;
      relationship_type?: SponsorRelationshipType;
      package_id?: string | null;
      started_on?: string;
      correspondence_enabled?: boolean;
      notes?: string | null;
    }) => {
      const orgId = currentOrganization?.organization_id;
      if (!orgId) throw new Error('No organization context');
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await sb
        .from('sponsor_relationships')
        .insert({
          organization_id: orgId,
          beneficiary_id: input.beneficiary_id,
          donor_account_id: input.donor_account_id ?? null,
          donor_name: input.donor_name ?? null,
          relationship_type: input.relationship_type ?? 'primary',
          package_id: input.package_id ?? null,
          started_on: input.started_on ?? new Date().toISOString().slice(0, 10),
          correspondence_enabled: input.correspondence_enabled ?? true,
          notes: input.notes ?? null,
          status: 'active',
          created_by: user?.user?.id ?? null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as SponsorRelationship;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sponsor-relationships'] });
      qc.invalidateQueries({ queryKey: ['sponsor-relationships-active'] });
      toast.success('Sponsor linked');
    },
    onError: (e: any) => toast.error(e.message || 'Could not link sponsor'),
  });
}

export function useUpdateSponsorRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SponsorRelationship> }) => {
      const { data, error } = await sb
        .from('sponsor_relationships')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as SponsorRelationship;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sponsor-relationships'] });
      qc.invalidateQueries({ queryKey: ['sponsor-relationships-active'] });
      qc.invalidateQueries({ queryKey: ['donor-relationships'] });
    },
    onError: (e: any) => toast.error(e.message || 'Update failed'),
  });
}

/**
 * End a sponsorship — either simply end it, or TRANSFER the sponsor to
 * another beneficiary. Transfers log both beneficiary ids: the original
 * row is marked 'transferred' with the destination, and a new active
 * relationship is opened on the destination beneficiary.
 */
export function useEndSponsorship() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  return useMutation({
    mutationFn: async (args: {
      relationship: SponsorRelationship;
      mode: 'end' | 'transfer' | 'lapse';
      reason: string;
      toBeneficiaryId?: string;
    }) => {
      const orgId = currentOrganization?.organization_id;
      const { relationship, mode, reason, toBeneficiaryId } = args;
      const today = new Date().toISOString().slice(0, 10);
      const { data: user } = await supabase.auth.getUser();

      if (mode === 'transfer' && !toBeneficiaryId) {
        throw new Error('Choose the beneficiary to transfer this sponsor to');
      }

      const { error: uErr } = await sb
        .from('sponsor_relationships')
        .update({
          status: mode === 'lapse' ? 'lapsed' : mode === 'transfer' ? 'transferred' : 'ended',
          ended_on: mode === 'lapse' ? null : today,
          end_reason: reason || null,
          transferred_to_beneficiary_id: mode === 'transfer' ? toBeneficiaryId : null,
        })
        .eq('id', relationship.id);
      if (uErr) throw uErr;

      let child: any = null;
      if (mode === 'transfer') {
        const { data, error } = await sb
          .from('sponsor_relationships')
          .insert({
            organization_id: orgId ?? relationship.organization_id,
            donor_account_id: relationship.donor_account_id,
            donor_name: relationship.donor_name,
            beneficiary_id: toBeneficiaryId,
            relationship_type: relationship.relationship_type,
            package_id: relationship.package_id,
            correspondence_enabled: relationship.correspondence_enabled,
            started_on: today,
            status: 'active',
            notes: `Transferred from beneficiary ${relationship.beneficiary_id}. ${reason || ''}`.trim(),
            created_by: user?.user?.id ?? null,
          })
          .select('*')
          .single();
        if (error) throw error;
        child = data;
      }
      return { child, mode };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['sponsor-relationships'] });
      qc.invalidateQueries({ queryKey: ['sponsor-relationships-active'] });
      qc.invalidateQueries({ queryKey: ['donor-relationships'] });
      toast.success(
        res.mode === 'transfer' ? 'Sponsor transferred' : res.mode === 'lapse' ? 'Sponsorship marked lapsed' : 'Sponsorship ended',
      );
    },
    onError: (e: any) => toast.error(e.message || 'Could not update sponsorship'),
  });
}
