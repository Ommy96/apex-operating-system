import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useAuth } from "./useAuth";

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
}

export interface DQFilters {
  severity?: string;
  entityType?: string;
  resolved?: "all" | "open" | "resolved";
}

export function useDataQualityFlags(filters: DQFilters = {}) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ["data-quality-flags", orgId, filters],
    enabled: !!orgId,
    queryFn: async (): Promise<DataQualityFlag[]> => {
      let q = sb
        .from("data_quality_flags")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (filters.severity && filters.severity !== "all") q = q.eq("flag_severity", filters.severity);
      if (filters.entityType && filters.entityType !== "all") q = q.eq("entity_type", filters.entityType);
      if (filters.resolved === "open") q = q.eq("is_resolved", false);
      else if (filters.resolved === "resolved") q = q.eq("is_resolved", true);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useResolveFlag() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; note: string }) => {
      const { data, error } = await sb
        .from("data_quality_flags")
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id ?? null,
          resolution_note: input.note,
        })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data-quality-flags"] }),
  });
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