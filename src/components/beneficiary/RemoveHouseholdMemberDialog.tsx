import { useEffect, useState } from 'react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Crown, UserMinus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  HOUSEHOLD_LEAVE_REASONS,
  useRemoveHouseholdMember,
  useRestoreHouseholdMember,
} from '@/hooks/useHouseholdMemberships';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  householdId: string;
  householdName?: string | null;
  member: { id: string; display_name?: string | null } | null;
  isHead?: boolean;
  onChangeHead?: () => void;
}

export function RemoveHouseholdMemberDialog({
  open, onOpenChange, householdId, householdName, member, isHead, onChangeHead,
}: Props) {
  const [reason, setReason] = useState('moved_out');
  const [note, setNote] = useState('');
  const remove = useRemoveHouseholdMember();
  const restore = useRestoreHouseholdMember();

  useEffect(() => {
    if (open) { setReason('moved_out'); setNote(''); }
  }, [open]);

  const name = member?.display_name || 'this member';

  const handleRemove = async () => {
    if (!member) return;
    try {
      const res = await remove.mutateAsync({
        beneficiaryId: member.id,
        householdId,
        reason,
        note: note.trim() || null,
      });
      onOpenChange(false);
      toast({
        title: `${name} removed from ${householdName || 'the household'}`,
        description: 'Their beneficiary record, history and enrolments are untouched.',
        action: (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              restore
                .mutateAsync({
                  beneficiaryId: member.id,
                  householdId,
                  lifeEventId: res?.life_event_id || null,
                  restoreAsHead: isHead,
                })
                .then(() => toast({ title: `${name} restored to the household` }))
                .catch((e: any) => toast({ title: 'Could not undo', description: e?.message, variant: 'destructive' }))
            }
          >
            Undo
          </Button>
        ),
      });
    } catch (e: any) {
      toast({ title: 'Could not remove member', description: e?.message, variant: 'destructive' });
    }
  };

  if (isHead) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-warning" /> {name} is the head of this household
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose a new head before removing them, so the household keeps a responsible adult on record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            {onChangeHead && (
              <AlertDialogAction onClick={() => { onOpenChange(false); onChangeHead(); }}>
                Change head
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <UserMinus className="h-4 w-4" /> Remove {name} from this household?
          </AlertDialogTitle>
          <AlertDialogDescription>
            They stay a beneficiary — only their household link is ended. You can undo this straight after.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Why are they leaving?</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-1">
              {HOUSEHOLD_LEAVE_REASONS.map((r) => (
                <label
                  key={r.value}
                  htmlFor={`reason-${r.value}`}
                  className="flex items-start gap-3 p-2 rounded-md border hover:bg-secondary/40 cursor-pointer"
                >
                  <RadioGroupItem id={`reason-${r.value}`} value={r.value} className="mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-sm">{r.label}</div>
                    {r.hint && <div className="text-xs text-muted-foreground">{r.hint}</div>}
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leave-note">Note (optional)</Label>
            <Textarea
              id="leave-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything the team should know"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleRemove(); }}
            disabled={remove.isPending}
          >
            {remove.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Remove from household
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
