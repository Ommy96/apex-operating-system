import { useState } from 'react';
import { format, subMonths } from 'date-fns';
import { Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '@/hooks/usePermissions';
import { useReportingLedger } from '@/hooks/useReportingLedger';
import { REPORT_CADENCE, REPORT_SCOPE, REPORT_STATUS, REPORT_FILTER_ALL, reportMatches, reportingRollup, type LedgerCell } from '@/lib/reportingLedger';

function Choice({ label, value, onChange, choices }: { label: string; value: string; onChange: (v: string) => void; choices: { id: string; name: string }[] }) {
  return <div className="space-y-1"><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{choices.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>;
}
const allChoice = { id: REPORT_FILTER_ALL, name: 'All' };

export function StaffSubmissionLedger() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('hr', 'edit', 'staff') || hasPermission('hr', 'create', 'staff') || hasPermission('users', 'manage', 'roles');
  const [from, setFrom] = useState(format(subMonths(new Date(), 3), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [program, setProgram] = useState(REPORT_FILTER_ALL);
  const [project, setProject] = useState(REPORT_FILTER_ALL);
  const [cadenceFilter, setCadenceFilter] = useState(REPORT_FILTER_ALL);
  const [status, setStatus] = useState(REPORT_FILTER_ALL);
  const [open, setOpen] = useState(false);
  const [scopeType, setScopeType] = useState<string>(REPORT_SCOPE.PROGRAM);
  const [scope, setScope] = useState('');
  const [form, setForm] = useState(REPORT_FILTER_ALL);
  const [cadence, setCadence] = useState<string>(REPORT_CADENCE.MONTHLY);
  const [grace, setGrace] = useState(3);
  const [selected, setSelected] = useState<string[]>([]);
  const { ledger, options, create, nudge } = useReportingLedger(from, to, canManage);
  const cells = ledger.data || [];
  const programChoices = [...new Map(cells.filter(c => c.program_id).map(c => [c.program_id, { id: c.program_id as string, name: c.program_name || c.scope_name }])).values()];
  const projectChoices = [...new Map(cells.filter(c => c.project_id).map(c => [c.project_id, { id: c.project_id as string, name: c.scope_name }])).values()];
  const filtered = cells.filter(c => (reportMatches(program, REPORT_FILTER_ALL) || c.program_id === program) && (reportMatches(project, REPORT_FILTER_ALL) || c.project_id === project) && (reportMatches(cadenceFilter, REPORT_FILTER_ALL) || reportMatches(c.cadence, cadenceFilter)));
  const visible = filtered.filter(c => reportMatches(status, REPORT_FILTER_ALL) || reportMatches(c.status, status));
  const periods = [...new Set(visible.map(c => `${c.period_start}|${c.period_end}`))].sort();
  const staff = [...new Map(visible.map(c => [c.user_id, c.staff_name])).entries()];
  const rollupPrograms = options.data?.programs || programChoices;
  const isProgram = reportMatches(scopeType, REPORT_SCOPE.PROGRAM);
  const team = (options.data?.staff || []).filter(s => (isProgram ? s.program_ids : s.project_ids).includes(scope));
  const chosenProject = options.data?.projects.find(p => p.id === scope);
  const forms = (options.data?.forms || []).filter(f => (!f.program_id || f.program_id === (isProgram ? scope : chosenProject?.program_id)) && (!f.project_id || (!isProgram && f.project_id === scope)));
  const submit = () => create.mutate({ userIds: selected, scope_type: scopeType, program_id: isProgram ? scope : null, project_id: isProgram ? null : scope, form_id: reportMatches(form, REPORT_FILTER_ALL) ? null : form, cadence, grace_days: grace }, { onSuccess: () => { setOpen(false); setSelected([]); } });
  const statusClass = (s: string) => reportMatches(s, REPORT_STATUS.SUBMITTED) ? 'bg-success/10 text-success border-success/30' : reportMatches(s, REPORT_STATUS.OVERDUE) ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-warning/10 text-warning border-warning/30';

  return <section className="space-y-5">
    <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="text-lg font-semibold">Staff Submission Ledger</h2>{canManage && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Set obligations</Button>}</div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <Choice label="Programme" value={program} onChange={setProgram} choices={[allChoice, ...programChoices]} />
      <Choice label="Project" value={project} onChange={setProject} choices={[allChoice, ...projectChoices]} />
      <Choice label="Cadence" value={cadenceFilter} onChange={setCadenceFilter} choices={[allChoice, ...Object.values(REPORT_CADENCE).map(v => ({ id: v, name: v }))]} />
      <Choice label="Status" value={status} onChange={setStatus} choices={[allChoice, ...Object.values(REPORT_STATUS).map(v => ({ id: v, name: v }))]} />
      <div className="space-y-1"><Label htmlFor="report-from">From</Label><Input id="report-from" type="date" value={from} onChange={e => setFrom(e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="report-to">To</Label><Input id="report-to" type="date" value={to} onChange={e => setTo(e.target.value)} /></div>
    </div>
    {ledger.isLoading ? <Skeleton className="h-48 w-full" /> : ledger.error ? <p role="alert" className="text-destructive">{ledger.error.message}</p> : <>
      <div className="overflow-x-auto border rounded-lg"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-3 text-left min-w-40">Staff member</th>{periods.map(p => <th key={p} className="p-3 min-w-44 text-left font-medium">{p.split('|')[0]}<span className="block text-xs text-muted-foreground">to {p.split('|')[1]}</span></th>)}</tr></thead><tbody>{staff.map(([id, name]) => <tr key={id} className="border-t"><th className="p-3 text-left align-top font-medium">{name}</th>{periods.map(period => <td key={period} className="p-3 align-top"><div className="space-y-3">{visible.filter(c => c.user_id === id && `${c.period_start}|${c.period_end}` === period).map(c => <div key={c.obligation_id} className="space-y-1"><p className="text-xs font-medium">{c.scope_name}</p><p className="text-xs text-muted-foreground">{c.form_name}</p><Badge variant="outline" className={statusClass(c.status)}>{c.status}</Badge>{canManage && reportMatches(c.status, REPORT_STATUS.OVERDUE) && <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={nudge.isPending} onClick={() => nudge.mutate([c])}><Send className="h-3 w-3 mr-1" />Nudge</Button>}{c.last_nudged_at && <p className="text-xs text-muted-foreground">Nudged {format(new Date(c.last_nudged_at), 'dd MMM HH:mm')}</p>}</div>)}</div></td>)}</tr>)}</tbody></table>{!staff.length && <p className="p-8 text-center text-muted-foreground">No reporting obligations in this selection.</p>}</div>
      <div className="space-y-3"><h3 className="font-semibold">Programme compliance</h3>{rollupPrograms.filter(p => reportMatches(program, REPORT_FILTER_ALL) || p.id === program).map(p => {
        const matching = filtered.filter(c => c.program_id === p.id);
        const periodsForProgram = [...new Set(matching.map(c => c.period_start))].sort();
        const latestPeriod = periodsForProgram.at(-1);
        const recent = matching.filter(c => c.period_start === latestPeriod);
        const totals = reportingRollup(recent);
        return <div key={p.id} className="flex flex-wrap justify-between items-center gap-2 border-b pb-3"><div><p className="font-medium">{p.name} — {totals.total ? `${totals.submitted} of ${totals.total} reports submitted (${totals.percentage}%)` : 'No obligations set'}</p>{latestPeriod && <p className="text-xs text-muted-foreground">Period starting {latestPeriod} · distinct obligations</p>}</div>{canManage && matching.some(c => reportMatches(c.status, REPORT_STATUS.OVERDUE)) && <Button variant="outline" size="sm" disabled={nudge.isPending} onClick={() => nudge.mutate(matching.filter(c => reportMatches(c.status, REPORT_STATUS.OVERDUE)))}><Send className="h-3 w-3 mr-2" />Nudge overdue</Button>}</div>;
      })}</div>
    </>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Set reporting obligations</DialogTitle></DialogHeader>{options.isLoading ? <Skeleton className="h-48" /> : <div className="space-y-4">
      <Choice label="Scope" value={scopeType} onChange={v => { setScopeType(v); setScope(''); setSelected([]); setForm(REPORT_FILTER_ALL); }} choices={Object.values(REPORT_SCOPE).map(v => ({ id: v, name: v }))} />
      <Choice label={isProgram ? 'Programme' : 'Project'} value={scope} onChange={v => { setScope(v); setSelected([]); setForm(REPORT_FILTER_ALL); }} choices={(isProgram ? options.data?.programs : options.data?.projects) || []} />
      <Choice label="Report form" value={form} onChange={setForm} choices={[{ id: REPORT_FILTER_ALL, name: 'Any report for this scope' }, ...forms]} />
      <Choice label="Cadence" value={cadence} onChange={setCadence} choices={Object.values(REPORT_CADENCE).map(v => ({ id: v, name: v }))} />
      <div className="space-y-1"><Label htmlFor="report-grace">Grace days</Label><Input id="report-grace" type="number" min={0} max={90} value={grace} onChange={e => setGrace(Number(e.target.value))} /></div>
      <fieldset className="space-y-2"><legend className="text-sm font-medium mb-2">Team members</legend>{team.map(s => <label key={s.user_id} className="flex items-center gap-2 text-sm"><Checkbox checked={selected.includes(s.user_id)} onCheckedChange={v => setSelected(prev => v ? [...prev, s.user_id] : prev.filter(id => id !== s.user_id))} />{s.name}</label>)}{!team.length && <p className="text-sm text-muted-foreground">No current team members for this scope.</p>}</fieldset>
      <p className="text-xs text-muted-foreground">Starts {format(new Date(), 'dd MMM yyyy')} · no historical periods</p>
      <Button disabled={!scope || !selected.length || create.isPending || !Number.isInteger(grace) || grace < 0 || grace > 90} onClick={submit}>{create.isPending ? 'Creating…' : `Create ${selected.length} obligation(s)`}</Button>
    </div>}</DialogContent></Dialog>
  </section>;
}