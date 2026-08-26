import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrgStaffMember {
  user_id: string;
  role: string | null;
  full_name: string | null;
  email: string | null;
  job_title: string | null;
  label: string;
}

/**
 * Canonical source of assignable people for an organisation:
 * organization_members (membership + org role) joined in code to profiles
 * (name / email / job title).
 *
 * NOTE: there is NO foreign key between organization_members.user_id and
 * profiles.user_id, so PostgREST cannot embed `profiles(...)` — that embed
 * fails with a relationship error and, when the error is discarded, renders
 * a silently blank dropdown. Always fetch the two tables separately.
 */
export function useOrgStaff(orgId?: string) {
  return useQuery({
    queryKey: ["org-staff", orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async (): Promise<OrgStaffMember[]> => {
      const { data: members, error: membersError } = await supabase
        .from("organization_members")
        .select("user_id, role, is_active")
        .eq("organization_id", orgId!);
      if (membersError) throw membersError;

      const active = (members || []).filter(
        (m: any) => m.is_active === undefined || m.is_active === null || m.is_active === true,
      );
      const ids = active.map((m: any) => m.user_id).filter(Boolean);
      if (ids.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, job_title")
        .in("user_id", ids);
      if (profilesError) throw profilesError;

      const byUser = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return active.map((m: any) => {
        const p: any = byUser.get(m.user_id);
        return {
          user_id: m.user_id,
          role: m.role ?? null,
          full_name: p?.full_name ?? null,
          email: p?.email ?? null,
          job_title: p?.job_title ?? null,
          label: p?.full_name || p?.email || "Unnamed member",
        };
      }).sort((a, b) => a.label.localeCompare(b.label));
    },
  });
}
