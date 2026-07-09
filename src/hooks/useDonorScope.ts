import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type ScopeKind = "beneficiary" | "project" | "program" | "unrestricted";

export interface DonorScopeEntry {
  kind: ScopeKind;
  targetId: string | null;
  targetName: string;
  restriction: "restricted" | "unrestricted" | "time_restricted";
  totalGiven: number; // in base currency
  currency: string;
}

export interface DonorScopeResult {
  scopes: DonorScopeEntry[];
  hasBeneficiary: boolean;
  hasProject: boolean;
  hasProgram: boolean;
  hasUnrestricted: boolean;
}

/**
 * Detects a donor's funding scope(s) from donation_intents + allocations.
 * A donor can hit multiple scopes simultaneously.
 *
 * `donorAccountId` is the id from `donor_accounts` (portal identity).
 */
export function useDonorScope(donorAccountId: string | null | undefined) {
  return useQuery<DonorScopeResult>({
    queryKey: ["donor-scope", donorAccountId],
    enabled: !!donorAccountId,
    queryFn: async () => {
      const empty: DonorScopeResult = {
        scopes: [],
        hasBeneficiary: false,
        hasProject: false,
        hasProgram: false,
        hasUnrestricted: false,
      };
      if (!donorAccountId) return empty;

      // Intents declare the donor's intent; allocations are how funds actually landed.
      const [{ data: intents = [] }, { data: allocs = [] }] = await Promise.all([
        sb
          .from("donation_intents")
          .select(
            "id, kind, restriction, target_beneficiary_id, target_program_id, target_project_id, committed_amount, committed_currency",
          )
          .eq("donor_account_id", donorAccountId),
        sb
          .from("allocations")
          .select(
            "id, scope, restriction, beneficiary_id, project_id, program_id, amount_base, base_currency",
          )
          .eq("donor_account_id", donorAccountId),
      ]);

      // Aggregate into scope buckets keyed by kind+targetId
      const map = new Map<string, DonorScopeEntry>();
      const bump = (
        kind: ScopeKind,
        targetId: string | null,
        restriction: string | null,
        amount: number,
        currency: string,
      ) => {
        const key = `${kind}:${targetId ?? "-"}`;
        const cur =
          map.get(key) ??
          ({
            kind,
            targetId,
            targetName: "",
            restriction: (restriction as any) || (kind === "unrestricted" ? "unrestricted" : "restricted"),
            totalGiven: 0,
            currency,
          } as DonorScopeEntry);
        cur.totalGiven += Number(amount) || 0;
        map.set(key, cur);
      };

      for (const i of intents as any[]) {
        const amt = Number(i.committed_amount) || 0;
        const ccy = i.committed_currency || "KES";
        if (i.target_beneficiary_id) bump("beneficiary", i.target_beneficiary_id, i.restriction, amt, ccy);
        else if (i.target_project_id) bump("project", i.target_project_id, i.restriction, amt, ccy);
        else if (i.target_program_id) bump("program", i.target_program_id, i.restriction, amt, ccy);
        else bump("unrestricted", null, "unrestricted", amt, ccy);
      }
      for (const a of allocs as any[]) {
        const amt = Number(a.amount_base) || 0;
        const ccy = a.base_currency || "KES";
        if (a.beneficiary_id) bump("beneficiary", a.beneficiary_id, a.restriction, amt, ccy);
        else if (a.project_id) bump("project", a.project_id, a.restriction, amt, ccy);
        else if (a.program_id && a.scope !== "program_unrestricted")
          bump("program", a.program_id, a.restriction, amt, ccy);
        else if (a.program_id && a.scope === "program_unrestricted")
          bump("program", a.program_id, "unrestricted", amt, ccy);
        else bump("unrestricted", null, "unrestricted", amt, ccy);
      }

      // Hydrate target names
      const beneficiaryIds = [...map.values()].filter((s) => s.kind === "beneficiary" && s.targetId).map((s) => s.targetId!);
      const projectIds = [...map.values()].filter((s) => s.kind === "project" && s.targetId).map((s) => s.targetId!);
      const programIds = [...map.values()].filter((s) => s.kind === "program" && s.targetId).map((s) => s.targetId!);

      const [bn, pj, pg] = await Promise.all([
        beneficiaryIds.length
          ? sb.from("beneficiaries").select("id, display_name").in("id", beneficiaryIds)
          : Promise.resolve({ data: [] }),
        projectIds.length
          ? sb.from("projects").select("id, name").in("id", projectIds)
          : Promise.resolve({ data: [] }),
        programIds.length
          ? sb.from("programs").select("id, name").in("id", programIds)
          : Promise.resolve({ data: [] }),
      ]);
      const nameByBen = new Map(((bn as any).data ?? []).map((r: any) => [r.id, r.display_name]));
      const nameByProj = new Map(((pj as any).data ?? []).map((r: any) => [r.id, r.name]));
      const nameByProg = new Map(((pg as any).data ?? []).map((r: any) => [r.id, r.name]));

      for (const s of map.values()) {
        if (s.kind === "beneficiary") s.targetName = (nameByBen.get(s.targetId!) as string) || "Beneficiary";
        else if (s.kind === "project") s.targetName = (nameByProj.get(s.targetId!) as string) || "Project";
        else if (s.kind === "program") s.targetName = (nameByProg.get(s.targetId!) as string) || "Programme";
        else s.targetName = "Organisation-wide";
      }

      const scopes = [...map.values()].filter((s) => s.totalGiven > 0 || s.kind !== "unrestricted" || map.size === 1);
      return {
        scopes,
        hasBeneficiary: scopes.some((s) => s.kind === "beneficiary"),
        hasProject: scopes.some((s) => s.kind === "project"),
        hasProgram: scopes.some((s) => s.kind === "program"),
        hasUnrestricted: scopes.some((s) => s.kind === "unrestricted"),
      };
    },
  });
}