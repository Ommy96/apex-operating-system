import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import { useStaffScope, type ScopedUnit } from '@/hooks/useStaffScope';
import { buildScopeHeadline, hasAnyLink, EMPTY_WORKSPACE_MESSAGE } from '@/lib/staffScope';
import { TASK_STATUSES, CASE_STATUSES } from '@/lib/workManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Layers, FolderKanban, ListChecks, FileText, Building2, Activity, Plus, ClipboardList } from 'lucide-react';

const CLOSED_TASKS = [TASK_STATUSES[3], TASK_STATUSES[4]].map((s) => s.toLowerCase());
const CLOSED_CASES = [CASE_STATUSES[3], CASE_STATUSES[4]].map((s) => s.toLowerCase());

function fail(title: string, e: { message: string }): never {
  toast({ title, description: e.message, variant: 'destructive' });
  throw e;
}

interface UnitStats { reached: number; activitiesThisMonth: number; reportsDue: number | null; openCases: number | null }

async function unitStats(orgId: string, kind: 'program' | 'project', u: ScopedUnit): Promise<UnitStats> {
  const col = kind === 'program' ? 'program_id' : 'project_id';
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const { data: svc, error: sErr } = await supabase.from('beneficiary_services').select('beneficiary_id')
    .eq('organization_id', orgId).eq(col, u.id).limit(5000);
  if (sErr) fail('Could not load beneficiaries reached', sErr);
  const { count: acts, error: aErr } = await supabase.from('activities').select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId).eq(col, u.id).gte('scheduled_at', monthStart.toISOString());
  if (aErr) fail('Could not load activities', aErr);
  const { count: obligations, error: oErr } = await (supabase.from as any)('reporting_obligations')
    .select('id', { count: 'exact', head: true }).eq('organization_id', orgId).eq(col, u.id).eq('is_active', true).is('deleted_at', null);
  let openCases: number | null = null;
  if (kind === 'program') {
    const { data: cases, error: cErr } = await supabase.from('beneficiary_cases').select('case_status')
      .eq('organization_id', orgId).eq('program_id', u.id).is('deleted_at', null).limit(5000);
    if (cErr) fail('Could not load cases', cErr);
    openCases = (cases ?? []).filter((c: any) => !CLOSED_CASES.includes(String(c.case_status ?? '').toLowerCase())).length;
  }
  return {
    reached: new Set((svc ?? []).map((r: any) => r.beneficiary_id)).size,
    activitiesThisMonth: acts ?? 0,
    reportsDue: oErr ? null : obligations ?? 0,
    openCases,
  };
}

function UnitCard({ orgId, kind, unit }: { orgId: string; kind: 'program' | 'project'; unit: ScopedUnit }) {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['workspace-unit', orgId, kind, unit.id],
    queryFn: () => unitStats(orgId, kind, unit),
  });
  const Icon = kind === 'program' ? Layers : FolderKanban;
  const stat = (label: string, v: number | null | undefined) => (
    <div><p className="text-lg font-semibold tabular-nums">{v ?? '—'}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>
  );
  return (
    <Card role="button" tabIndex={0} className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => navigate(`/${kind === 'program' ? 'programs' : 'projects'}/dashboard/${unit.id}`)}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/${kind === 'program' ? 'programs' : 'projects'}/dashboard/${unit.id}`); }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" /> <span className="truncate">{unit.name}</span>
          {unit.isLead && <Badge variant="secondary" className="ml-auto">Lead</Badge>}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">{kind === 'program' ? 'Programme' : 'Project'}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-10 w-full" /> : (
          <div className="grid grid-cols-4 gap-2">
            {stat('Reached', data?.reached)}
            {stat('Activities this month', data?.activitiesThisMonth)}
            {stat('Reporting obligations', data?.reportsDue)}
            {stat('Open cases', data?.openCases)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ScopedWorkspaceOverview({ onRecordVisit }: { onRecordVisit: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const { data: scope, isLoading } = useStaffScope();

  const { data: tasks = [], isLoading: tLoading } = useQuery({
    queryKey: ['workspace-my-tasks', orgId, user?.id],
    enabled: !!orgId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('staff_tasks').select('id, title, status, due_date, priority')
        .eq('organization_id', orgId!).eq('assigned_to', user!.id).order('due_date', { ascending: true, nullsFirst: false }).limit(50);
      if (error) fail('Could not load your tasks', error);
      return (data ?? []).filter((t: any) => !CLOSED_TASKS.includes(String(t.status ?? '').toLowerCase())).slice(0, 8);
    },
  });

  const { data: owed } = useQuery({
    queryKey: ['workspace-reports-owed', orgId, user?.id],
    enabled: !!orgId && !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase.from as any)('reporting_obligations')
        .select('id, cadence, scope_type, form_id').eq('organization_id', orgId!).eq('user_id', user!.id).eq('is_active', true).is('deleted_at', null);
      if (error) return null; // table unavailable → block hidden, never faked
      return data as any[];
    },
  });

  const { data: recent = [] } = useQuery({
    queryKey: ['workspace-recent', orgId, scope?.projectIds, scope?.programIds],
    enabled: !!orgId && !!scope,
    queryFn: async () => {
      const { data, error } = await supabase.from('activities').select('id, name, status, scheduled_at, project_id, program_id')
        .eq('organization_id', orgId!).order('updated_at', { ascending: false }).limit(8);
      if (error) fail('Could not load recent activity', error);
      return data ?? [];
    },
  });

  const meDept = scope?.departments.find((d) => d.modules.map((m) => m.toLowerCase()).includes('indicators'));
  const { data: meStats } = useQuery({
    queryKey: ['workspace-me-dept', orgId, meDept?.id],
    enabled: !!orgId && !!meDept,
    queryFn: async () => {
      const { count: ind, error: iErr } = await supabase.from('program_indicators').select('id', { count: 'exact', head: true }).eq('organization_id', orgId!).eq('is_active', true);
      if (iErr) fail('Could not load indicators', iErr);
      const { count: dq, error: qErr } = await (supabase.from as any)('data_quality_flags').select('id', { count: 'exact', head: true }).eq('organization_id', orgId!).is('resolved_at', null);
      return { indicators: ind ?? 0, issues: qErr ? null : dq ?? 0 };
    },
  });

  if (isLoading || !scope || !orgId) return <Skeleton className="h-40 w-full" />;
  const firstName = (user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there').split(' ')[0];
  const linked = hasAnyLink({ programIds: scope.programIds, projectIds: scope.projectIds, departmentIds: scope.departments.map((d) => d.id) });

  return (
    <section className="space-y-4">
      <div>
        <p className="text-lg md:text-xl font-semibold tracking-tight">
          {buildScopeHeadline({ firstName, hour: new Date().getHours(), programmes: scope.programmes.map((p) => p.name), projects: scope.projects.map((p) => p.name), departments: scope.departments.map((d) => d.name) })}
        </p>
        {scope.orgReach && <p className="text-xs text-muted-foreground">You have organisation-wide access; figures below cover only your linked work.</p>}
      </div>

      {!linked ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">{EMPTY_WORKSPACE_MESSAGE}</CardContent></Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onRecordVisit}><Plus className="h-4 w-4 mr-1" />Record visit</Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/field-mode')}><ClipboardList className="h-4 w-4 mr-1" />Field log</Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/activities')}><Activity className="h-4 w-4 mr-1" />New activity</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {scope.programmes.map((p) => <UnitCard key={p.id} orgId={orgId} kind="program" unit={p} />)}
            {scope.projects.map((p) => <UnitCard key={p.id} orgId={orgId} kind="project" unit={p} />)}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4" />My tasks and follow-ups</CardTitle></CardHeader>
          <CardContent>
            {tLoading ? <Skeleton className="h-16 w-full" /> : tasks.length === 0 ? <p className="text-sm text-muted-foreground">No open tasks.</p> : (
              <ul className="divide-y">{tasks.map((t: any) => (
                <li key={t.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                  <button className="text-left truncate hover:underline" onClick={() => navigate('/tasks')}>{t.title}</button>
                  <span className="text-xs text-muted-foreground shrink-0">{t.due_date ?? 'No due date'}</span>
                </li>))}</ul>
            )}
          </CardContent>
        </Card>
        {owed && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Reports I owe</CardTitle></CardHeader>
            <CardContent>{owed.length === 0 ? <p className="text-sm text-muted-foreground">No reporting obligations set for you.</p> : (
              <p className="text-sm">{owed.length} active reporting {owed.length === 1 ? 'obligation' : 'obligations'} ({[...new Set(owed.map((o) => o.cadence))].join(', ')}).</p>
            )}</CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" />Recent activity in my scope</CardTitle></CardHeader>
          <CardContent>{recent.length === 0 ? <p className="text-sm text-muted-foreground">Nothing yet.</p> : (
            <ul className="divide-y">{recent.map((a: any) => (
              <li key={a.id} className="py-2 flex justify-between text-sm gap-2"><span className="truncate">{a.name}</span><span className="text-xs text-muted-foreground">{a.status}</span></li>))}</ul>
          )}</CardContent>
        </Card>
        {meDept && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />{meDept.name}
              {meDept.orgWide && <Badge variant="outline" className="ml-auto">Organisation-wide</Badge>}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <div><p className="text-lg font-semibold">{meStats?.indicators ?? '—'}</p><p className="text-xs text-muted-foreground">Active indicators</p></div>
              <div><p className="text-lg font-semibold">{meStats?.issues ?? '—'}</p><p className="text-xs text-muted-foreground">Open data-quality issues</p></div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
