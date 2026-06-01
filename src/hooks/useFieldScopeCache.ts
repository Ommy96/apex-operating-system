import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { getCachedScope, putCachedScope } from '@/lib/offlineStorage';

export interface FieldProgram { id: string; name: string }
export interface FieldBeneficiary { id: string; display_name: string }

/**
 * Loads programs + beneficiaries for the field worker's organization and
 * mirrors them to IndexedDB so the lists stay usable for a full day offline.
 */
export function useFieldScopeCache() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const [programs, setPrograms] = useState<FieldProgram[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<FieldBeneficiary[]>([]);
  const [hydratedFromCache, setHydratedFromCache] = useState(false);

  // Hydrate from cache first so the UI is usable offline immediately.
  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const [p, b] = await Promise.all([
        getCachedScope<FieldProgram[]>(`programs:${orgId}`),
        getCachedScope<FieldBeneficiary[]>(`beneficiaries:${orgId}`),
      ]);
      if (p) setPrograms(p);
      if (b) setBeneficiaries(b);
      setHydratedFromCache(true);
    })();
  }, [orgId]);

  // Refresh from network when online; persist to IDB.
  useEffect(() => {
    if (!orgId || !navigator.onLine) return;
    let cancelled = false;
    (async () => {
      const [pRes, bRes] = await Promise.all([
        supabase.from('programs').select('id, name').eq('organization_id', orgId).eq('is_active', true).order('name'),
        supabase.from('beneficiaries').select('id, display_name').eq('organization_id', orgId).eq('status', 'active').order('display_name').limit(1000),
      ]);
      if (cancelled) return;
      if (pRes.data) { setPrograms(pRes.data as any); await putCachedScope(`programs:${orgId}`, pRes.data); }
      if (bRes.data) { setBeneficiaries(bRes.data as any); await putCachedScope(`beneficiaries:${orgId}`, bRes.data); }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  return { programs, beneficiaries, hydratedFromCache };
}