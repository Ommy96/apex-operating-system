import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { toast } from 'sonner';
import type { LedgerCell } from '@/lib/reportingLedger';

export interface ReportingOptions {
  programs: { id: string; name: string }[];
  projects: { id: string; name: string; program_id: string }[];
  staff: { user_id: string; name: string; program_ids: string[]; project_ids: string[] }[];
  forms: { id: string; name: string; program_id: string | null; project_id: string | null }[];
}

export function useReportingLedger(from: string, to: string, canManage: boolean) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();
  const ledger = useQuery({
    queryKey: ['reporting-ledger', orgId, from, to],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.rpc('get_reporting_ledger', { _org_id: orgId, _from: from, _to: to });
      if (error) throw error;
      return (data || []) as unknown as LedgerCell[];
    }, enabled: Boolean(orgId && from && to && from <= to), refetchInterval: 60_000,
  });
  const options = useQuery({
    queryKey: ['reporting-options', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase.rpc('reporting_team_options', { _org_id: orgId });
      if (error) throw error;
      return data as unknown as ReportingOptions;
    }, enabled: Boolean(orgId) && canManage,
  });
  useEffect(() => { if (ledger.error || options.error) toast.error((ledger.error || options.error)?.message); }, [ledger.error, options.error]);
  useRealtimeSubscription([
    { table: 'reporting_obligations', orgId, enabled: Boolean(orgId), queryKeys: [['reporting-ledger']] },
    { table: 'me_form_submissions', orgId, enabled: Boolean(orgId), queryKeys: [['reporting-ledger']] },
  ]);
  const create = useMutation({
    mutationFn: async (values: { userIds: string[]; scope_type: string; program_id: string | null; project_id: string | null; form_id: string | null; cadence: string; grace_days: number }) => {
      if (!orgId) throw new Error('Choose an organisation');
      const { userIds, ...fields } = values;
      if (!userIds.length) throw new Error('Choose at least one team member');
      const { data, error } = await supabase.from('reporting_obligations')
        .insert(userIds.map(user_id => ({ ...fields, organization_id: orgId, user_id }))).select('id');
      if (error) throw error;
      if (data?.length !== userIds.length) throw new Error('Not all obligations were created');
      return data;
    }, onSuccess: () => { qc.invalidateQueries({ queryKey: ['reporting-ledger'] }); toast.success('Reporting obligations created'); },
    onError: (error: Error) => toast.error(error.message),
  });
  const nudge = useMutation({
    mutationFn: async (cells: LedgerCell[]) => {
      const unique = [...new Map(cells.map(c => [`${c.obligation_id}:${c.period_start}`, c])).values()];
      const results: { sent: number; duplicate: number; held: number; errors: string[] } = { sent: 0, duplicate: 0, held: 0, errors: [] };
      for (const c of unique) {
        const { data, error } = await supabase.functions.invoke('reporting-nudge', { body: { obligation_id: c.obligation_id, period_start: c.period_start } });
        if (error) { results.errors.push(error.message); continue; }
        if (data?.error) { results.errors.push(data.error); continue; }
        if (data?.duplicate) results.duplicate++;
        else if (data?.sent) results.sent++;
        else { results.held++; if (data?.message) results.errors.push(data.message); }
      }
      return results;
    }, onSuccess: r => {
      qc.invalidateQueries({ queryKey: ['reporting-ledger'] });
      qc.invalidateQueries({ queryKey: ['message-deliveries'] });
      qc.invalidateQueries({ queryKey: ['staff-tasks'] });
      if (r.sent) toast.success(`${r.sent} reminder(s) sent`);
      if (r.duplicate) toast.info(`${r.duplicate} reminder(s) already processed; no duplicate sent`);
      if (r.errors.length || r.held) toast.error(r.errors[0] || `${r.held} reminder(s) not sent`);
    }, onError: (error: Error) => toast.error(error.message),
  });
  return { ledger, options, create, nudge };
}