import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { INVERSE_RELATIONSHIPS, type RelationshipType } from '@/lib/householdUtils';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export interface BeneficiaryRelationshipRow {
  id: string;
  organization_id: string;
  beneficiary_a_id: string;
  beneficiary_b_id: string;
  relationship_type: RelationshipType;
  relationship_label: string | null;
  household_id: string | null;
  created_at: string;
  related?: {
    id: string;
    display_name: string | null;
    photo_url: string | null;
    household_id: string | null;
    date_of_birth: string | null;
  } | null;
}

export function useBeneficiaryRelationships(beneficiaryId: string | undefined) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ['beneficiary-relationships', beneficiaryId, orgId],
    queryFn: async () => {
      if (!beneficiaryId || !orgId) return [] as BeneficiaryRelationshipRow[];
      const { data, error } = await supabase
        .from('beneficiary_relationships' as any)
        .select('*, related:beneficiary_b_id(id, display_name, photo_url, household_id, date_of_birth)')
        .eq('organization_id', orgId)
        .eq('beneficiary_a_id', beneficiaryId)
        .order('created_at', { ascending: false });
      if (error) {
        logger.error('Failed to load relationships', error);
        return [] as BeneficiaryRelationshipRow[];
      }
      return (data || []) as unknown as BeneficiaryRelationshipRow[];
    },
    enabled: !!beneficiaryId && !!orgId,
  });
}

interface AddRelationshipInput {
  beneficiaryAId: string;
  beneficiaryBId: string;
  relationshipType: RelationshipType;
  householdId?: string | null;
}

export function useAddRelationship() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useMutation({
    mutationFn: async ({ beneficiaryAId, beneficiaryBId, relationshipType, householdId }: AddRelationshipInput) => {
      if (!orgId) throw new Error('No organization');
      const inverse = INVERSE_RELATIONSHIPS[relationshipType];
      const { data: userData } = await supabase.auth.getUser();
      const created_by = userData?.user?.id ?? null;

      const { error } = await supabase.from('beneficiary_relationships' as any).insert([
        {
          organization_id: orgId,
          beneficiary_a_id: beneficiaryAId,
          beneficiary_b_id: beneficiaryBId,
          relationship_type: relationshipType,
          household_id: householdId ?? null,
          created_by,
        },
        {
          organization_id: orgId,
          beneficiary_a_id: beneficiaryBId,
          beneficiary_b_id: beneficiaryAId,
          relationship_type: inverse,
          household_id: householdId ?? null,
          created_by,
        },
      ] as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beneficiary-relationships'] });
      qc.invalidateQueries({ queryKey: ['households'] });
    },
    onError: (e: any) => {
      toast({ title: 'Could not add relationship', description: e?.message, variant: 'destructive' });
    },
  });
}

export function useRemoveRelationship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mirrorId }: { id: string; mirrorId?: string | null }) => {
      const ids = [id, mirrorId].filter(Boolean) as string[];
      const { error } = await supabase.from('beneficiary_relationships' as any).delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beneficiary-relationships'] });
    },
  });
}

export interface HouseholdRow {
  id: string;
  household_name: string | null;
  county: string | null;
  sub_county: string | null;
  head_of_household_id: string | null;
  member_count: number | null;
  created_at: string;
}

export function useHouseholds() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ['households', orgId],
    queryFn: async () => {
      if (!orgId) return [] as HouseholdRow[];
      const { data, error } = await supabase
        .from('households' as any)
        .select('id, household_name, county, sub_county, head_of_household_id, member_count, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) {
        logger.error('Failed to load households', error);
        return [] as HouseholdRow[];
      }
      return (data || []) as unknown as HouseholdRow[];
    },
    enabled: !!orgId,
  });
}

export function useHousehold(householdId: string | undefined) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ['household', householdId, orgId],
    queryFn: async () => {
      if (!householdId || !orgId) return null;
      const { data, error } = await supabase
        .from('households' as any)
        .select('*')
        .eq('id', householdId)
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!householdId && !!orgId,
  });
}

export function useHouseholdMembers(householdId: string | undefined) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ['household-members', householdId, orgId],
    queryFn: async () => {
      if (!householdId || !orgId) return [] as any[];
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('id, display_name, first_name, last_name, photo_url, date_of_birth, gender, vulnerability_level, primary_need, status')
        .eq('organization_id', orgId)
        .eq('household_id', householdId)
        .is('deleted_at', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!householdId && !!orgId,
  });
}

export interface CreateHouseholdInput {
  household_name: string;
  county?: string | null;
  sub_county?: string | null;
  head_of_household_id?: string | null;
  member_ids: string[];
}

export function useCreateHousehold() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useMutation({
    mutationFn: async (input: CreateHouseholdInput) => {
      if (!orgId) throw new Error('No organization');
      const { data: hh, error } = await supabase
        .from('households' as any)
        .insert({
          organization_id: orgId,
          household_name: input.household_name,
          county: input.county ?? null,
          sub_county: input.sub_county ?? null,
          head_of_household_id: input.head_of_household_id ?? null,
        } as any)
        .select('id')
        .single();
      if (error) throw error;
      const householdId = (hh as any).id as string;

      if (input.member_ids.length) {
        const { error: updErr } = await supabase
          .from('beneficiaries')
          .update({ household_id: householdId } as any)
          .in('id', input.member_ids)
          .eq('organization_id', orgId);
        if (updErr) throw updErr;
      }
      return householdId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['households'] });
      qc.invalidateQueries({ queryKey: ['household-members'] });
      qc.invalidateQueries({ queryKey: ['beneficiary-relationships'] });
    },
    onError: (e: any) => {
      toast({ title: 'Could not create household', description: e?.message, variant: 'destructive' });
    },
  });
}

export function useUpdateBeneficiaryHousehold() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useMutation({
    mutationFn: async ({ beneficiaryId, householdId }: { beneficiaryId: string; householdId: string | null }) => {
      if (!orgId) throw new Error('No organization');
      const { error } = await supabase
        .from('beneficiaries')
        .update({ household_id: householdId } as any)
        .eq('id', beneficiaryId)
        .eq('organization_id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['households'] });
      qc.invalidateQueries({ queryKey: ['household-members'] });
    },
  });
}