import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

export interface DiscoveredOpportunity {
  title: string;
  funder_name: string;
  summary: string;
  match_score: number;
  match_reasons: string[];
  estimated_amount: number | null;
  currency: string;
  deadline: string | null;
  url: string | null;
  sectors: string[];
  sdg_focus: number[];
  source_id: string | null;
}

export function useGrantDiscovery() {
  const { currentOrganization } = useOrganization();
  const [opportunities, setOpportunities] = useState<DiscoveredOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!currentOrganization?.organization_id) return;
    setLoading(true);
    setLastError(null);
    try {
      const { data, error } = await supabase.functions.invoke('grant-discovery', {
        body: { organizationId: currentOrganization.organization_id },
      });
      if (error) {
        let detail = '';
        try {
          const body = (error as any).context?.body;
          if (body && typeof body.text === 'function') detail = await body.text();
        } catch { /* ignore */ }
        const msg = `Grant discovery failed: ${error.message}${detail ? ` — ${detail.slice(0, 240)}` : ''}`;
        setLastError(msg);
        toast.error(msg);
        return;
      }
      if (data?.error) {
        const msg = String(data.error);
        setLastError(msg);
        toast.error(msg);
        return;
      }
      setOpportunities(data?.opportunities ?? []);
      setGeneratedAt(data?.generatedAt ?? null);
    } catch (e: any) {
      const msg = e?.message ?? 'Failed to discover grants';
      setLastError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.organization_id]);

  const saveOpportunity = useCallback(async (opp: DiscoveredOpportunity) => {
    if (!currentOrganization?.organization_id) return;
    const { error } = await supabase.from('grant_opportunities').insert({
      organization_id: currentOrganization.organization_id,
      title: opp.title,
      funder_name: opp.funder_name,
      summary: opp.summary,
      match_score: opp.match_score,
      match_reasons: opp.match_reasons as any,
      estimated_amount: opp.estimated_amount,
      currency: opp.currency,
      deadline: opp.deadline,
      url: opp.url,
      sectors: opp.sectors,
      sdg_focus: opp.sdg_focus,
      source_id: opp.source_id,
      status: 'saved',
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Opportunity saved to pipeline');
  }, [currentOrganization?.organization_id]);

  return { opportunities, loading, generatedAt, lastError, run, saveOpportunity };
}