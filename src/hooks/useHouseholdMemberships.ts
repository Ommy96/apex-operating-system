import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export const HOUSEHOLD_LEAVE_REASONS: { value: string; label: string; hint?: string }[] = [
  { value: 'moved_out', label: 'Moved out', hint: 'Now lives elsewhere' },
  { value: 'married', label: 'Married / formed own household' },
  { value: 'transferred', label: 'Moved to another household' },
  { value: 'deceased', label: 'Deceased' },
  { value: 'no_longer_traceable', label: 'No longer traceable' },
  { value: 'added_in_error', label: 'Added in error', hint: 'Correction — nothing is recorded on their timeline' },
  { value: 'other', label: 'Other' },
];

export const leaveReasonLabel = (value?: string | null) =>
  HOUSEHOLD_LEAVE_REASONS.find((r) => r.value === value)?.label || value || 'Removed';

export interface PastMembership {
  id: string;
  beneficiary_id: string;
  household_id: string;
  left_at: string | null;
  left_reason: string | null;
  left_note: string | null;
  joined_at: string | null;
  beneficiary?: { id: string; display_name: string | null; date_of_birth: string | null; gender: string | null } | null;
}

export function usePastHouseholdMembers(householdId: string | undefined) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  return useQuery({
    queryKey: ['household-past-members', householdId, orgId],
    enabled: !!householdId && !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('household_memberships' as any)
        .select('id, beneficiary_id, household_id, left_at, left_reason, left_note, joined_at, beneficiary:beneficiary_id(id, display_name, date_of_birth, gender)')
        .eq('household_id', householdId!)
        .eq('organization_id', orgId!)
        .not('left_at', 'is', null)
        .order('left_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PastMembership[];
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['household-members'] });
  qc.invalidateQueries({ queryKey: ['household-past-members'] });
  qc.invalidateQueries({ queryKey: ['household'] });
  qc.invalidateQueries({ queryKey: ['households'] });
  qc.invalidateQueries({ queryKey: ['beneficiaries'] });
  qc.invalidateQueries({ queryKey: ['life-events'] });
}

export function useRemoveHouseholdMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { beneficiaryId: string; householdId: string; reason: string; note?: string | null }) => {
      const { data, error } = await (supabase.rpc as any)('remove_household_member', {
        _beneficiary_id: input.beneficiaryId,
        _household_id: input.householdId,
        _reason: input.reason,
        _note: input.note || null,
      });
      if (error) throw error;
      return (data || {}) as { membership_id?: string; life_event_id?: string | null };
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useRestoreHouseholdMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { beneficiaryId: string; householdId: string; lifeEventId?: string | null; restoreAsHead?: boolean }) => {
      const { error } = await (supabase.rpc as any)('restore_household_member', {
        _beneficiary_id: input.beneficiaryId,
        _household_id: input.householdId,
        _life_event_id: input.lifeEventId || null,
        _restore_as_head: !!input.restoreAsHead,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}
