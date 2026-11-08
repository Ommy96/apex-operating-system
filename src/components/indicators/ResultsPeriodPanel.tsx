import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useResultsFramework } from '@/hooks/useResultsFramework';
import { usePermissions } from '@/hooks/usePermissions';
import { exportToCsv, exportToXlsx } from '@/lib/analyticsExport';
import { OUTCOME_EVIDENCE_WARNING, resultExportRow } from '@/lib/resultsFramework';
import { Download, Check } from 'lucide-react';
export function ResultsPeriodPanel({ indicatorId, organizationId }: { indicatorId: string; organizationId?: string }) {
  const [start, setStart] = useState(new Date().toISOString().slice(0, 7) + '-01');
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const { preview, approved, approve } = useResultsFramework(indicatorId, start, end, organizationId);
  const { can } = usePermissions();
  const previous = approved.data?.find(s => s.period_start === start && s.period_end === end);
  const displayed = previous?.snapshot ?? preview.data;
  return <section className="space-y-4 py-4">
    <p className="border-l-4 border-warning pl-3 text-sm font-medium">{OUTCOME_EVIDENCE_WARNING}</p>
    <div className="flex flex-wrap gap-3 items-end">
      <div><Label htmlFor="result-start">Period start</Label><Input id="result-start" type="date" value={start} onChange={e => setStart(e.target.value)} /></div>
      <div><Label htmlFor="result-end">Period end</Label><Input id="result-end" type="date" value={end} onChange={e => setEnd(e.target.value)} /></div>
      {displayed && can.exportReports && <><Button variant="outline" onClick={() => exportToCsv([resultExportRow(displayed)], 'indicator-results')}><Download className="h-4 w-4 mr-2" />CSV</Button><Button variant="outline" onClick={() => exportToXlsx({ Results: [resultExportRow(displayed)] }, 'indicator-results')}>Excel</Button></>}
    </div>
    {preview.isLoading || approved.isLoading ? <Skeleton className="h-28" /> : displayed && <div className="space-y-2 border-y py-4">
      <Badge variant={previous ? 'default' : 'outline'}>{previous ? `Approved · version ${previous.version}` : 'Unapproved preview'}</Badge>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">{Object.entries({ Actual: displayed.current, Baseline: displayed.baseline, Target: displayed.target, Achievement: displayed.percent == null ? null : `${displayed.percent.toFixed(1)}%`, Numerator: displayed.numerator, Denominator: displayed.denominator }).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold">{value ?? 'Unavailable'}</dd></div>)}</dl>
      <p className="text-sm">{displayed.definition}</p><p className="text-xs text-muted-foreground">{displayed.period_start} – {displayed.period_end} · {displayed.limitations}</p>
    </div>}
    {preview.error && <p role="alert" className="text-sm text-destructive">{preview.error.message}</p>}
    {approved.error && <p role="alert" className="text-sm text-destructive">{approved.error.message}</p>}
    {previous && preview.data && <p className="text-sm text-muted-foreground">Live actual: {preview.data.current ?? 'Unavailable'} · approved actual: {previous.snapshot.current ?? 'Unavailable'}</p>}
    {can.generateReports && <div className="flex flex-wrap gap-3 items-end">{previous && <div className="flex-1 min-w-48"><Label htmlFor="amendment-reason">Amendment reason</Label><Input id="amendment-reason" value={reason} onChange={e => setReason(e.target.value)} /></div>}<Button disabled={approve.isPending || !preview.data || !!preview.error || (previous && !reason.trim())} onClick={() => approve.mutate({ amends: previous?.id, reason }, { onSuccess: () => setReason('') })}><Check className="h-4 w-4 mr-2" />{approve.isPending ? 'Approving…' : previous ? 'Approve amendment' : 'Approve period'}</Button></div>}
    <h3 className="font-semibold text-sm">Approved history</h3>
    {approved.data?.map(s => <article key={s.id} className="border-b py-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span>{s.period_start} – {s.period_end} · v{s.version} · {s.snapshot.current ?? 'Unavailable'} {s.snapshot.unit}</span>{can.exportReports && <Button size="sm" variant="ghost" onClick={() => exportToCsv([{ ...resultExportRow(s.snapshot), version: s.version, amendment_reason: s.amendment_reason }], 'approved-result')}>Export</Button>}</div>{s.amendment_reason && <p className="text-muted-foreground">{s.amendment_reason}</p>}</article>)}
  </section>;
}