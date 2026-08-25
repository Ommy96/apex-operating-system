import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';

export type EnrollmentChoice = 'enroll' | 'waitlist';

interface Props {
  choice: EnrollmentChoice;
  onChoiceChange: (c: EnrollmentChoice) => void;
  selectedNeedIds: string[];
  onNeedsChange: (ids: string[]) => void;
}

/**
 * Final registration step — is this person ready to be enrolled, or should
 * they join the waiting list? Choosing the waiting list still creates a real
 * beneficiary record; they are simply not yet enrolled.
 */
export function EnrollmentReadinessStep({ choice, onChoiceChange, selectedNeedIds, onNeedsChange }: Props) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const { data: needTypes, isLoading } = useQuery({
    enabled: !!orgId,
    queryKey: ['need-types-picker', orgId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('need_types')
        .select('id, label, default_cost, default_currency')
        .eq('organization_id', orgId)
        .order('label');
      if (error) throw error;
      return (data || []) as Array<{ id: string; label: string; default_cost: number | null; default_currency: string | null }>;
    },
  });

  const toggle = (id: string) =>
    onNeedsChange(selectedNeedIds.includes(id) ? selectedNeedIds.filter(x => x !== id) : [...selectedNeedIds, id]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">Ready to enroll?</h3>
        <p className="text-sm text-muted-foreground">
          Either way a full record is created — the waiting list simply means they are not yet enrolled.
        </p>
      </div>

      <RadioGroup value={choice} onValueChange={(v) => onChoiceChange(v as EnrollmentChoice)} className="space-y-2">
        <label htmlFor="choice-enroll" className="flex gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
          <RadioGroupItem value="enroll" id="choice-enroll" className="mt-1" />
          <span>
            <span className="block text-sm font-medium">Enroll now</span>
            <span className="block text-xs text-muted-foreground">Active from today — continue to programme enrollment.</span>
          </span>
        </label>
        <label htmlFor="choice-waitlist" className="flex gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
          <RadioGroupItem value="waitlist" id="choice-waitlist" className="mt-1" />
          <span>
            <span className="block text-sm font-medium">Add to waiting list</span>
            <span className="block text-xs text-muted-foreground">
              Creates a waiting-list application with the needs you record below, ranked against everyone else waiting.
            </span>
          </span>
        </label>
      </RadioGroup>

      {choice === 'waitlist' && (
        <div className="space-y-2">
          <Label>Needs to carry over</Label>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (needTypes || []).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No need types configured yet. You can add needs to the application later.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {needTypes!.map(nt => (
                <label
                  key={nt.id}
                  className="flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer hover:bg-muted/50"
                >
                  <Checkbox checked={selectedNeedIds.includes(nt.id)} onCheckedChange={() => toggle(nt.id)} />
                  <span className="text-sm truncate">{nt.label}</span>
                  {nt.default_cost ? (
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {(nt.default_currency || 'KES')} {Number(nt.default_cost).toLocaleString()}
                    </Badge>
                  ) : null}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
