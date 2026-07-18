import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { toast } from "sonner";

const sb = supabase as any;

export type WaitlistStatus =
  | "application"
  | "assessment"
  | "scoring"
  | "waiting_list"
  | "funding_match"
  | "enrolled"
  | "declined";

export const WAITLIST_STAGES: { key: WaitlistStatus; label: string }[] = [
  { key: "application", label: "Application" },
  { key: "assessment", label: "Assessment" },
  { key: "scoring", label: "Scoring" },
  { key: "waiting_list", label: "Waiting list" },
  { key: "funding_match", label: "Funding match" },
  { key: "enrolled", label: "Enrolled" },
];

export interface WaitlistApplication {
  id: string;
  organization_id: string;
  beneficiary_id: string | null;
  applicant_name: string | null;
  applicant_age: number | null;
  applicant_location: string | null;
  applicant_notes: string | null;
  guardian_contact: string | null;
  program_id: string | null;
  project_id: string | null;
  status: WaitlistStatus;
  vulnerability_score: number;
  score_details: any;
  applied_at: string;
  scored_at: string | null;
  matched_at: string | null;
  enrolled_at: string | null;
  matched_package_id: string | null;
  matched_donor_id: string | null;
}

export function useWaitlist() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    enabled: !!orgId,
    queryKey: ["waitlist", orgId],
    queryFn: async (): Promise<WaitlistApplication[]> => {
      const { data, error } = await sb
        .from("waitlist_applications")
        .select("*, beneficiaries:beneficiary_id(id, display_name, first_name, last_name), projects:project_id(id, name), programs:program_id(id, name)")
        .eq("organization_id", orgId)
        .order("vulnerability_score", { ascending: false });
      if (error) throw error;
      return (data || []) as any;
    },
  });
}

export function useUpsertWaitlist() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  return useMutation({
    mutationFn: async (input: Partial<WaitlistApplication> & { id?: string }) => {
      const orgId = currentOrganization?.organization_id;
      const payload = { ...input, organization_id: orgId };
      const { data, error } = await sb
        .from("waitlist_applications")
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success("Application saved");
    },
    onError: (e: any) => toast.error(e.message || "Save failed"),
  });
}

export function useTransitionWaitlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; status: WaitlistStatus; extra?: Record<string, any> }) => {
      const patch: any = { status: args.status, ...(args.extra || {}) };
      if (args.status === "scoring") patch.scored_at = new Date().toISOString();
      if (args.status === "funding_match") patch.matched_at = new Date().toISOString();
      if (args.status === "enrolled") patch.enrolled_at = new Date().toISOString();
      const { data, error } = await sb
        .from("waitlist_applications")
        .update(patch)
        .eq("id", args.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["waitlist"] }),
    onError: (e: any) => toast.error(e.message || "Update failed"),
  });
}

/**
 * Compute vulnerability score for a waitlist entry.
 * Reuses the eligibility-scoring engine when a linked beneficiary + project exist;
 * otherwise falls back to a simple rubric based on captured applicant fields.
 */
export function useScoreWaitlist() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  return useMutation({
    mutationFn: async (row: WaitlistApplication) => {
      const orgId = currentOrganization?.organization_id;
      let score = 0;
      const details: any = {};

      if (row.beneficiary_id && row.project_id) {
        // Delegate to the shared eligibility engine
        const { data, error } = await supabase.functions.invoke("eligibility-scoring", {
          body: {
            mode: "beneficiary_project",
            organizationId: orgId,
            beneficiaryId: row.beneficiary_id,
            projectId: row.project_id,
          },
        });
        if (error) throw error;
        // Fetch the computed row
        const { data: srow } = await sb
          .from("beneficiary_eligibility_scores")
          .select("score, max_score, matched_rules")
          .eq("beneficiary_id", row.beneficiary_id)
          .eq("project_id", row.project_id)
          .maybeSingle();
        score = srow?.score ?? 0;
        details.source = "eligibility_engine";
        details.max_score = srow?.max_score ?? 0;
        details.matched = srow?.matched_rules ?? [];
      } else {
        // Fallback rubric — age < 12: +30, age < 18: +15; missing guardian: +20; notes contain "orphan/disab/single": +25
        const age = Number(row.applicant_age ?? 99);
        if (age <= 12) score += 30;
        else if (age < 18) score += 15;
        if (!row.guardian_contact) score += 20;
        const notes = (row.applicant_notes || "").toLowerCase();
        if (/orphan|disab|single parent|no parent/.test(notes)) score += 25;
        details.source = "fallback_rubric";
      }

      const { data, error } = await sb
        .from("waitlist_applications")
        .update({
          vulnerability_score: score,
          score_details: details,
          scored_at: new Date().toISOString(),
          status: row.status === "application" || row.status === "assessment" ? "waiting_list" : row.status,
        })
        .eq("id", row.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waitlist"] });
      toast.success("Scored");
    },
    onError: (e: any) => toast.error(e.message || "Scoring failed"),
  });
}

/**
 * Match a package + optional donor to a waitlist entry and enroll.
 * Creates a beneficiary_donors row (if beneficiary exists) so the amount flows
 * through the existing sponsorship pipeline / Allocation Engine.
 */
export function useMatchAndEnroll() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  return useMutation({
    mutationFn: async (args: {
      application: WaitlistApplication;
      packageId: string;
      packageCost: number;
      donorAccountId?: string;
      donorName?: string;
    }) => {
      const orgId = currentOrganization?.organization_id;
      const { application, packageId, packageCost, donorAccountId, donorName } = args;

      // Create beneficiary_donors row if we have a beneficiary
      if (application.beneficiary_id) {
        await sb.from("beneficiary_donors").insert({
          organization_id: orgId,
          beneficiary_id: application.beneficiary_id,
          program_id: application.program_id,
          sponsorship_package_id: packageId,
          donor_name: donorName || "Package sponsor",
          amount_received: packageCost,
          donation_date: new Date().toISOString().slice(0, 10),
          notes: `Enrolled from waiting list · package cost ${packageCost}`,
        });
      }

      const { data, error } = await sb
        .from("waitlist_applications")
        .update({
          matched_package_id: packageId,
          matched_donor_id: donorAccountId || null,
          matched_at: new Date().toISOString(),
          enrolled_at: new Date().toISOString(),
          status: "enrolled",
        })
        .eq("id", application.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["waitlist"] });
      qc.invalidateQueries({ queryKey: ["beneficiary-coverage"] });
      toast.success("Enrolled — sponsorship created");
    },
    onError: (e: any) => toast.error(e.message || "Enrollment failed"),
  });
}