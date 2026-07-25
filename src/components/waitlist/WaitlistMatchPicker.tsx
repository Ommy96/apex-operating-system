import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ListOrdered } from 'lucide-react';
import { useWaitlist, useMatchAndEnroll, useProjectsForNeed, type WaitlistApplication } from '@/hooks/useWaitlist';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Scope picker suggestions to a programme (optional). */
  programId?: string | null;
  /** Sponsorship package context (optional). */
  packageId?: string | null;
  packageCost?: number | null;
  /** Donor account id / display name for the sponsorship record. */
  donorAccountId?: string | null;
  donorName?: string | null;
  /** Called after a successful match. */
  onMatched?: (r: { beneficiaryId?: string; applicationId: string }) => void;
}

/**
 * Shared "top-ranked waiting applicants" picker. Used by:
 *  - the Waiting List page (per-card "Match & enrol" action)
 *  - the Record Donation flow (shortcut "Match to a waiting applicant")
 * It reuses `useMatchAndEnroll` so both entry points run the identical
 * multi-step transaction (create beneficiary, copy needs, enrol, sponsor).
 */
export function WaitlistMatchPicker({
  open, onOpenChange, programId, packageId, packageCost, donorAccountId, donorName, onMatched,
}: Props) {
  const { data: all = [], isLoading } = useWaitlist();
  const match = useMatchAndEnroll();
  const [selected, setSelected] = useState<WaitlistApplication | null>(null);
  const [projectId, setProjectId] = useState<string>('');
  const { data: projects = [] } = useProjectsForNeed(null);

  const eligible = useMemo(() => {
    const rows = (all || []).filter((a) =>
      ['waiting_list', 'funding_match', 'scoring', 'assessment'].includes(a.status as any),
    );
    const scoped = programId ? rows.filter((r) => !r.program_id || r.program_id === programId) : rows;
    return scoped
      .slice()
      .sort((a, b) => (Number(b.vulnerability_score ?? 0) - Number(a.vulnerability_score ?? 0)))
      .slice(0, 20);
  }, [all, programId]);

  const daysWaiting = (row: WaitlistApplication) => {
    const from = (row as any).created_at ? new Date((row as any).created_at) : null;
    if (!from) return 0;
    return Math.max(0, Math.floor((Date.now() - from.getTime()) / 86400000));
  };

  const scopedProjects = useMemo(
    () => (programId ? projects.filter((p: any) => !p.program_id || p.program_id === programId) : projects),
    [projects, programId],
  );

  const onEnroll = async () => {
    if (!selected) return toast.error('Pick an applicant');
    if (!projectId) return toast.error('Choose the project to enrol into');
    try {
      const res = await match.mutateAsync({
        application: selected,
        projectId,
        packageId: packageId || undefined,
        packageCost: packageCost || undefined,
        donorAccountId: donorAccountId || undefined,
        donorName: donorName || undefined,
      });
      onMatched?.({ beneficiaryId: res?.beneficiaryId, applicationId: selected.id });
      setSelected(null);
      setProjectId('');
      onOpenChange(false);
    } catch {
      /* toast handled by hook */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4" /> Match to a waiting applicant
          </DialogTitle>
          <DialogDescription>
            Top-ranked applicants awaiting funding. Selecting one runs the same match &amp; enrol flow as the Waiting List page.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
        ) : eligible.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No eligible applicants waiting.</p>
        ) : (
          <ul className="divide-y max-h-[320px] overflow-auto rounded-md border">
            {eligible.map((a) => {
              const isSel = selected?.id === a.id;
              const needs = (a as any).needs as any[] | undefined;
              return (
                <li
                  key={a.id}
                  className={`p-3 cursor-pointer transition-colors ${isSel ? 'bg-teal-50 dark:bg-teal-950/20' : 'hover:bg-muted/50'}`}
                  onClick={() => setSelected(a)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{a.applicant_name || 'Unnamed'}</span>
                        {a.applicant_age != null && <span className="text-xs text-muted-foreground">age {a.applicant_age}</span>}
                        <Badge variant="outline" className="text-[10px]">score {Number(a.vulnerability_score ?? 0).toFixed(0)}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{daysWaiting(a)}d waiting</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {(needs || []).map((n) => n.need_type?.label).filter(Boolean).join(' · ') || 'No needs captured'}
                      </p>
                    </div>
                    <input type="radio" checked={isSel} onChange={() => setSelected(a)} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {selected && (
          <div className="space-y-2">
            <label className="text-xs font-medium">Enrol into project</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Choose a project" /></SelectTrigger>
              <SelectContent>
                {scopedProjects.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onEnroll} disabled={!selected || !projectId || match.isPending}>
            {match.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Match &amp; enrol
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}