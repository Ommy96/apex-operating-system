import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useSettingsForm } from '@/hooks/useSettingsForm';

/**
 * Generic per-organisation settings store backed by `public.org_settings`
 * (organization_id, key, value jsonb). Used by settings sections that have no
 * dedicated column of their own, so their toggles actually persist.
 *
 * `orgFields` lists keys that live as real columns on `organizations` instead of
 * inside the jsonb blob (e.g. base_currency) — they are read from and written
 * back to the organisation row so there is a single source of truth.
 */
export function useOrgSettings<T extends Record<string, any>>(
  key: string,
  defaults: T,
  options: { successMessage?: string; orgFields?: (keyof T & string)[] } = {}
) {
  const { successMessage = 'Settings saved', orgFields = [] } = options;
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['org-settings', orgId, key],
    queryFn: async () => {
      if (!orgId) return null;

      const { data: row, error } = await supabase
        .from('org_settings' as any)
        .select('value')
        .eq('organization_id', orgId)
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;

      let orgValues: Record<string, any> = {};
      if (orgFields.length) {
        const { data: org, error: orgErr } = await supabase
          .from('organizations')
          .select(orgFields.join(','))
          .eq('id', orgId)
          .maybeSingle();
        if (orgErr) throw orgErr;
        orgFields.forEach((f) => {
          const v = (org as any)?.[f];
          if (v !== null && v !== undefined) orgValues[f] = v;
        });
      }

      return { ...(((row as any)?.value as object) ?? {}), ...orgValues } as Partial<T>;
    },
    enabled: !!orgId,
  });

  const initial: T | null = data === undefined || data === null ? null : { ...defaults, ...data };

  const form = useSettingsForm<T>({
    initial,
    save: async (values) => {
      if (!orgId) throw new Error('No organisation selected');

      const blob: Record<string, any> = {};
      const orgPatch: Record<string, any> = {};
      Object.entries(values).forEach(([k, v]) => {
        if ((orgFields as string[]).includes(k)) orgPatch[k] = v;
        else blob[k] = v;
      });

      const { error } = await supabase
        .from('org_settings' as any)
        .upsert(
          { organization_id: orgId, key, value: blob as any, updated_at: new Date().toISOString() },
          { onConflict: 'organization_id,key' }
        );
      if (error) throw error;

      if (Object.keys(orgPatch).length) {
        const { error: orgErr } = await supabase
          .from('organizations')
          .update({ ...orgPatch, updated_at: new Date().toISOString() } as any)
          .eq('id', orgId);
        if (orgErr) throw orgErr;
      }
    },
    onSaved: () => {
      qc.invalidateQueries({ queryKey: ['org-settings', orgId, key] });
      if (orgFields.length) {
        qc.invalidateQueries({ queryKey: ['organization-details'] });
        qc.invalidateQueries({ queryKey: ['organization'] });
      }
    },
    successMessage,
  });

  return { ...form, isLoading, orgId };
}
