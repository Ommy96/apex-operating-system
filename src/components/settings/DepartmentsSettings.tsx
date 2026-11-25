import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import { ensureWritten } from '@/lib/settingsWrite';
import { DEPARTMENT_DATA_REACH, DEPARTMENT_MODULES, isReach } from '@/lib/staffScope';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Building2, Plus, Archive, Star, X } from 'lucide-react';

const from = (t: string) => (supabase.from as any)(t);
const err = (title: string) => (e: unknown) =>
  toast({ title, description: e instanceof Error ? e.message : String((e as any)?.message ?? e), variant: 'destructive' });

interface Dept { id: string; name: string; description: string | null; data_reach: string; modules: string[]; is_active: boolean }

export function DepartmentsSettings() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Dept> | null>(null);

  const { data: depts = [], isLoading } = useQuery({
    queryKey: ['departments', orgId], enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await from('departments').select('*').eq('organization_id', orgId).order('name');
      if (error) { err('Could not load departments')(error); throw error; }
      return data as Dept[];
    },
  });
  const { data: staff = [] } = useQuery({
    queryKey: ['org-staff', orgId], enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_org_staff', { _org_id: orgId! });
      if (error) { err('Could not load staff')(error); throw error; }
      return (data ?? []) as { user_id: string; full_name: string | null; email: string | null }[];
    },
  });
  const { data: programs = [] } = useQuery({
    queryKey: ['dept-programs', orgId], enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from('programs').select('id, name').eq('organization_id', orgId!).is('deleted_at', null).order('name');
      if (error) { err('Could not load programmes')(error); throw error; }
      return data ?? [];
    },
  });
  const deptId = editing?.id;
  const { data: members = [] } = useQuery({
    queryKey: ['dept-members', deptId], enabled: !!deptId,
    queryFn: async () => {
      const { data, error } = await from('department_members').select('id, user_id, is_lead').eq('department_id', deptId).is('end_date', null);
      if (error) { err('Could not load members')(error); throw error; }
      return data as { id: string; user_id: string; is_lead: boolean }[];
    },
  });
  const { data: deptPrograms = [] } = useQuery({
    queryKey: ['dept-programmes', deptId], enabled: !!deptId,
    queryFn: async () => {
      const { data, error } = await from('department_programmes').select('program_id').eq('department_id', deptId);
      if (error) { err('Could not load department programmes')(error); throw error; }
      return (data ?? []).map((r: any) => r.program_id as string);
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['departments', orgId] }); qc.invalidateQueries({ queryKey: ['dept-members'] }); qc.invalidateQueries({ queryKey: ['dept-programmes'] }); qc.invalidateQueries({ queryKey: ['staff-scope'] }); };

  const save = useMutation({
    mutationFn: async (d: Partial<Dept>) => {
      const row = { name: d.name?.trim(), description: d.description ?? null, data_reach: d.data_reach ?? DEPARTMENT_DATA_REACH.PROGRAMMES, modules: d.modules ?? [] };
      if (!row.name) throw new Error('Name is required');
      const res = d.id
        ? await from('departments').update(row).eq('id', d.id).select('id')
        : await from('departments').insert({ ...row, organization_id: orgId }).select('id');
      return ensureWritten(res, 'Department')[0] as { id: string };
    },
    onSuccess: (r) => { toast({ title: 'Department saved' }); setEditing((e) => ({ ...e, id: r.id })); refresh(); },
    onError: err('Could not save department'),
  });
  const archive = useMutation({
    mutationFn: async (d: Dept) => ensureWritten(await from('departments').update({ is_active: !d.is_active }).eq('id', d.id).select('id'), 'Department'),
    onSuccess: refresh, onError: err('Could not archive department'),
  });
  const addMember = useMutation({
    mutationFn: async (userId: string) => ensureWritten(await from('department_members').insert({ organization_id: orgId, department_id: deptId, user_id: userId }).select('id'), 'Member'),
    onSuccess: refresh, onError: err('Could not add member'),
  });
  const endMember = useMutation({
    mutationFn: async (id: string) => ensureWritten(await from('department_members').update({ end_date: new Date().toISOString().slice(0, 10) }).eq('id', id).select('id'), 'Member'),
    onSuccess: refresh, onError: err('Could not remove member'),
  });
  const toggleLead = useMutation({
    mutationFn: async (m: { id: string; is_lead: boolean }) => ensureWritten(await from('department_members').update({ is_lead: !m.is_lead }).eq('id', m.id).select('id'), 'Lead'),
    onSuccess: refresh, onError: err('Could not change lead'),
  });
  const toggleProgram = useMutation({
    mutationFn: async (pid: string) => {
      if (deptPrograms.includes(pid)) {
        const { data, error } = await from('department_programmes').delete().eq('department_id', deptId).eq('program_id', pid).select('program_id');
        ensureWritten({ data, error }, 'Programme link');
      } else {
        ensureWritten(await from('department_programmes').insert({ department_id: deptId, program_id: pid, organization_id: orgId }).select('program_id'), 'Programme link');
      }
    },
    onSuccess: refresh, onError: err('Could not change programmes'),
  });

  const name = (uid: string) => staff.find((s) => s.user_id === uid)?.full_name || staff.find((s) => s.user_id === uid)?.email || 'Staff member';
  const orgWide = isReach(editing?.data_reach, DEPARTMENT_DATA_REACH.ORGANIZATION);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-semibold">Departments</h2><p className="text-sm text-muted-foreground">Group staff by function (e.g. M&E, Finance) and decide what each department can reach.</p></div>
        <Button onClick={() => setEditing({ data_reach: DEPARTMENT_DATA_REACH.PROGRAMMES, modules: [] })}><Plus className="h-4 w-4 mr-1" />New department</Button>
      </div>
      {isLoading ? <Skeleton className="h-24 w-full" /> : depts.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No departments yet.</CardContent></Card>
      ) : depts.map((d) => (
        <Card key={d.id} className={d.is_active ? '' : 'opacity-60'}>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /><CardTitle className="text-sm">{d.name}</CardTitle>
            <Badge variant="outline">{isReach(d.data_reach, DEPARTMENT_DATA_REACH.ORGANIZATION) ? 'Organisation-wide' : 'Selected programmes'}</Badge>
            {!d.is_active && <Badge variant="secondary">Archived</Badge>}
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(d)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => archive.mutate(d)}><Archive className="h-4 w-4 mr-1" />{d.is_active ? 'Archive' : 'Restore'}</Button>
            </div>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{d.modules.join(', ') || 'No modules'}</CardContent>
        </Card>
      ))}

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{editing?.id ? 'Edit department' : 'New department'}</SheetTitle></SheetHeader>
          {editing && (
            <div className="space-y-4 mt-4">
              <div><Label>Name</Label><Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><Label>Data reach</Label>
                <Select value={editing.data_reach} onValueChange={(v) => setEditing({ ...editing, data_reach: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DEPARTMENT_DATA_REACH.ORGANIZATION}>Whole organisation (for its modules)</SelectItem>
                    <SelectItem value={DEPARTMENT_DATA_REACH.PROGRAMMES}>Selected programmes only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Modules</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">{DEPARTMENT_MODULES.map((m) => (
                  <label key={m.value} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={(editing.modules ?? []).includes(m.value)} onCheckedChange={(c) => setEditing({ ...editing, modules: c ? [...(editing.modules ?? []), m.value] : (editing.modules ?? []).filter((x) => x !== m.value) })} />
                    {m.label}
                  </label>))}</div>
              </div>
              <Button onClick={() => save.mutate(editing)} disabled={save.isPending}>Save department</Button>

              {editing.id && !orgWide && (
                <div><Label>Programmes</Label>
                  <div className="space-y-1 mt-1">{programs.map((p: any) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={deptPrograms.includes(p.id)} onCheckedChange={() => toggleProgram.mutate(p.id)} />{p.name}
                    </label>))}</div>
                </div>
              )}
              {editing.id && (
                <div className="space-y-2"><Label>Members</Label>
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate">{name(m.user_id)}</span>
                      <Button size="sm" variant={m.is_lead ? 'secondary' : 'ghost'} onClick={() => toggleLead.mutate(m)}><Star className="h-3.5 w-3.5 mr-1" />{m.is_lead ? 'Lead' : 'Make lead'}</Button>
                      <Button size="icon" variant="ghost" aria-label="Remove member" onClick={() => endMember.mutate(m.id)}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Select value="" onValueChange={(v) => addMember.mutate(v)}>
                    <SelectTrigger><SelectValue placeholder="Add member…" /></SelectTrigger>
                    <SelectContent>{staff.filter((s) => !members.some((m) => m.user_id === s.user_id)).map((s) => (
                      <SelectItem key={s.user_id} value={s.user_id}>{s.full_name || s.email}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
