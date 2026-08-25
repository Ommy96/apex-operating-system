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

export interface WaitlistApplicationNeed {
  id: string;
  organization_id: string;
  application_id: string;
  need_type_id: string;
  estimated_cost: number | null;
  currency: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes: string | null;
  need_type?: { id: string; label: string; key: string; default_cost: number | null; default_currency: string | null };
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
        .select("*, beneficiaries:beneficiary_id(id, display_name, first_name, last_name, beneficiary_code), projects:project_id(id, name), programs:program_id(id, name), needs:waitlist_application_needs(*, need_type:need_types(id, key, label, default_cost, default_currency))")
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
    mutationFn: async (
      input: Partial<WaitlistApplication> & {
        id?: string;
        needs?: Array<{
          need_type_id: string;
          estimated_cost?: number | null;
          currency?: string;
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          notes?: string | null;
        }>;
      },
    ) => {
      const orgId = currentOrganization?.organization_id;
      const { needs, ...rest } = input;
      const payload: any = { ...rest, organization_id: orgId };
      const { data, error } = await sb
        .from("waitlist_applications")
        .upsert(payload)
        .select()
        .single();
      if (error) throw error;

      if (needs) {
        // Replace-set the needs (simple + predictable for the form)
        await sb.from("waitlist_application_needs").delete().eq("application_id", data.id);
        if (needs.length > 0) {
          const rows = needs.map((n) => ({
            organization_id: orgId,
            application_id: data.id,
            need_type_id: n.need_type_id,
            estimated_cost: n.estimated_cost ?? null,
            currency: n.currency || "KES",
            priority: n.priority || "normal",
            notes: n.notes || null,
          }));
          const { error: nErr } = await sb.from("waitlist_application_needs").insert(rows);
          if (nErr) throw nErr;
        }
      }
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

      // Needs boost — factor in declared unmet needs
      const { data: needRows } = await sb
        .from("waitlist_application_needs")
        .select("priority, estimated_cost, currency, need_type:need_types(label)")
        .eq("application_id", row.id);
      const needs = (needRows || []) as any[];
      let needsBoost = 0;
      const priorityCounts: Record<string, number> = { low: 0, normal: 0, high: 0, urgent: 0 };
      let unmetCost = 0;
      for (const n of needs) {
        priorityCounts[n.priority] = (priorityCounts[n.priority] || 0) + 1;
        unmetCost += Number(n.estimated_cost || 0);
        if (n.priority === "urgent") needsBoost += 12;
        else if (n.priority === "high") needsBoost += 7;
        else if (n.priority === "normal") needsBoost += 3;
        else needsBoost += 1;
      }
      // Cost tier bonus (KES-normalised assumption): up to +15
      if (unmetCost >= 100000) needsBoost += 15;
      else if (unmetCost >= 50000) needsBoost += 10;
      else if (unmetCost >= 10000) needsBoost += 5;
      score += needsBoost;
      details.needs_boost = needsBoost;
      details.needs_count = needs.length;
      details.needs_priority_counts = priorityCounts;
      details.needs_unmet_cost = unmetCost;
      details.explanation = buildExplanation(details, priorityCounts, unmetCost);

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

function buildExplanation(details: any, counts: Record<string, number>, cost: number): string {
  const parts: string[] = [];
  if (counts.urgent) parts.push(`${counts.urgent} urgent need${counts.urgent > 1 ? "s" : ""}`);
  if (counts.high) parts.push(`${counts.high} high-priority`);
  if (cost > 0) parts.push(`KSh ${cost.toLocaleString()} unmet`);
  if (details.source === "eligibility_engine") parts.push("eligibility engine matched");
  return parts.join(" · ") || "Baseline score";
}

/**
 * Match & enroll a waitlist applicant end-to-end:
 *  1. Create the beneficiary if none linked (using captured application fields + auto beneficiary_code).
 *  2. Copy application needs to beneficiary_needs.
 *  3. Create a beneficiary_services enrollment into the chosen project.
 *  4. Optionally create a beneficiary_donors sponsorship with package.
 *  5. Auto-trigger updates keep the needs' met status in sync.
 *  6. Only mark the application 'enrolled' after everything above succeeds.
 */
export function useMatchAndEnroll() {
  const qc = useQueryClient();
  const { currentOrganization } = useOrganization();
  return useMutation({
    mutationFn: async (args: {
      application: WaitlistApplication;
      projectId: string;
      packageId?: string;
      packageCost?: number;
      donorAccountId?: string;
      donorName?: string;
    }) => {
      const orgId = currentOrganization?.organization_id;
      if (!orgId) throw new Error("No organization context");
      const { application, projectId, packageId, packageCost, donorAccountId, donorName } = args;
      if (!projectId) throw new Error("Please select a project to enroll into");

      // Verify project belongs to org (cross-org isolation)
      const { data: project, error: pErr } = await sb
        .from("projects")
        .select("id, name, organization_id, program_id")
        .eq("id", projectId)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!project || project.organization_id !== orgId) {
        throw new Error("Selected project not found for this organization");
      }

      // 1) Beneficiary — create if not linked
      let beneficiaryId = application.beneficiary_id;
      let createdBeneficiary = false;
      if (!beneficiaryId) {
        const rawName = (application.applicant_name || "").trim();
        if (!rawName) throw new Error("Applicant name is required to create a beneficiary");
        const parts = rawName.split(/\s+/);
        const first = parts[0];
        const last = parts.length > 1 ? parts.slice(1).join(" ") : "";
        const dob = application.applicant_age != null
          ? new Date(new Date().getFullYear() - Number(application.applicant_age), 0, 1).toISOString().slice(0, 10)
          : null;
        const { data: newBen, error: bErr } = await sb
          .from("beneficiaries")
          .insert({
            organization_id: orgId,
            beneficiary_type: "individual",
            display_name: rawName,
            first_name: first,
            last_name: last || null,
            date_of_birth: dob,
            sub_county: application.applicant_location || null,
            location: application.applicant_location || null,
            status: "active",
            lifecycle_stage: "active",
            lifecycle_changed_at: new Date().toISOString(),

            year_enrolled: new Date().getFullYear(),
            background_narrative: application.applicant_notes || null,
          })
          .select("id, beneficiary_code")
          .single();
        if (bErr) throw new Error(`Failed to create beneficiary: ${bErr.message}`);
        beneficiaryId = newBen.id;
        createdBeneficiary = true;
      }

      // 2) Copy application needs into beneficiary_needs (skip existing)
      const { data: appNeeds, error: anErr } = await sb
        .from("waitlist_application_needs")
        .select("need_type_id, estimated_cost, currency, priority, notes")
        .eq("application_id", application.id);
      if (anErr) throw anErr;
      if ((appNeeds || []).length > 0) {
        const { data: existing } = await sb
          .from("beneficiary_needs")
          .select("need_type_id")
          .eq("beneficiary_id", beneficiaryId);
        const existingSet = new Set((existing || []).map((r: any) => r.need_type_id));
        const rows = (appNeeds as any[])
          .filter((n) => !existingSet.has(n.need_type_id))
          .map((n) => ({
            organization_id: orgId,
            beneficiary_id: beneficiaryId,
            need_type_id: n.need_type_id,
            estimated_cost: n.estimated_cost,
            currency: n.currency || "KES",
            priority: n.priority || "normal",
            notes: n.notes,
            status: "unmet",
          }));
        if (rows.length > 0) {
          const { error: bnErr } = await sb.from("beneficiary_needs").insert(rows);
          if (bnErr) throw new Error(`Failed to copy needs: ${bnErr.message}`);
        }
      }

      // 3) Enrollment into project (idempotent on beneficiary+project)
      const { data: existingEnroll } = await sb
        .from("beneficiary_services")
        .select("id")
        .eq("beneficiary_id", beneficiaryId)
        .eq("project_id", projectId)
        .maybeSingle();
      let enrollmentId = existingEnroll?.id as string | undefined;
      if (!enrollmentId) {
        const { data: enrollRow, error: eErr } = await sb
          .from("beneficiary_services")
          .insert({
            organization_id: orgId,
            beneficiary_id: beneficiaryId,
            project_id: projectId,
            program_id: project.program_id ?? application.program_id ?? null,
            enrolled_date: new Date().toISOString().slice(0, 10),
            status: "active",
            notes: `Enrolled from waiting list (application ${application.id})`,
          })
          .select("id")
          .single();
        if (eErr) {
          if (createdBeneficiary) {
            await sb.from("beneficiaries").delete().eq("id", beneficiaryId);
          }
          throw new Error(`Failed to enroll into project: ${eErr.message}`);
        }
        enrollmentId = enrollRow.id;
      }

      // 4) Sponsorship (optional)
      let sponsorshipId: string | null = null;
      if (packageId) {
        const { data: sponsor, error: sErr } = await sb
          .from("beneficiary_donors")
          .insert({
            organization_id: orgId,
            beneficiary_id: beneficiaryId,
            program_id: project.program_id ?? application.program_id ?? null,
            sponsorship_package_id: packageId,
            donor_name: donorName || "Package sponsor",
            amount_received: packageCost ?? 0,
            donation_date: new Date().toISOString().slice(0, 10),
            notes: `Enrolled from waiting list · package cost ${packageCost ?? 0}`,
          })
          .select("id")
          .single();
        if (sErr) throw new Error(`Failed to create sponsorship: ${sErr.message}`);
        sponsorshipId = sponsor.id;
      }

      // 4b) Sponsor RELATIONSHIP — who is personally connected (separate from the money)
      if (donorAccountId || donorName) {
        const { error: srErr } = await sb.from("sponsor_relationships").insert({
          organization_id: orgId,
          beneficiary_id: beneficiaryId,
          donor_account_id: donorAccountId || null,
          donor_name: donorName || null,
          package_id: packageId || null,
          relationship_type: "primary",
          started_on: new Date().toISOString().slice(0, 10),
          status: "active",
          notes: `Matched from waiting list (application ${application.id})`,
        });
        if (srErr) throw new Error(`Failed to create sponsor relationship: ${srErr.message}`);
      }

      // 4c) Lifecycle — the applicant is now an active beneficiary
      const { error: lErr } = await sb
        .from("beneficiaries")
        .update({
          lifecycle_stage: "active",
          lifecycle_changed_at: new Date().toISOString(),
          status: "active",
        })
        .eq("id", beneficiaryId);
      if (lErr) throw new Error(`Failed to activate beneficiary: ${lErr.message}`);



      // 5) Finally, mark the application enrolled with everything linked
      const { data, error } = await sb
        .from("waitlist_applications")
        .update({
          beneficiary_id: beneficiaryId,
          project_id: projectId,
          program_id: project.program_id ?? application.program_id ?? null,
          matched_package_id: packageId || null,
          matched_donor_id: donorAccountId || null,
          matched_at: new Date().toISOString(),
          enrolled_at: new Date().toISOString(),
          status: "enrolled",
        })
        .eq("id", application.id)
        .select()
        .single();
      if (error) throw error;
      return { application: data, beneficiaryId, enrollmentId, sponsorshipId, createdBeneficiary };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["waitlist"] });
      qc.invalidateQueries({ queryKey: ["beneficiary-coverage"] });
      qc.invalidateQueries({ queryKey: ["beneficiaries"] });
      qc.invalidateQueries({ queryKey: ["beneficiary-needs", res?.beneficiaryId] });
      qc.invalidateQueries({ queryKey: ["beneficiary_services"] });
      qc.invalidateQueries({ queryKey: ["project-beneficiary-count"] });
      toast.success(res?.createdBeneficiary ? "Beneficiary created & enrolled" : "Enrolled");
    },
    onError: (e: any) => toast.error(e.message || "Enrollment failed"),
  });
}

/** Projects for the org that address a given need type (empty needTypeId returns all). */
export function useProjectsForNeed(needTypeId?: string | null) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    enabled: !!orgId,
    queryKey: ["projects-for-need", orgId, needTypeId || "all"],
    queryFn: async () => {
      let q = sb
        .from("projects")
        .select("id, name, addresses_need_type_id, status")
        .eq("organization_id", orgId)
        .neq("status", "archived")
        .order("name");
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string; addresses_need_type_id: string | null; status: string }>;
    },
  });
}