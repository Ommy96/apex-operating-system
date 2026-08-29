import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useSettingsForm } from '@/hooks/useSettingsForm';

/**
 * Generic per-organisation settings store backed by `public.org_settings`
 * (organization_id, key, value jsonb). Used by settings sections that have no
 * dedicated column of their own, so their toggles actually persist.
 */
export function useOrgSettings<T extends Record<string, any>>(
  key: string,
  defaults: T,
  successMessage = 'Settings saved'
) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['org-settings', orgId, key],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('org_settings' as any)
        .select('value')
        .eq('organization_id', orgId)
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.value ?? {}) as Partial<T>;
    },
    enabled: !!orgId,
  });

  const initial: T | null = data === undefined || data === null ? null : { ...defaults, ...data };

  const form = useSettingsForm<T>({
    initial,
    save: async (values) => {
      if (!orgId) throw new Error('No organisation selected');
      const { error } = await supabase
        .from('org_settings' as any)
        .upsert(
          { organization_id: orgId, key, value: values as any },
          { onConflict: 'organization_id,key' }
        );
      if (error) throw error;
    },
    onSaved: () => {
      qc.invalidateQueries({ queryKey: ['org-settings', orgId, key] });
    },
    successMessage,
  });

  return { ...form, isLoading, orgId };
}
