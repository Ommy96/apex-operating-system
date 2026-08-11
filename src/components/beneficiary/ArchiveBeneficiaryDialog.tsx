import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { humanizeDbError, describeLinks, type LinkCounts } from '@/lib/dbErrors';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2 } from 'lucide-react';

export const ARCHIVE_REASONS = [
  { value: 'exited_programme', label: 'Exited programme' },
  { value: 'relocated', label: 'Relocated' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'deceased', label: 'Deceased' },
  { value: 'other', label: 'Other' },
];

export interface ArchiveTarget {
  id: string;
  display_name?: string | null;
  beneficiary_code?: string | null;
}

interface Props {
  target: ArchiveTarget | null;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful archive / delete so the caller can refresh. */
  onDone: () => void;
  /** Enables the permanent-erase path. */
  isAdmin?: boolean;
  termSingular?: string;
}

type Mode = 'archive' | 'delete' | 'erase';

export function ArchiveBeneficiaryDialog({
  target, onOpenChange, onDone, isAdmin = false, termSingular = 'beneficiary',
}: Props) {
  const [counts, setCounts] = useState<LinkCounts | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>('archive');
  const [reason, setReason] = useState('exited_programme');
  const [note, setNote] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [justification, setJustification] = useState('');

  const name = target?.display_name || 'this record';
  const code = target?.beneficiary_code || '';
  const isEmpty = (counts?.total ?? 0) === 0;

  useEffect(() => {
    if (!target) return;
    setMode('archive'); setReason('exited_programme'); setNote('');
    setConfirmCode(''); setJustification(''); setCounts(null);
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('beneficiary_link_counts', {
        _beneficiary_id: target.id,
      });
      if (cancelled) return;
      if (error) {
        logger.error('Failed to load linked record counts', error);
        toast({ title: 'Could not load linked records', description: humanizeDbError(error, { entity: termSingular, action: 'check linked records' }), variant: 'destructive' });
      } else {
        setCounts((data as any) || null);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [target?.id]);

  const close = () => onOpenChange(false);

  const undoArchive = async (id: string) => {
    const { error } = await supabase.rpc('unarchive_beneficiary', { _beneficiary_id: id });
    if (error) {
      toast({ title: 'Undo failed', description: humanizeDbError(error, { entity: termSingular, action: 'restore' }), variant: 'destructive' });
      return;
    }
    toast({ title: 'Restored', description: `${name} is back in the active list.` });
    onDone();
  };

  const handleArchive = async () => {
    if (!target) return;
    setBusy(true);
    const { error } = await supabase.rpc('archive_beneficiary', {
      _beneficiary_id: target.id,
      _reason: reason,
      _note: note.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Could not archive', description: humanizeDbError(error, { entity: termSingular, action: 'archive' }), variant: 'destructive' });
      return;
    }
    const id = target.id;
    toast({
      title: 'Archived',
      description: `${name} was archived. Linked records are preserved.`,
      duration: 10000,
      action: (
        <Button variant="outline" size="sm" onClick={() => undoArchive(id)}>Undo</Button>
      ) as any,
    });
    close();
    onDone();
  };

  const runDelete = async (force: boolean) => {
    if (!target) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('hard_delete_beneficiary', {
      _beneficiary_id: target.id,
      _force: force,
      _justification: force ? (justification.trim() || null) : null,
    });
    setBusy(false);
    if (error) {
      toast({ title: 'Could not delete', description: humanizeDbError(error, { entity: termSingular, action: 'delete' }), variant: 'destructive' });
      return;
    }
    const result = data as any;
    if (result && result.blocked) {
      setCounts(result.counts);
      setMode('archive');
      toast({
        title: 'Cannot delete directly',
        description: `This ${termSingular} has ${describeLinks(result.counts)} and cannot be deleted directly — archive them instead.`,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Permanently deleted', description: `${name} was permanently removed. This cannot be undone.` });
    close();
    onDone();
  };

  return (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && close()}>
      <AlertDialogContent className="max-w-lg">
        {mode === 'archive' && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive {name}{code ? ` (${code})` : ''}?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  {loading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <p>
                      They will be hidden from active lists, but their {describeLinks(counts)}{' '}
                      {counts?.total === 1 ? 'is' : 'are'} preserved. You can restore them later.
                    </p>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="archive-reason">Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="archive-reason"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ARCHIVE_REASONS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="archive-note">Note (optional)</Label>
                <Textarea id="archive-note" value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Any context worth keeping for exit reporting" rows={2} maxLength={500} />
              </div>
            </div>

            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <div className="mr-auto flex flex-wrap gap-2">
                {isEmpty && !loading && (
                  <Button variant="ghost" size="sm" className="text-destructive"
                    onClick={() => setMode('delete')}>
                    Delete permanently
                  </Button>
                )}
                {!isEmpty && !loading && isAdmin && (
                  <Button variant="ghost" size="sm" className="text-destructive"
                    onClick={() => setMode('erase')}>
                    Permanently erase…
                  </Button>
                )}
              </div>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); handleArchive(); }} disabled={busy || loading}>
                {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}

        {mode === 'delete' && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {name} permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This {termSingular} has no linked records. Deleting removes the record entirely —
                this cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="ghost" onClick={() => setMode('archive')} disabled={busy}>Back</Button>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(e) => { e.preventDefault(); runDelete(false); }} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}

        {mode === 'erase' && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Permanently erase — this destroys data
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2">
                  <p>
                    This will destroy {name}'s record and their {describeLinks(counts)}.
                    Use this only for a verified data-subject erasure request. It cannot be undone
                    and is logged to the audit trail with your name, the time and your reason.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="erase-just">Reason for erasure (recorded in the audit log)</Label>
                <Textarea id="erase-just" rows={2} value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="e.g. Data Protection Act erasure request received 12 Aug 2026" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="erase-code">Type <span className="font-mono">{code || 'the record code'}</span> to confirm</Label>
                <Input id="erase-code" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)}
                  placeholder={code || ''} autoComplete="off" />
              </div>
            </div>
            <AlertDialogFooter>
              <Button variant="ghost" onClick={() => setMode('archive')} disabled={busy}>Back</Button>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={busy || !code || confirmCode.trim() !== code || justification.trim().length < 5}
                onClick={(e) => { e.preventDefault(); runDelete(true); }}>
                {busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}Permanently erase
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
