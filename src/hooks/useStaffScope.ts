import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import { isReach, DEPARTMENT_DATA_REACH } from '@/lib/staffScope';

export interface ScopedUnit { id: string; name: string; isLead: boolean; programId?: string | null }
export interface ScopedDepartment { id: string; name: string; orgWide: boolean; modules: string[]; isLead: boolean }
export interface StaffScope {
  orgReach: boolean;
  programIds: string[];
  projectIds: string[];
  programmes: ScopedUnit[];
  projects: ScopedUnit[];
  departments: ScopedDepartment[];
}

/** The signed-in user's links, resolved by the server's single scope definition (my_scope RPC). */
export function useStaffScope() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const userId = user?.id;
  return useQuery({
    queryKey: ['staff-scope', orgId, userId],
    enabled: !!orgId && !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<StaffScope> => {
      const fail = (e: { message: string }): never => {
        toast({ title: 'Could not load your workspace scope', description: e.message, variant: 'destructive' });
        throw e;
      };
      const { data: s, error } = await supabase.rpc('my_scope' as any);
      if (error) fail(error);
      const scope = (s ?? {}) as { org_reach?: boolean; program_ids?: string[]; project_ids?: string[] };
      const today = new Date().toISOString().slice(0, 10);
      const live = (d: string | null) => !d || d > today;

      const { data: pt, error: ptErr } = await supabase.from('programme_team')
        .select('program_id, project_id, is_lead, end_date').eq('org_id', orgId!).eq('staff_id', userId!);
      if (ptErr) fail(ptErr);
      const { data: ptm, error: ptmErr } = await supabase.from('project_team_members')
        .select('project_id, is_lead, end_date').eq('user_id', userId!);
      if (ptmErr) fail(ptmErr);
      const { data: dm, error: dmErr } = await (supabase.from as any)('department_members')
        .select('department_id, is_lead, end_date, departments(id, name, data_reach, modules, is_active)')
        .eq('organization_id', orgId!).eq('user_id', userId!);
      if (dmErr) fail(dmErr);

      const programLead = new Set((pt ?? []).filter((r: any) => live(r.end_date) && r.is_lead && !r.project_id).map((r: any) => r.program_id));
      const directProjects = new Set([
        ...(ptm ?? []).filter((r: any) => live(r.end_date)).map((r: any) => r.project_id),
        ...(pt ?? []).filter((r: any) => live(r.end_date) && r.project_id).map((r: any) => r.project_id),
      ]);
      const projectLead = new Set((ptm ?? []).filter((r: any) => live(r.end_date) && r.is_lead).map((r: any) => r.project_id));

      const programIds = scope.program_ids ?? [];
      const projectIds = scope.project_ids ?? [];
      const { data: progs, error: gErr } = programIds.length
        ? await supabase.from('programs').select('id, name').in('id', programIds)
        : { data: [] as any[], error: null };
      if (gErr) fail(gErr);
      // Only projects the user is directly linked to get their own card; programme-wide projects show under the programme.
      const cardProjects = projectIds.filter((id) => directProjects.has(id));
      const { data: projs, error: pErr } = cardProjects.length
        ? await supabase.from('projects').select('id, name, program_id').in('id', cardProjects)
        : { data: [] as any[], error: null };
      if (pErr) fail(pErr);

      return {
        orgReach: !!scope.org_reach,
        programIds,
        projectIds,
        programmes: (progs ?? []).map((p: any) => ({ id: p.id, name: p.name, isLead: programLead.has(p.id) })),
        projects: (projs ?? []).map((p: any) => ({ id: p.id, name: p.name, programId: p.program_id, isLead: projectLead.has(p.id) || programLead.has(p.program_id) })),
        departments: (dm ?? []).filter((r: any) => live(r.end_date) && r.departments?.is_active).map((r: any) => ({
          id: r.departments.id, name: r.departments.name, modules: r.departments.modules ?? [], isLead: !!r.is_lead,
          orgWide: isReach(r.departments.data_reach, DEPARTMENT_DATA_REACH.ORGANIZATION),
        })),
      };
    },
  });
}
