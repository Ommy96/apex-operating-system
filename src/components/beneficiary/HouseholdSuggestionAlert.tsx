import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Home, X } from 'lucide-react';
import { AddRelationshipSheet } from './AddRelationshipSheet';

interface Match {
  id: string;
  display_name: string;
  county: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  household_id: string | null;
}

interface HouseholdSuggestionAlertProps {
  beneficiary: {
    id: string;
    display_name: string;
    last_name?: string | null;
    county?: string | null;
    sub_county?: string | null;
    household_id?: string | null;
    date_of_birth?: string | null;
  };
  onDismiss?: () => void;
}

export function HouseholdSuggestionAlert({ beneficiary, onDismiss }: HouseholdSuggestionAlertProps) {
  const { currentOrganization } = useOrganization();
  const { user } = useAuth();
  const orgId = currentOrganization?.organization_id;
  const [matches, setMatches] = useState<Match[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [linkTarget, setLinkTarget] = useState<Match | null>(null);

  useEffect(() => {
    if (!orgId || !beneficiary.last_name || !beneficiary.county) return;
    let cancelled = false;
    (async () => {
      const q = supabase
        .from('beneficiaries')
        .select('id, display_name, county, last_name, date_of_birth, household_id')
        .eq('organization_id', orgId)
        .neq('id', beneficiary.id)
        .is('deleted_at', null)
        .ilike('last_name', beneficiary.last_name!)
        .eq('county', beneficiary.county!)
        .limit(8);
      const { data } = await q;
      if (cancelled) return;

      // Filter out previously dismissed
      const { data: dis } = await supabase
        .from('dismissed_household_suggestions' as any)
        .select('beneficiary_b_id')
        .eq('organization_id', orgId)
        .eq('user_id', user?.id || '')
        .eq('beneficiary_a_id', beneficiary.id);
      const dismissedIds = new Set((dis || []).map((d: any) => d.beneficiary_b_id));
      setMatches(((data || []) as Match[]).filter((m) => !dismissedIds.has(m.id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, beneficiary.id, beneficiary.last_name, beneficiary.county, user?.id]);

  const dismiss = async (matchId: string) => {
    if (!orgId || !user?.id) return;
    setDismissed((prev) => new Set(prev).add(matchId));
    await supabase.from('dismissed_household_suggestions' as any).insert({
      organization_id: orgId,
      user_id: user.id,
      beneficiary_a_id: beneficiary.id,
      beneficiary_b_id: matchId,
    } as any);
  };

  const visibleMatches = matches.filter((m) => !dismissed.has(m.id));
  if (visibleMatches.length === 0) return null;

  return (
    <>
      <Card className="border-warning/30 bg-warning/5 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Home className="h-4 w-4 mt-0.5 text-warning" />
          <div className="flex-1">
            <div className="text-sm font-semibold">Possible household connection</div>
            <div className="text-xs text-muted-foreground">
              We found {visibleMatches.length} {visibleMatches.length === 1 ? 'person' : 'people'} with similar details
              who may be from the same household.
            </div>
          </div>
          {onDismiss && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {visibleMatches.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 rounded-md border bg-card p-2">
              <div className="text-sm">
                <div className="font-medium">{m.display_name}</div>
                <div className="text-xs text-muted-foreground">{m.county || '—'}</div>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => dismiss(m.id)}>
                  Different family
                </Button>
                <Button size="sm" onClick={() => setLinkTarget(m)}>
                  They're related
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {linkTarget && (
        <AddRelationshipSheet
          open={!!linkTarget}
          onOpenChange={(o) => { if (!o) setLinkTarget(null); }}
          currentBeneficiary={beneficiary as any}
          prefilledTargetId={linkTarget.id}
        />
      )}
    </>
  );
}