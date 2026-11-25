import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ensureWritten } from '@/lib/settingsWrite';
import { EMPTY_WORKSPACE_WARNING } from '@/lib/staffScope';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertTriangle, X, Star } from 'lucide-react';

const from = (t: string) => (supabase.from as any)(t);
const today = () => new Date().toISOString().slice(0, 10);
const live = (d: string | null) => !d || d > today();
const onErr = (title: string) => (e: unknown) =>
  toast({ title, description: e instanceof Error ? e.message : String((e as any)?.message ?? e), variant: 'destructive' });

export interface OrgLinks {
  programmes: { id: string; name: string }[];
  projects: { id: string; name: string; program_id: string | null }[];
  departments: { id: string; name: string }[];
  pt: { id: string; staff_id: string; program_id: string; project_id: string | null; is_lead: boolean; end_date: string | null }[];
  ptm: { id: string; user_id: string; project_id: string; is_lead: boolean; end_date: string | null }[];
  dm: { id: string; user_id: string; department_id: string; is_lead: boolean; end_date: string | null }[];
}

export function useOrgLinks(orgId?: string) {
  return useQuery({
    queryKey: ['org-staff-links', orgId], enabled: !!orgId,
    queryFn: async (): Promise<OrgLinks> => {
      const fail = (e: any): never => { onErr('Could not load staff assignments')(e); throw e; };
      const [g, p, d, pt, dm] = await Promise.all([
        supabase.from('programs').select('id, name').eq('organization_id', orgId!).is('deleted_at', null).order('name'),
        supabase.from('projects').select('id, name, program_id').eq('organization_id', orgId!).is('deleted_at', null).order('name'),
        from('departments').select('id, name').eq('organization_id', orgId).eq('is_active', true).order('name'),
        supabase.from('programme_team').select('id, staff_id, program_id, project_id, is_lead, end_date').eq('org_id', orgId!),
        from('department_members').select('id, user_id, department_id, is_lead, end_date').eq('organization_id', orgId),
      ]);
      for (const r of [g, p, d, pt, dm]) if (r.error) fail(r.error);
      const projectIds = (p.data ?? []).map((x: any) => x.id);
      const ptm = projectIds.length ? await supabase.from('project_team_members').select('id, user_id, project_id, is_lead, end_date').in('project_id', projectIds) : { data: [], error: null };
      if (ptm.error) fail(ptm.error);
      return {
        programmes: g.data ?? [], projects: p.data ?? [], departments: d.data ?? [],
        pt: ((pt.data ?? []) as any[]).filter((r) => live(r.end_date)),
        ptm: ((ptm.data ?? []) as any[]).filter((r) => live(r.end_date)),
        dm: ((dm.data ?? []) as any[]).filter((r) => live(r.end_date)),
      };
    },
  });
}

export function linksFor(links: OrgLinks | undefined, userId: string) {
  if (!links) return { programmes: [], projects: [], departments: [] as string[] };
  const nm = <T extends { id: string; name: string }>(arr: T[], id: string) => arr.find((x) => x.id === id)?.name ?? '—';
  return {
    programmes: links.pt.filter((r) => r.staff_id === userId && !r.project_id).map((r) => nm(links.programmes, r.program_id)),
    projects: [...links.ptm.filter((r) => r.user_id === userId).map((r) => nm(links.projects, r.project_id)),
      ...links.pt.filter((r) => r.staff_id === userId && r.project_id).map((r) => nm(links.projects, r.project_id!))],
    departments: links.dm.filter((r) => r.user_id === userId).map((r) => nm(links.departments, r.department_id)),
  };
}

export function MemberLinkSummary({ links, userId, roleNames }: { links?: OrgLinks; userId: string; roleNames: string[] }) {
  const l = linksFor(links, userId);
  const none = l.programmes.length + l.projects.length + l.departments.length === 0;
  return (
    <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
      <p className="truncate">{[roleNames.join(', ') || 'No role', l.programmes.length ? `Programmes: ${l.programmes.join(', ')}` : null,
        l.projects.length ? `Projects: ${l.projects.join(', ')}` : null, l.departments.length ? `Department: ${l.departments.join(', ')}` : null].filter(Boolean).join(' · ')}</p>
      {none && roleNames.length > 0 && <p className="text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{EMPTY_WORKSPACE_WARNING}</p>}
    </div>
  );
}

export function MemberLinksDrawer({ orgId, member, onClose }: { orgId: string; member: { user_id: string; name: string } | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: links } = useOrgLinks(orgId);
  const uid = member?.user_id ?? '';
  const refresh = () => { qc.invalidateQueries({ queryKey: ['org-staff-links', orgId] }); qc.invalidateQueries({ queryKey: ['staff-scope'] }); };
  const m = useMutation({
    mutationFn: async (fn: () => Promise<any>) => fn(),
    onSuccess: refresh, onError: onErr('Could not update assignment'),
  });
  const end = (table: string, id: string) => m.mutate(async () => ensureWritten(await from(table).update({ end_date: today() }).eq('id', id).select('id'), 'Assignment'));
  const lead = (table: string, id: string, v: boolean) => m.mutate(async () => ensureWritten(await from(table).update({ is_lead: !v }).eq('id', id).select('id'), 'Lead flag'));
  const nm = (arr: { id: string; name: string }[], id: string) => arr.find((x) => x.id === id)?.name ?? '—';

  const Row = ({ label, isLead, onLead, onEnd }: { label: string; isLead: boolean; onLead: () => void; onEnd: () => void }) => (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex-1 truncate">{label}</span>
      <Button size="sm" variant={isLead ? 'secondary' : 'ghost'} onClick={onLead}><Star className="h-3.5 w-3.5 mr-1" />{isLead ? 'Lead' : 'Member'}</Button>
      <Button size="icon" variant="ghost" aria-label="End assignment" onClick={onEnd}><X className="h-4 w-4" /></Button>
    </div>
  );

  return (
    <Sheet open={!!member} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader><SheetTitle>Assignments — {member?.name}</SheetTitle></SheetHeader>
        {links && member && (
          <div className="space-y-6 mt-4">
            <section className="space-y-2"><Label>Programmes</Label>
              {links.pt.filter((r) => r.staff_id === uid && !r.project_id).map((r) => (
                <Row key={r.id} label={nm(links.programmes, r.program_id)} isLead={r.is_lead} onLead={() => lead('programme_team', r.id, r.is_lead)} onEnd={() => end('programme_team', r.id)} />))}
              <Select value="" onValueChange={(v) => m.mutate(async () => ensureWritten(await from('programme_team').insert({ org_id: orgId, program_id: v, staff_id: uid, role: 'member', start_date: today() }).select('id'), 'Programme link'))}>
                <SelectTrigger><SelectValue placeholder="Add to programme…" /></SelectTrigger>
                <SelectContent>{links.programmes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </section>
            <section className="space-y-2"><Label>Projects</Label>
              {links.ptm.filter((r) => r.user_id === uid).map((r) => (
                <Row key={r.id} label={nm(links.projects, r.project_id)} isLead={r.is_lead} onLead={() => lead('project_team_members', r.id, r.is_lead)} onEnd={() => end('project_team_members', r.id)} />))}
              <Select value="" onValueChange={(v) => m.mutate(async () => ensureWritten(await from('project_team_members').insert({ project_id: v, user_id: uid, role_on_project: 'member', start_date: today() }).select('id'), 'Project link'))}>
                <SelectTrigger><SelectValue placeholder="Add to project…" /></SelectTrigger>
                <SelectContent>{links.projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </section>
            <section className="space-y-2"><Label>Departments</Label>
              {links.dm.filter((r) => r.user_id === uid).map((r) => (
                <Row key={r.id} label={nm(links.departments, r.department_id)} isLead={r.is_lead} onLead={() => lead('department_members', r.id, r.is_lead)} onEnd={() => end('department_members', r.id)} />))}
              {links.departments.length === 0 ? <p className="text-xs text-muted-foreground">No departments yet — create them in Settings → Departments.</p> : (
                <Select value="" onValueChange={(v) => m.mutate(async () => ensureWritten(await from('department_members').insert({ organization_id: orgId, department_id: v, user_id: uid }).select('id'), 'Department link'))}>
                  <SelectTrigger><SelectValue placeholder="Add to department…" /></SelectTrigger>
                  <SelectContent>{links.departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>)}
            </section>
            <Badge variant="outline" className="text-[11px]">Programme and project Team tabs edit the same assignments.</Badge>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
