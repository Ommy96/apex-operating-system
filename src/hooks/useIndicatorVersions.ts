import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { toast } from "@/hooks/use-toast";

export interface IndicatorVersion {
  id: string;
  organization_id: string;
  indicator_id: string;
  version: number;
  name: string;
  definition: string | null;
  snapshot: Record<string, any>;
  changed_by: string | null;
  change_reason: string | null;
  effective_from: string | null;
  effective_to: string | null;
  created_at: string;
}

export function useIndicatorVersions(indicatorId?: string) {
  return useQuery({
    queryKey: ["indicator-versions", indicatorId],
    queryFn: async () => {
      if (!indicatorId) return [];
      const { data, error } = await (supabase as any)
        .from("indicator_versions")
        .select("*")
        .eq("indicator_id", indicatorId)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as IndicatorVersion[];
    },
    enabled: !!indicatorId,
  });
}

/**
 * Update an indicator. If the indicator is published and has recorded values,
 * snapshot the current state into indicator_versions and bump the version
 * before applying the update.
 */
export function useUpdateIndicatorWithVersioning() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
      changeReason,
    }: {
      id: string;
      updates: Record<string, any>;
      changeReason?: string;
    }) => {
      // Load current indicator
      const { data: current, error: loadErr } = await (supabase as any)
        .from("indicators")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (loadErr) throw loadErr;
      if (!current) throw new Error("Indicator not found");

      const isPublished = current.publish_status === "published";
      const { count } = await (supabase as any)
        .from("indicator_values")
        .select("id", { count: "exact", head: true })
        .eq("indicator_id", id);
      const hasValues = (count ?? 0) > 0;

      if (isPublished && hasValues) {
        const newVersion = (current.version ?? 1) + 1;
        const { data: { user } } = await supabase.auth.getUser();
        const { error: vErr } = await (supabase as any)
          .from("indicator_versions")
          .insert({
            organization_id: current.organization_id,
            indicator_id: id,
            version: current.version ?? 1,
            name: current.name,
            definition: current.description ?? null,
            snapshot: current,
            changed_by: user?.id ?? null,
            change_reason: changeReason ?? null,
            effective_from: current.created_at,
            effective_to: new Date().toISOString(),
          });
        if (vErr) throw vErr;
        updates = { ...updates, version: newVersion, version_notes: changeReason ?? updates.version_notes };
      }

      const { data, error } = await (supabase as any)
        .from("indicators")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["indicators"] });
      queryClient.invalidateQueries({ queryKey: ["indicator-versions"] });
      toast({ title: "Indicator updated" });
    },
    onError: (e: Error) => {
      toast({ title: "Error updating indicator", description: e.message, variant: "destructive" });
    },
  });
}