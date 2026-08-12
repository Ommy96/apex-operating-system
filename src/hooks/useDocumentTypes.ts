import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export interface DocumentType {
  id: string;
  organization_id: string;
  key: string;
  label: string;
  description: string | null;
  is_consent_type: boolean;
  requires_expiry: boolean;
  sort_order: number;
  is_active: boolean;
}

export function useDocumentTypes(includeInactive = false) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ['document-types', orgId, includeInactive],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      let q = supabase.from('document_types' as any).select('*').eq('organization_id', orgId!).order('sort_order').order('label');
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as DocumentType[];
    },
  });
}

export function useSaveDocumentType() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useMutation({
    mutationFn: async (t: Partial<DocumentType> & { id?: string }) => {
      const payload: any = { ...t, organization_id: orgId };
      const q = t.id
        ? supabase.from('document_types' as any).update(payload).eq('id', t.id).select('*').maybeSingle()
        : supabase.from('document_types' as any).insert(payload).select('*').single();
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as DocumentType;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-types'] }),
  });
}

export function useDeleteDocumentType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('document_types' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-types'] }),
  });
}
