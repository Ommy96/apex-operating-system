import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

const sb = supabase as any;

export type CaseType =
  | "general_support" | "protection" | "health" | "education"
  | "livelihoods" | "emergency" | "referral" | "follow_up" | "other";
export type CaseStatus =
  | "open" | "in_progress" | "referred" | "resolved" | "closed" | "lost_to_follow_up";
export type CasePriority = "low" | "normal" | "high" | "critical";
export type EntryType =
  | "visit" | "observation" | "concern" | "referral" | "follow_up"
  | "service_delivered" | "outcome_recorded" | "note" | "status_change" | "document_uploaded";

export interface BeneficiaryCase {
  id: string;
  organization_id: string;
  beneficiary_id: string;
  program_id: string | null;
  case_number: string | null;
  case_type: CaseType;
  case_status: CaseStatus;
  priority: CasePriority;
  opened_date: string;
  assigned_to: string | null;
  closed_date: string | null;
  closure_reason: string | null;
  summary: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  beneficiary?: { id: string; display_name: string | null; first_name: string | null; last_name: string | null; unique_id: string | null } | null;
}

export interface CaseEntry {
  id: string;
  organization_id: string;
  case_id: string;
  beneficiary_id: string;
  entry_type: EntryType;
  entry_date: string;
  visit_type: string | null;
  location_county: string | null;
  location_sub_county: string | null;
  latitude: number | null;
  longitude: number | null;
  summary: string;
  structured_data: Record<string, any>;
  concern_level: string | null;
  action_required: string | null;
  follow_up_date: string | null;
  follow_up_completed: boolean;
  follow_up_completed_date: string | null;
  referral_to: string | null;
  referral_organisation: string | null;
  referral_date: string | null;
  referral_outcome: string | null;
  photos: string[];
  documents: string[];
  entered_by: string;
  created_at: string;
}

export interface CaseFilters {
  status?: CaseStatus | "all";
  priority?: CasePriority | "all";
  caseType?: CaseType | "all";
  search?: string;
  beneficiaryId?: string;
}

export function useBeneficiaryCases(filters: CaseFilters = {}) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ["beneficiary-cases", orgId, filters],
    enabled: !!orgId,
    queryFn: async (): Promise<BeneficiaryCase[]> => {
      let q = sb
        .from("beneficiary_cases")
        .select("*, beneficiary:beneficiaries(id, display_name, first_name, last_name, unique_id)")
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .order("opened_date", { ascending: false });
      if (filters.status && filters.status !== "all") q = q.eq("case_status", filters.status);
      if (filters.priority && filters.priority !== "all") q = q.eq("priority", filters.priority);
      if (filters.caseType && filters.caseType !== "all") q = q.eq("case_type", filters.caseType);
      if (filters.beneficiaryId) q = q.eq("beneficiary_id", filters.beneficiaryId);
      const { data, error } = await q;
      if (error) throw error;
      let rows = data ?? [];
      if (filters.search && filters.search.trim()) {
        const t = filters.search.toLowerCase();
        rows = rows.filter((r: any) =>
          (r.case_number ?? "").toLowerCase().includes(t) ||
          (r.summary ?? "").toLowerCase().includes(t) ||
          (r.beneficiary?.display_name ?? "").toLowerCase().includes(t) ||
          (r.beneficiary?.first_name ?? "").toLowerCase().includes(t) ||
          (r.beneficiary?.last_name ?? "").toLowerCase().includes(t)
        );
      }
      return rows;
    },
  });
}

export function useBeneficiaryCase(id: string | undefined) {
  return useQuery({
    queryKey: ["beneficiary-case", id],
    enabled: !!id,
    queryFn: async (): Promise<BeneficiaryCase | null> => {
      const { data, error } = await sb
        .from("beneficiary_cases")
        .select("*, beneficiary:beneficiaries(id, display_name, first_name, last_name, unique_id, photo_url)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCaseEntries(caseId: string | undefined) {
  return useQuery({
    queryKey: ["case-entries", caseId],
    enabled: !!caseId,
    queryFn: async (): Promise<CaseEntry[]> => {
      const { data, error } = await sb
        .from("case_entries")
        .select("*")
        .eq("case_id", caseId)
        .is("deleted_at", null)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateCase() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<BeneficiaryCase>) => {
      const orgId = currentOrganization?.organization_id;
      if (!orgId) throw new Error("No organisation");
      if (!input.beneficiary_id) throw new Error("Select a beneficiary");
      const caseNumber = `CASE-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000 + 10000)}`;
      const { data, error } = await sb
        .from("beneficiary_cases")
        .insert({
          organization_id: orgId,
          beneficiary_id: input.beneficiary_id,
          program_id: input.program_id ?? null,
          case_number: input.case_number ?? caseNumber,
          case_type: input.case_type ?? "general_support",
          case_status: input.case_status ?? "open",
          priority: input.priority ?? "normal",
          opened_date: input.opened_date ?? new Date().toISOString().slice(0, 10),
          assigned_to: input.assigned_to ?? user?.id ?? null,
          summary: input.summary ?? null,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as BeneficiaryCase;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beneficiary-cases"] });
      toast({ title: "Case opened" });
    },
    onError: (e: any) => toast({ title: "Failed to open case", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateCase() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<BeneficiaryCase> }) => {
      const upd: any = { ...patch, updated_by: user?.id ?? null };
      if ((patch.case_status === "closed" || patch.case_status === "resolved") && !patch.closed_date) {
        upd.closed_date = new Date().toISOString().slice(0, 10);
      }
      const { data, error } = await sb.from("beneficiary_cases").update(upd).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["beneficiary-case", vars.id] });
      qc.invalidateQueries({ queryKey: ["beneficiary-cases"] });
      toast({ title: "Case updated" });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteCase() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from("beneficiary_cases")
        .update({ deleted_at: new Date().toISOString(), updated_by: user?.id ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["beneficiary-cases"] }),
  });
}

export function useCreateCaseEntry() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<CaseEntry> & { case_id: string; beneficiary_id: string }) => {
      const orgId = currentOrganization?.organization_id;
      if (!orgId) throw new Error("No organisation");
      if (!user?.id) throw new Error("Not authenticated");
      if (!input.summary || !input.summary.trim()) throw new Error("Summary required");
      const { data, error } = await sb
        .from("case_entries")
        .insert({
          organization_id: orgId,
          case_id: input.case_id,
          beneficiary_id: input.beneficiary_id,
          entry_type: input.entry_type ?? "note",
          entry_date: input.entry_date ?? new Date().toISOString().slice(0, 10),
          visit_type: input.visit_type ?? null,
          location_county: input.location_county ?? null,
          location_sub_county: input.location_sub_county ?? null,
          summary: input.summary,
          structured_data: input.structured_data ?? {},
          concern_level: input.concern_level ?? null,
          action_required: input.action_required ?? null,
          follow_up_date: input.follow_up_date ?? null,
          follow_up_completed: input.follow_up_completed ?? false,
          referral_to: input.referral_to ?? null,
          referral_organisation: input.referral_organisation ?? null,
          photos: input.photos ?? [],
          documents: input.documents ?? [],
          entered_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CaseEntry;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["case-entries", vars.case_id] });
      qc.invalidateQueries({ queryKey: ["beneficiary-cases"] });
      toast({ title: "Entry recorded" });
    },
    onError: (e: any) => toast({ title: "Failed to record entry", description: e.message, variant: "destructive" }),
  });
}

export function useCompleteFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entryId, caseId: _c }: { entryId: string; caseId: string }) => {
      const { error } = await sb
        .from("case_entries")
        .update({
          follow_up_completed: true,
          follow_up_completed_date: new Date().toISOString().slice(0, 10),
        })
        .eq("id", entryId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["case-entries", vars.caseId] }),
  });
}