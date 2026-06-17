import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

export type EligibilityOperator =
  | "<" | "<=" | "=" | ">=" | ">"
  | "between" | "in" | "not_in" | "is_null" | "not_null";

export interface EligibilityRule {
  id: string;
  organization_id: string;
  project_id: string;
  name: string;
  weight: number;
  source: string;
  operator: EligibilityOperator;
  value: any;
  points_if_match: number;
  required: boolean;
  sort_order: number;
}

export interface EligibilityScore {
  id: string;
  beneficiary_id: string;
  project_id: string;
  score: number;
  max_score: number;
  eligible: boolean;
  matched_rules: Array<{ rule_id: string; name: string; points: number }>;
  failed_required_rules: Array<{ rule_id: string; name: string }>;
  computed_at: string;
}

const sb = supabase as any;

export function useProjectEligibilityRules(projectId?: string) {
  return useQuery({
    enabled: !!projectId,
    queryKey: ["eligibility-rules", projectId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("project_eligibility_rules")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as EligibilityRule[];
    },
  });
}

export function useUpsertEligibilityRule(projectId?: string) {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  return useMutation({
    mutationFn: async (input: Partial<EligibilityRule> & { id?: string }) => {
      const orgId = currentOrganization?.organization_id;
      const payload: any = { ...input, organization_id: orgId, project_id: projectId };
      const { data, error } = await sb.from("project_eligibility_rules").upsert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["eligibility-rules", projectId] });
      // Re-score project
      if (projectId && currentOrganization?.organization_id) {
        await supabase.functions.invoke("eligibility-scoring", {
          body: { mode: "project", organizationId: currentOrganization.organization_id, projectId },
        });
        qc.invalidateQueries({ queryKey: ["eligibility-scores"] });
      }
      toast.success("Rule saved");
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
  });
}

export function useDeleteEligibilityRule(projectId?: string) {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("project_eligibility_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ["eligibility-rules", projectId] });
      if (projectId && currentOrganization?.organization_id) {
        await supabase.functions.invoke("eligibility-scoring", {
          body: { mode: "project", organizationId: currentOrganization.organization_id, projectId },
        });
        qc.invalidateQueries({ queryKey: ["eligibility-scores"] });
      }
      toast.success("Rule deleted");
    },
  });
}

export function useBeneficiaryEligibilityScores(beneficiaryId?: string) {
  return useQuery({
    enabled: !!beneficiaryId,
    queryKey: ["eligibility-scores", "beneficiary", beneficiaryId],
    queryFn: async () => {
      const { data, error } = await sb
        .from("beneficiary_eligibility_scores")
        .select("*, projects:projects(id, name, program_id, programs(name))")
        .eq("beneficiary_id", beneficiaryId)
        .order("score", { ascending: false });
      if (error) throw error;
      return (data || []) as (EligibilityScore & { projects: any })[];
    },
  });
}

export function useRecomputeEligibility() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  return useMutation({
    mutationFn: async (args: {
      mode: "project" | "beneficiary" | "beneficiary_project" | "recompute_all";
      projectId?: string;
      beneficiaryId?: string;
    }) => {
      const orgId = currentOrganization?.organization_id;
      if (!orgId) throw new Error("No organization");
      const { data, error } = await supabase.functions.invoke("eligibility-scoring", {
        body: { organizationId: orgId, ...args },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["eligibility-scores"] });
      toast.success(`Scored ${data?.scored ?? 0} record(s)`);
    },
    onError: (e: any) => toast.error(e.message || "Recompute failed"),
  });
}