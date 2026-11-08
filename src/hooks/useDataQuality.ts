import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useAuth } from "./useAuth";
import { useRealtimeSubscription } from './useRealtimeSubscription';
import { qualityConfigSchema } from '@/lib/dataQuality';
import { ensureWritten } from '@/lib/settingsWrite';

const sb = supabase as any;

export interface DataQualityFlag {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  flag_type: string;
  flag_severity: "info" | "warning" | "error";
  flag_message: string | null;
  flagged_by: string | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  created_at: string;
  rule_id: string | null;
  beneficiary_id: string | null;
}

export interface DQFilters {
  severity?: string;
  entityType?: string;
  resolved?: "all" | "open" | "resolved";
}

export function useDataQualityFlags(filters: DQFilters = {}) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  useRealtimeSubscription([{ table: 'data_quality_flags', orgId, queryKeys: [['data-quality-flags']] }]);
  return useQuery({
    queryKey: ["data-quality-flags", orgId, filters],
    enabled: !!orgId,
    queryFn: async (): Promise<DataQualityFlag[]> => {
      const rows: DataQualityFlag[] = [];
      for (let offset = 0; ; offset += 500) {
      let q = sb
        .from("data_quality_flags")
        .select("*")
        .eq("organization_id", orgId)
        .is('deleted_at', null)
        .order("created_at", { ascending: false })
        .order('id')
        .range(offset, offset + 499);
      if (filters.severity && filters.severity !== "all") q = q.eq("flag_severity", filters.severity);
      if (filters.entityType && filters.entityType !== "all") q = q.eq("entity_type", filters.entityType);
      if (filters.resolved === "open") q = q.eq("is_resolved", false);
      else if (filters.resolved === "resolved") q = q.eq("is_resolved", true);
      const { data, error } = await q;
      if (error) throw error;
      rows.push(...(data ?? []));
      if (!data || data.length < 500) return rows;
      }
    },
  });
}

export function useResolveFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; note: string }) => {
      const { data, error } = await sb.rpc('recheck_data_quality_issue', { _issue: input.id, _note: input.note });
      if (error) throw error;
      if (!data) throw new Error('The rule still fails. Correct the underlying record, then recheck.');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data-quality-flags"] }),
  });
}

export interface QualityRule { id: string; template_key: string; enabled: boolean; config: { project_id?: string } }
export function useQualityRules() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({ queryKey: ['quality-rules', orgId], enabled: !!orgId, queryFn: async (): Promise<QualityRule[]> => {
    const { data, error } = await sb.rpc('list_quality_rules', { _org: orgId });
    if (error) throw error;
    return data ?? [];
  } });
}
export function useSaveQualityRule() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (rule: QualityRule) => {
    const config = qualityConfigSchema.parse(rule.config);
    const { data, error } = await sb.rpc('save_quality_rule', { _id: rule.id, _enabled: rule.enabled, _config: config });
    ensureWritten({ data: data ? [{ id: data }] : [], error }, 'Quality rule');
  }, onSuccess: () => qc.invalidateQueries({ queryKey: ['quality-rules'] }) });
}
export function useQualityScan() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  return useMutation({ mutationFn: async (): Promise<{ new_issues: number; failing_records: number }> => {
    const org = currentOrganization?.organization_id;
    if (!org) throw new Error('Choose an organisation');
    const { data, error } = await sb.rpc('scan_data_quality', { _org: org });
    if (error) throw error;
    return data;
  }, onSuccess: () => qc.invalidateQueries({ queryKey: ['data-quality-flags'] }) });
}

export function useCreateFlag() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      entity_type: string;
      entity_id: string;
      flag_type: string;
      flag_severity: "info" | "warning" | "error";
      flag_message: string;
    }) => {
      const { data, error } = await sb
        .from("data_quality_flags")
        .insert({
          organization_id: currentOrganization?.organization_id,
          ...input,
          flagged_by: user?.id ?? "system",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data-quality-flags"] }),
  });
}

export interface DQSummary {
  total: number;
  open: number;
  resolved: number;
  bySeverity: { error: number; warning: number; info: number };
  byEntityType: Record<string, number>;
  recent: DataQualityFlag[];
}

export function useDataQualitySummary() {
  const { data: flags = [], isLoading } = useDataQualityFlags({ resolved: "all" });
  const summary: DQSummary = {
    total: flags.length,
    open: flags.filter((f) => !f.is_resolved).length,
    resolved: flags.filter((f) => f.is_resolved).length,
    bySeverity: { error: 0, warning: 0, info: 0 },
    byEntityType: {},
    recent: flags.slice(0, 10),
  };
  flags.forEach((f) => {
    summary.bySeverity[f.flag_severity] = (summary.bySeverity[f.flag_severity] ?? 0) + 1;
    summary.byEntityType[f.entity_type] = (summary.byEntityType[f.entity_type] ?? 0) + 1;
  });
  return { summary, isLoading };
}