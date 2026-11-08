import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { toast } from '@/hooks/use-toast';
import { ResultMeasurement, resultExportRow } from '@/lib/resultsFramework';
const sb = supabase as any;
export interface ApprovedResult { id: string; indicator_id: string; period_start: string; period_end: string; version: number; amendment_reason?: string; snapshot: ResultMeasurement }
export async function computeResult(id: string, start: string, end: string): Promise<ResultMeasurement> {
  const { data, error } = await sb.rpc('compute_results_indicator', { _indicator: id, _start: start, _end: end });
  if (error) throw error;
  return resultExportRow(data as ResultMeasurement);
}
export function useResultsFramework(indicatorId: string, start: string, end: string, organizationId?: string) {
  const qc = useQueryClient();
  const preview = useQuery({ queryKey: ['results-preview', indicatorId, start, end], queryFn: () => computeResult(indicatorId, start, end), enabled: !!indicatorId && !!start && !!end && start <= end });
  const approved = useQuery({ queryKey: ['results-snapshots', indicatorId], queryFn: async () => {
    const { data, error } = await sb.rpc('list_results_snapshots', { _indicator: indicatorId });
    if (error) throw error;
    return (data ?? []) as ApprovedResult[];
  } });
  const approve = useMutation({ mutationFn: async ({ amends, reason }: { amends?: string; reason?: string }) => {
    const { data, error } = await sb.rpc('approve_results_period', { _indicator: indicatorId, _start: start, _end: end, _amends: amends ?? null, _reason: reason ?? null });
    if (error) throw error;
    return data;
  }, onSuccess: () => {
    ['results-snapshots', 'donor-results', 'analytics', 'results-preview'].forEach(key => qc.invalidateQueries({ queryKey: [key] }));
    toast({ title: 'Reporting period approved' });
  }, onError: (e: Error) => toast({ title: 'Approval failed', description: e.message, variant: 'destructive' }) });
  useRealtimeSubscription(['beneficiaries', 'beneficiary_services', 'beneficiary_progress_logs', 'indicator_values', 'indicators'].map(table => ({ table, orgId: organizationId, enabled: !!organizationId, queryKeys: [['results-preview']] })));
  return { preview, approved, approve };
}
export function useDonorResults() {
  return useQuery({ queryKey: ['donor-results'], queryFn: async () => {
    const { data, error } = await sb.rpc('get_donor_results');
    if (error) throw error;
    return (data ?? []) as ApprovedResult[];
  }, staleTime: 30000, refetchOnWindowFocus: true });
}