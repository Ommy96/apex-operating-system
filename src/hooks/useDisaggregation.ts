import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

const sb = supabase as any;

export interface DisaggregationCategory {
  id: string;
  name: string;
  values: string[];
}

export function useDisaggregationCategories() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ["disaggregation-categories", orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<DisaggregationCategory[]> => {
      const { data, error } = await sb
        .from("disaggregation_categories")
        .select("id, name, values")
        .eq("org_id", orgId)
        .order("name");
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        id: c.id,
        name: c.name,
        values: Array.isArray(c.values) ? c.values : [],
      }));
    },
  });
}

export interface DisaggregatedValue {
  category_id: string | null;
  category_name: string | null;
  dimension_value: string;
  total: number;
  count: number;
}

export function useIndicatorDisaggregation(
  indicatorId?: string,
  categoryId?: string,
  periodStart?: string,
  periodEnd?: string,
) {
  return useQuery({
    queryKey: ["indicator-disagg", indicatorId, categoryId, periodStart, periodEnd],
    enabled: !!indicatorId,
    queryFn: async (): Promise<DisaggregatedValue[]> => {
      let q = sb
        .from("indicator_values")
        .select("dimension_key, dimension_value, disaggregation_category_id, disaggregation_value, actual_value")
        .eq("indicator_id", indicatorId);
      if (categoryId) q = q.eq("disaggregation_category_id", categoryId);
      if (periodStart) q = q.gte("period_start", periodStart);
      if (periodEnd) q = q.lte("period_end", periodEnd);
      const { data, error } = await q;
      if (error) throw error;
      const buckets = new Map<string, DisaggregatedValue>();
      (data ?? []).forEach((v: any) => {
        const key = (v.disaggregation_value ?? v.dimension_value ?? "Total") as string;
        const cur = buckets.get(key) ?? {
          category_id: v.disaggregation_category_id ?? null,
          category_name: v.dimension_key ?? null,
          dimension_value: key,
          total: 0,
          count: 0,
        };
        cur.total += Number(v.actual_value) || 0;
        cur.count += 1;
        buckets.set(key, cur);
      });
      return Array.from(buckets.values()).sort((a, b) => b.total - a.total);
    },
  });
}

export function useCreateDisaggregationCategory() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useMutation({
    mutationFn: async (input: { name: string; values: string[] }) => {
      const { data, error } = await sb
        .from("disaggregation_categories")
        .insert({ org_id: orgId, name: input.name, values: input.values })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["disaggregation-categories"] }),
  });
}