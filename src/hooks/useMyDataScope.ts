import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/hooks/use-toast';
import { resolveViewScope } from '@/lib/dataScope';

export interface MyDataScope {
  scope: 'organization' | 'program' | 'project' | 'none';
  programIds: string[];
  projectIds: string[];
  names: string[];
}

/** What the signed-in user's figures cover. Server RLS is the enforcement; this only labels and filters. */
export function useMyDataScope() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { isOrgAdmin, isSuperAdmin } = usePermissions();
  const orgId = currentOrganization?.organization_id;
  const userId = user?.id;
  const elevated = isOrgAdmin || isSuperAdmin;

  return useQuery({
    queryKey: ['my-data-scope', orgId, userId, elevated],
    enabled: !!orgId && !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<MyDataScope> => {
      if (elevated) return { scope: 'organization', programIds: [], projectIds: [], names: [] };
      const fail = (e: { message: string }) => {
        toast({ title: 'Could not load your access scope', description: e.message, variant: 'destructive' });
        throw e;
      };
      const { data: roles, error: rErr } = await supabase
        .from('rbac_user_role_assignments')
        .select('is_active, rbac_roles!inner(data_scope, is_active)')
        .eq('user_id', userId!).eq('organization_id', orgId!).eq('is_active', true);
      if (rErr) fail(rErr);
      const scopes = (roles ?? []).filter((r: any) => r.rbac_roles?.is_active).map((r: any) => r.rbac_roles?.data_scope as string);
      const scope = resolveViewScope(scopes, false);
      if (scope === 'organization' || scope === 'none') return { scope, programIds: [], projectIds: [], names: [] };

      const today = new Date().toISOString().slice(0, 10);
      const { data: pt, error: ptErr } = await supabase
        .from('programme_team').select('program_id, project_id, end_date')
        .eq('org_id', orgId!).eq('staff_id', userId!);
      if (ptErr) fail(ptErr);
      const { data: ptm, error: ptmErr } = await supabase
        .from('project_team_members').select('project_id, end_date').eq('user_id', userId!);
      if (ptmErr) fail(ptmErr);
      const live = (d: string | null) => !d || d > today;
      const projectIds = [...new Set([
        ...(ptm ?? []).filter((r) => live(r.end_date)).map((r) => r.project_id),
        ...(pt ?? []).filter((r: any) => live(r.end_date) && r.project_id).map((r: any) => r.project_id),
      ].filter(Boolean))] as string[];

      const { data: projects, error: pErr } = projectIds.length
        ? await supabase.from('projects').select('id, name, program_id').eq('organization_id', orgId!).in('id', projectIds)
        : { data: [] as any[], error: null };
      if (pErr) fail(pErr);
      const programIds = [...new Set([
        ...(pt ?? []).filter((r: any) => live(r.end_date)).map((r: any) => r.program_id),
        ...(projects ?? []).map((p: any) => p.program_id),
      ].filter(Boolean))] as string[];

      if (scope === 'project') {
        return { scope, programIds, projectIds, names: (projects ?? []).map((p: any) => p.name) };
      }
      const { data: programs, error: gErr } = programIds.length
        ? await supabase.from('programs').select('id, name').in('id', programIds)
        : { data: [] as any[], error: null };
      if (gErr) fail(gErr);
      return { scope, programIds, projectIds, names: (programs ?? []).map((p: any) => p.name) };
    },
  });
}
