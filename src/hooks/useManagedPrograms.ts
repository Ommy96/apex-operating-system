import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

const sb = supabase as any;

export type ManagedProgram = {
  id: string;
  name: string;
  status: string | null;
  primary_sector: string | null;
  total_budget: number | null;
  currency: string | null;
  start_date: string | null;
  end_date: string | null;
};

/**
 * Programs the current user manages — either as the recorded program manager
 * (`programs.program_manager_id`) or via a `programme_team` row scoped to the
 * program (no project_id) with a manager-ish role. Cross-org isolated through
 * `useOrganization`.
 */
export function useManagedPrograms() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const userId = user?.id;

  return useQuery<{ programs: ManagedProgram[]; isProgramManager: boolean }>({
    queryKey: ["managed-programs", orgId, userId],
    enabled: !!orgId && !!userId,
    queryFn: async () => {
      const [owned, teamRows] = await Promise.all([
        sb
          .from("programs")
          .select("id,name,status,primary_sector,total_budget,currency,start_date,end_date")
          .eq("organization_id", orgId)
          .is("deleted_at", null)
          .eq("program_manager_id", userId),
        sb
          .from("programme_team")
          .select("program_id,role,is_lead,project_id")
          .eq("org_id", orgId)
          .eq("staff_id", userId)
          .is("project_id", null),
      ]);

      const teamProgramIds = ((teamRows.data as any[]) || [])
        .filter((r) => r.is_lead || /manager|lead|coordinator|director/i.test(r.role || ""))
        .map((r) => r.program_id)
        .filter(Boolean);

      let extra: ManagedProgram[] = [];
      if (teamProgramIds.length) {
        const { data } = await sb
          .from("programs")
          .select("id,name,status,primary_sector,total_budget,currency,start_date,end_date")
          .eq("organization_id", orgId)
          .is("deleted_at", null)
          .in("id", teamProgramIds);
        extra = (data as ManagedProgram[]) || [];
      }

      const map = new Map<string, ManagedProgram>();
      for (const p of [...((owned.data as ManagedProgram[]) || []), ...extra]) map.set(p.id, p);
      const programs = [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
      return { programs, isProgramManager: programs.length > 0 };
    },
    staleTime: 60_000,
  });
}
