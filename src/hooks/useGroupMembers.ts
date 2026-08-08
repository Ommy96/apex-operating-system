import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';

export interface GroupMember {
  id: string;
  organization_id: string;
  group_beneficiary_id: string;
  linked_beneficiary_id: string | null;
  full_name: string;
  role_in_group: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  date_of_birth: string | null;
  national_id: string | null;
  bio: string | null;
  joined_date: string | null;
  created_at: string;
}

export const GROUP_ROLES = ['chairperson', 'secretary', 'treasurer', 'member'] as const;

export function useGroupMembers(groupBeneficiaryId: string | undefined) {
  return useQuery({
    queryKey: ['group-members', groupBeneficiaryId],
    enabled: !!groupBeneficiaryId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_members' as any)
        .select('*')
        .eq('group_beneficiary_id', groupBeneficiaryId!)
        .is('deleted_at', null)
        .order('role_in_group')
        .order('full_name');
      if (error) throw error;
      return (data || []) as unknown as GroupMember[];
    },
  });
}

export function useSaveGroupMember() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;

  return useMutation({
    mutationFn: async (m: Partial<GroupMember> & { group_beneficiary_id: string }) => {
      const payload: any = { ...m, organization_id: orgId, updated_by: user?.id ?? null };
      // Blank strings would fail date/uuid casts — normalise them to null.
      for (const k of ['date_of_birth', 'joined_date', 'linked_beneficiary_id']) {
        if (payload[k] === '') payload[k] = null;
      }
      if (m.id) {
        const { error } = await supabase.from('group_members' as any).update(payload).eq('id', m.id);
        if (error) throw error;
      } else {
        payload.created_by = user?.id ?? null;
        const { error } = await supabase.from('group_members' as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['group-members', v.group_beneficiary_id] }),
  });
}

/** Soft-delete, in line with the platform-wide no-hard-delete rule. */
export function useRemoveGroupMember() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (p: { id: string; group_beneficiary_id: string }) => {
      const { error } = await supabase
        .from('group_members' as any)
        .update({ deleted_at: new Date().toISOString(), updated_by: user?.id ?? null } as any)
        .eq('id', p.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ['group-members', v.group_beneficiary_id] }),
  });
}
