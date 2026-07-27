import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, UserCheck, UserX, FilePlus2, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export interface DuplicateMatch {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  date_of_birth: string | null;
  sub_county: string | null;
  household_id: string | null;
  match_score: number;
  match_reasons: Record<string, any>;
}

interface Props {
  open: boolean;
  matches: DuplicateMatch[];
  orgId?: string;
  newBeneficiarySnapshot: {
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    sub_county?: string;
  };
  onLoadExisting: (id: string) => void;
  onSaveAnyway: () => void;
  onClose: () => void;
}

const reasonLabels: Record<string, string> = {
  name_similarity: 'Name similarity',
  phonetic_first: 'Sounds like (first)',
  phonetic_last: 'Sounds like (last)',
  dob_exact: 'Same date of birth',
  dob_within_1y: 'DOB within 1 year',
  sub_county_match: 'Same sub-county',
  household_match: 'Same household',
};

function ReasonBadges({ reasons }: { reasons: Record<string, any> }) {
  const items: string[] = [];
  for (const [k, v] of Object.entries(reasons || {})) {
    if (k === 'name_similarity' && typeof v === 'number' && v > 0)
      items.push(`${reasonLabels[k]} ${Math.round(v * 100)}%`);
    else if (v === true && reasonLabels[k]) items.push(reasonLabels[k]);
  }
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {items.map((t) => (
        <Badge key={t} variant="secondary" className="text-[10px]">
          {t}
        </Badge>
      ))}
    </div>
  );
}

export function DuplicatePreSaveDialog({
  open,
  matches,
  orgId,
  newBeneficiarySnapshot,
  onLoadExisting,
  onSaveAnyway,
  onClose,
}: Props) {
  const sorted = useMemo(
    () => [...matches].sort((a, b) => b.match_score - a.match_score),
    [matches],
  );

  const markDistinct = async (existingId: string) => {
    if (!orgId) return;
    try {
      // Look up the new candidate's tentative id is not yet known; we just log
      // this pair so the same warning won't keep firing for an in-progress draft.
      // We can't insert a duplicate_candidates row without a real beneficiary id
      // (the constraint requires both ids to exist), so we audit-log instead.
      await supabase.from('audit_logs').insert({
        event_type: 'duplicate_marked_distinct_at_intake',
        entity_type: 'beneficiary',
        entity_id: existingId,
        metadata: {
          organization_id: orgId,
          existing_id: existingId,
          new_record: newBeneficiarySnapshot,
        },
      });
      toast({ title: 'Marked as different person' });
    } catch (e) {
      // non-fatal
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" style={{ color: 'var(--status-warning)' }} />
            We found {sorted.length} possible existing{' '}
            {sorted.length === 1 ? 'record' : 'records'}
          </DialogTitle>
          <DialogDescription>
            Review before saving to avoid creating a duplicate beneficiary.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {sorted.map((m) => (
            <div
              key={m.id}
              className="rounded-md border p-3 bg-card flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {m.display_name ||
                      [m.first_name, m.last_name].filter(Boolean).join(' ')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    DOB: {m.date_of_birth ?? 'N/A'} · Sub-county:{' '}
                    {m.sub_county ?? 'N/A'}
                  </div>
                  <ReasonBadges reasons={m.match_reasons} />
                </div>
                <Badge
                  variant={m.match_score >= 85 ? 'destructive' : 'default'}
                  className="shrink-0"
                >
                  {m.match_score}%
                </Badge>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onLoadExisting(m.id)}
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1" /> Same person —
                  open record
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => markDistinct(m.id)}
                >
                  <UserX className="h-3.5 w-3.5 mr-1" /> Different person
                </Button>
                <Button
                  size="sm"
                  variant="link"
                  className="ml-auto"
                  onClick={() => window.open(`/beneficiary/${m.id}`, '_blank')}
                >
                  View profile <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" onClick={onSaveAnyway}>
            <FilePlus2 className="h-4 w-4 mr-1" /> Save as new anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
