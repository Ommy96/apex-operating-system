import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface ProgramFundingSummary {
  program_id: string;
  organization_id: string;
  name: string;
  currency: string | null;
  status: string | null;
  total_budget: number;
  program_level_funding: number;
  project_level_funding: number;
  beneficiary_level_funding: number;
  total_received: number;
  total_spent: number;
  donor_count: number;
}

export interface ProjectFundingSummary {
  project_id: string;
  organization_id: string;
  program_id: string | null;
  name: string;
  status: string | null;
  total_budget: number;
  total_received: number;
  total_spent: number;
  start_date: string | null;
  end_date: string | null;
}

export interface FundingHealthScore {
  score: number;
  coverage: number;
  burn: number;
  diversity: number;
  expiry: number;
  total_budget: number;
  total_committed: number;
  total_received: number;
  total_spent: number;
  donor_count: number;
  expiring_grants: number;
}

export function useProgramFundingSummaries() {
  const { currentOrganization } = useOrganization();
  return useQuery({
    queryKey: ["v_program_funding_summary", currentOrganization?.organization_id],
    enabled: !!currentOrganization?.organization_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_program_funding_summary")
        .select("*")
        .eq("organization_id", currentOrganization!.organization_id);
      if (error) throw error;
      return (data ?? []) as ProgramFundingSummary[];
    },
  });
}

export function useProjectFundingSummaries() {
  const { currentOrganization } = useOrganization();
  return useQuery({
    queryKey: ["v_project_funding_summary", currentOrganization?.organization_id],
    enabled: !!currentOrganization?.organization_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_project_funding_summary")
        .select("*")
        .eq("organization_id", currentOrganization!.organization_id);
      if (error) throw error;
      return (data ?? []) as ProjectFundingSummary[];
    },
  });
}

export function useOrgGrants() {
  const { currentOrganization } = useOrganization();
  return useQuery({
    queryKey: ["grants-intel", currentOrganization?.organization_id],
    enabled: !!currentOrganization?.organization_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grants")
        .select("id, grant_name, donor_name, grant_amount, amount_received, currency, status, start_date, end_date, reporting_frequency, next_report_due, compliance_notes, supported_funding_model")
        .eq("organization_id", currentOrganization!.organization_id);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useFundingHealthScore(programId: string | null | undefined) {
  return useQuery({
    queryKey: ["funding-health", programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("program_funding_health_score", {
        _program_id: programId,
      });
      if (error) throw error;
      return data as FundingHealthScore;
    },
  });
}