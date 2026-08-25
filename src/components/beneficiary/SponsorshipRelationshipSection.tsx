import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, HeartOff, ArrowRightLeft, Info } from 'lucide-react';
import { format } from 'date-fns';
import { useSponsorRelationships, type SponsorRelationship } from '@/hooks/useSponsorRelationships';
import { useFundingModel, donorSupportCopy } from '@/hooks/useFundingModel';
import { EndSponsorshipDialog } from './EndSponsorshipDialog';

interface Props {
  beneficiaryId: string;
  beneficiaryName?: string | null;
  programmeName?: string | null;
}

const statusTone: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  lapsed: 'bg-warning/10 text-warning border-warning/20',
  ended: 'bg-muted text-muted-foreground',
  transferred: 'bg-muted text-muted-foreground',
};

/**
 * The SPONSOR RELATIONSHIP — who is personally connected to this person.
 * Deliberately separate from ENROLLMENT (what support they receive) and
 * FUNDING (who pays, via the Allocation Engine).
 */
export function SponsorshipRelationshipSection({ beneficiaryId, beneficiaryName, programmeName }: Props) {
  const { data: relationships, isLoading } = useSponsorRelationships(beneficiaryId);
  const { model, isPooled } = useFundingModel();
  const [ending, setEnding] = useState<SponsorRelationship | null>(null);

  const active = (relationships || []).filter(r => r.status === 'active');
  const lapsed = (relationships || []).filter(r => r.status === 'lapsed');
  const past = (relationships || []).filter(r => r.status === 'ended' || r.status === 'transferred');

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Sponsorship</CardTitle></CardHeader>
        <CardContent className="space-y-2"><Skeleton className="h-16 w-full" /></CardContent>
      </Card>
    );
  }

  const renderRow = (r: SponsorRelationship, actionable: boolean) => (
    <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{r.donor?.donor_name || r.donor_name || 'Unnamed sponsor'}</span>
          <Badge variant="outline" className={`text-[10px] ${statusTone[r.status] || ''}`}>{r.status}</Badge>
          <Badge variant="secondary" className="text-[10px]">{r.relationship_type.replace('_', ' ')}</Badge>
          {r.package?.name && <Badge variant="outline" className="text-[10px]">{r.package.name}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Since {r.started_on ? format(new Date(r.started_on), 'd MMM yyyy') : '—'}
          {r.ended_on ? ` · ended ${format(new Date(r.ended_on), 'd MMM yyyy')}` : ''}
          {r.end_reason ? ` · ${r.end_reason}` : ''}
        </p>
      </div>
      {actionable && (
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => setEnding(r)}>
          <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" /> End or transfer
        </Button>
      )}
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" /> Sponsorship relationship
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {donorSupportCopy(model, programmeName, beneficiaryName)}
          </p>

          {active.length > 0 && active.map(r => renderRow(r, true))}

          {active.length === 0 && lapsed.length > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <p className="text-sm font-medium text-warning">Sponsorship lapsed — still enrolled</p>
              <p className="text-xs text-muted-foreground mt-1">
                Programme support continues, funded from the {isPooled ? 'programme' : 'general'} pool.
              </p>
              <div className="mt-2 space-y-2">{lapsed.map(r => renderRow(r, true))}</div>
            </div>
          )}

          {active.length === 0 && lapsed.length === 0 && (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <HeartOff className="h-5 w-5 mx-auto text-muted-foreground mb-1.5" />
              <p className="text-sm font-medium">No individual sponsor</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enrolled and supported from the programme pool. An individual sponsor is optional.
              </p>
            </div>
          )}

          {past.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Past sponsors</p>
              <div className="space-y-2">{past.map(r => renderRow(r, false))}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <EndSponsorshipDialog
        open={!!ending}
        onOpenChange={(v) => !v && setEnding(null)}
        relationship={ending}
        currentBeneficiaryId={beneficiaryId}
      />
    </>
  );
}
