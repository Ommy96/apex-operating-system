import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Route } from 'lucide-react';
import { format } from 'date-fns';
import {
  LIFECYCLE_DESCRIPTIONS,
  LIFECYCLE_LABELS,
  alumniOutcomeLabel,
  normaliseStage,
} from '@/lib/lifecycle';
import { LifecycleStageDialog } from './LifecycleStageDialog';

interface Props {
  beneficiaryId: string;
  lifecycleStage?: string | null;
  lifecycleChangedAt?: string | null;
  alumniSince?: string | null;
  alumniOutcome?: string | null;
  exitReason?: string | null;
  canEdit?: boolean;
}

const tone: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  waiting_list: 'bg-warning/10 text-warning border-warning/20',
  paused: 'bg-warning/10 text-warning border-warning/20',
  alumni: 'bg-primary/10 text-primary border-primary/20',
  exited: 'bg-muted text-muted-foreground',
  applicant: 'bg-muted text-muted-foreground',
  archived: 'bg-muted text-muted-foreground',
};

export function BeneficiaryLifecycleCard({
  beneficiaryId,
  lifecycleStage,
  lifecycleChangedAt,
  alumniSince,
  alumniOutcome,
  exitReason,
  canEdit = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const stage = normaliseStage(lifecycleStage);

  return (
    <>
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Route className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Lifecycle</span>
              <Badge variant="outline" className={`text-[10px] ${tone[stage] || ''}`}>{LIFECYCLE_LABELS[stage]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {LIFECYCLE_DESCRIPTIONS[stage]}
              {stage === 'alumni' && alumniOutcome ? ` · ${alumniOutcomeLabel(alumniOutcome)}` : ''}
              {stage === 'alumni' && alumniSince ? ` · since ${format(new Date(alumniSince), 'd MMM yyyy')}` : ''}
              {stage === 'exited' && exitReason ? ` · ${exitReason}` : ''}
              {lifecycleChangedAt ? ` · updated ${format(new Date(lifecycleChangedAt), 'd MMM yyyy')}` : ''}
            </p>
          </div>
          {canEdit && (
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => setOpen(true)}>
              Change stage
            </Button>
          )}
        </CardContent>
      </Card>

      <LifecycleStageDialog
        open={open}
        onOpenChange={setOpen}
        beneficiaryId={beneficiaryId}
        currentStage={lifecycleStage}
      />
    </>
  );
}
