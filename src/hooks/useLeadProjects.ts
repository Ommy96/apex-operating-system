import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { getCachedScope, putCachedScope } from "@/lib/offlineStorage";

export type LeadProject = {
  id: string;
  name: string;
  status: string | null;
  program_id: string | null;
  project_code: string | null;
};

/**
 * Returns projects where the current user is the project lead,
 * the project manager, or a member of project_team_members.
 * Cached offline for the lead workspace.
 */
export function useLeadProjects() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const userId = user?.id;

  const [projects, setProjects] = useState<LeadProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `lead_projects:${orgId}:${userId}`;

    async function load() {
      if (!orgId || !userId) {
        setLoading(false);
        return;
      }
      // hydrate from offline cache first
      const cached = await getCachedScope<LeadProject[]>(cacheKey);
      if (cached && !cancelled) {
        setProjects(cached);
        setLoading(false);
      }

      try {
        const sb = supabase as any;
        const [{ data: owned }, { data: teamRows }] = await Promise.all([
          sb
            .from("projects")
            .select("id,name,status,program_id,project_code,project_lead_id,project_manager_id")
            .eq("organization_id", orgId)
            .is("deleted_at", null)
            .or(`project_lead_id.eq.${userId},project_manager_id.eq.${userId}`),
          sb
            .from("project_team_members")
            .select("project_id,role_on_project")
            .eq("user_id", userId),
        ]);

        const teamProjectIds = (teamRows || [])
          .filter((r: any) => !r.role_on_project || /lead|manager|coordinator/i.test(r.role_on_project))
          .map((r: any) => r.project_id);

        let teamProjects: LeadProject[] = [];
        if (teamProjectIds.length) {
          const { data } = await sb
            .from("projects")
            .select("id,name,status,program_id,project_code")
            .eq("organization_id", orgId)
            .is("deleted_at", null)
            .in("id", teamProjectIds);
          teamProjects = (data as LeadProject[]) || [];
        }

        const map = new Map<string, LeadProject>();
        ([...(owned || []), ...teamProjects] as LeadProject[]).forEach((p) =>
          map.set(p.id, {
            id: p.id,
            name: p.name,
            status: p.status ?? null,
            program_id: p.program_id ?? null,
            project_code: p.project_code ?? null,
          })
        );
        const list = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
        if (!cancelled) {
          setProjects(list);
          setLoading(false);
          await putCachedScope(cacheKey, list);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [orgId, userId]);

  return { projects, loading, isProjectLead: projects.length > 0 };
}