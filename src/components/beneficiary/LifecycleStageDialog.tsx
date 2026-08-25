import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, GraduationCap } from 'lucide-react';
import {
  ALUMNI_OUTCOMES,
  LIFECYCLE_DESCRIPTIONS,
  LIFECYCLE_LABELS,
  normaliseStage,
  type LifecycleStage,
} from '@/lib/lifecycle';
import { useSetLifecycleStage } from '@/hooks/useBeneficiaryLifecycle';
import { useSponsorRelationships } from '@/hooks/useSponsorRelationships';
import { EndSponsorshipDialog } from './EndSponsorshipDialog';

const SELECTABLE: LifecycleStage[] = ['applicant', 'waiting_list', 'active', 'paused', 'alumni', 'exited'];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  beneficiaryId: string;
  currentStage?: string | null;
}

export function LifecycleStageDialog({ open, onOpenChange, beneficiaryId, currentStage }: Props) {
  const [stage, setStage] = useState<LifecycleStage>(normaliseStage(currentStage));
  const [exitReason, setExitReason] = useState('');
  const [outcome, setOutcome] = useState<string>('completed_secondary');
  const [outcomeNote, setOutcomeNote] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [contactConsent, setContactConsent] = useState(false);
  const [offerTransfer, setOfferTransfer] = useState(false);

  const setLifecycle = useSetLifecycleStage();
  const { data: relationships } = useSponsorRelationships(beneficiaryId);
  const activeSponsor = (relationships || []).find(r => r.status === 'active') || null;

  const submit = async () => {
    await setLifecycle.mutateAsync({
      beneficiaryId,
      stage,
      exitReason: stage === 'exited' ? exitReason : null,
      alumniOutcome: stage === 'alumni' ? outcome : null,
      alumniOutcomeNote: stage === 'alumni' ? outcomeNote : null,
      alumniContactPhone: stage === 'alumni' ? phone || null : undefined,
      alumniContactEmail: stage === 'alumni' ? email || null : undefined,
      alumniContactConsent: stage === 'alumni' ? contactConsent : undefined,
    });
    onOpenChange(false);
    if (stage === 'alumni' && activeSponsor) setOfferTransfer(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Change lifecycle stage</DialogTitle>
            <DialogDescription>
              Alumni and exited records keep their full history — they are counted separately, never deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={(v) => setStage(v as LifecycleStage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SELECTABLE.map(s => (
                    <SelectItem key={s} value={s}>{LIFECYCLE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{LIFECYCLE_DESCRIPTIONS[stage]}</p>
            </div>

            {stage === 'exited' && (
              <div className="space-y-2">
                <Label htmlFor="exit-reason">Reason for exit</Label>
                <Textarea id="exit-reason" rows={3} value={exitReason} onChange={(e) => setExitReason(e.target.value)} />
              </div>
            )}

            {stage === 'alumni' && (
              <div className="space-y-4 rounded-lg border p-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" /> Where did they land?
                </p>
                <div className="space-y-2">
                  <Label>Outcome</Label>
                  <Select value={outcome} onValueChange={setOutcome}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALUMNI_OUTCOMES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="outcome-note">Outcome note</Label>
                  <Textarea id="outcome-note" rows={2} value={outcomeNote} onChange={(e) => setOutcomeNote(e.target.value)} placeholder="Course, employer, business…" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="alumni-phone">Current phone</Label>
                    <Input id="alumni-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alumni-email">Current email</Label>
                    <Input id="alumni-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={contactConsent} onCheckedChange={(v) => setContactConsent(!!v)} />
                  They consent to being contacted after the programme
                </label>
                {activeSponsor && (
                  <p className="text-xs text-muted-foreground">
                    {activeSponsor.donor?.donor_name || activeSponsor.donor_name || 'Their sponsor'} will be offered a
                    transfer to another beneficiary after you save.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={setLifecycle.isPending || (stage === 'exited' && !exitReason.trim())}>
              {setLifecycle.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EndSponsorshipDialog
        open={offerTransfer}
        onOpenChange={setOfferTransfer}
        relationship={activeSponsor}
        currentBeneficiaryId={beneficiaryId}
      />
    </>
  );
}
