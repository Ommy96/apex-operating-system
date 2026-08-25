import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  FUNDING_MODEL_HELP,
  FUNDING_MODEL_LABELS,
  useFundingModel,
  donorSupportCopy,
  type SponsorshipFundingModel,
} from '@/hooks/useFundingModel';

export function SponsorshipFundingModelCard() {
  const { model, isLoading, setModel } = useFundingModel();
  const [draft, setDraft] = useState<SponsorshipFundingModel | null>(null);
  const value = draft ?? model;
  const dirty = draft !== null && draft !== model;

  if (isLoading) {
    return <Card><CardContent className="p-6"><Skeleton className="h-28 w-full" /></CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sponsorship funding model</CardTitle>
        <CardDescription>
          How sponsorship payments are attributed. This affects future allocations and the language donors see.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={value} onValueChange={(v) => setDraft(v as SponsorshipFundingModel)} className="space-y-2">
          {(Object.keys(FUNDING_MODEL_LABELS) as SponsorshipFundingModel[]).map(m => (
            <label key={m} htmlFor={`fm-${m}`} className="flex gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value={m} id={`fm-${m}`} className="mt-1" />
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium">{FUNDING_MODEL_LABELS[m]}</span>
                  {m === model && <Badge variant="secondary" className="text-[10px]">Current</Badge>}
                </span>
                <span className="block text-xs text-muted-foreground">{FUNDING_MODEL_HELP[m]}</span>
              </span>
            </label>
          ))}
        </RadioGroup>

        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Donors will see</p>
          <p className="text-sm">{donorSupportCopy(value, 'Education', 'Amina')}</p>
        </div>

        {dirty && (
          <p className="text-xs text-warning flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Changing this affects how FUTURE allocations attribute sponsorship payments. Existing allocations are
            untouched.
          </p>
        )}

        <div className="flex gap-2">
          <Button onClick={() => draft && setModel.mutate(draft)} disabled={!dirty || setModel.isPending}>
            {setModel.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save funding model
          </Button>
          {dirty && <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>}
        </div>
      </CardContent>
    </Card>
  );
}
