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
 * a silently blank dropdown. Reads go through the `list_org_staff` RPC, which
 * is org-scoped and returns only name/email/job title (no PII).
 */
export function useOrgStaff(orgId?: string) {
  return useQuery({
    queryKey: ["org-staff", orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async (): Promise<OrgStaffMember[]> => {
      const { data, error } = await supabase.rpc("list_org_staff", { _org_id: orgId! });
      if (error) throw error;
      return (data || []).map((m: any) => ({
        user_id: m.user_id,
        role: m.org_role ?? null,
        full_name: m.full_name ?? null,
        email: m.email ?? null,
        job_title: m.job_title ?? null,
        label: m.full_name || m.email || "Unnamed member",
      }));
    },
  });
}
