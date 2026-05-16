import { Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  beneficiary: any;
  guardianCount: number;
}

export function ProfileCompletenessMeter({ beneficiary, guardianCount }: Props) {
  const checks: { label: string; ok: boolean }[] = [
    { label: 'Photo', ok: !!beneficiary.photo_url },
    { label: 'Date of birth', ok: !!beneficiary.date_of_birth },
    { label: 'Gender', ok: !!beneficiary.gender },
    { label: 'County', ok: !!beneficiary.county },
    { label: 'Sub-county', ok: !!beneficiary.sub_county },
    { label: 'Village', ok: !!beneficiary.estate_village },
    { label: 'Primary need', ok: !!beneficiary.primary_need },
    { label: 'Vulnerability level', ok: !!beneficiary.vulnerability_level },
    { label: 'Consent recorded', ok: !!beneficiary.consent_given },
    { label: 'Contact / guardian', ok: guardianCount > 0 },
    { label: 'Background narrative', ok: !!beneficiary.background_narrative },
  ];
  const total = checks.length;
  const complete = checks.filter(c => c.ok).length;
  const pct = Math.round((complete / total) * 100);
  const missing = checks.filter(c => !c.ok).map(c => c.label);
  const tone = pct >= 80 ? 'bg-primary' : pct >= 50 ? 'bg-warning' : 'bg-destructive';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden min-w-[80px]">
              <div className={`h-full ${tone} transition-all`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground tabular-nums">{pct}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-semibold text-xs mb-1">Profile completeness: {complete}/{total}</p>
          {missing.length > 0 ? (
            <>
              <p className="text-[11px] text-muted-foreground mb-1">Missing:</p>
              <ul className="text-[11px] space-y-0.5">
                {missing.map(m => <li key={m}>• {m}</li>)}
              </ul>
            </>
          ) : (
            <p className="text-[11px] flex items-center gap-1"><Check className="h-3 w-3" /> All fields complete</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}