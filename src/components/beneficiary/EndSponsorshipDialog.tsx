import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useEndSponsorship, type SponsorRelationship } from '@/hooks/useSponsorRelationships';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  relationship: SponsorRelationship | null;
  /** Beneficiary the sponsorship is currently on — excluded from transfer targets. */
  currentBeneficiaryId: string;
}

type Mode = 'end' | 'transfer' | 'lapse';

export function EndSponsorshipDialog({ open, onOpenChange, relationship, currentBeneficiaryId }: Props) {
  const [mode, setMode] = useState<Mode>('end');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const debounced = useDebouncedValue(search, 300);
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const endMutation = useEndSponsorship();

  const { data: candidates, isFetching } = useQuery({
    enabled: open && mode === 'transfer' && !!orgId && debounced.trim().length >= 2,
    queryKey: ['transfer-candidates', orgId, debounced],
    queryFn: async () => {
      const term = `%${debounced.trim()}%`;
      const { data, error } = await (supabase as any)
        .from('beneficiaries')
        .select('id, display_name, first_name, last_name, beneficiary_code, lifecycle_stage')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .in('lifecycle_stage', ['active', 'waiting_list', 'applicant'])
        .neq('id', currentBeneficiaryId)
        .or(`display_name.ilike.${term},first_name.ilike.${term},last_name.ilike.${term},beneficiary_code.ilike.${term}`)
        .limit(10);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const reset = () => {
    setMode('end');
    setReason('');
    setSearch('');
    setTarget(null);
  };

  const submit = async () => {
    if (!relationship) return;
    await endMutation.mutateAsync({
      relationship,
      mode,
      reason,
      toBeneficiaryId: target?.id,
    });
    reset();
    onOpenChange(false);
  };

  const disabled = endMutation.isPending || (mode === 'transfer' && !target) || (mode !== 'lapse' && !reason.trim());

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>End sponsorship</DialogTitle>
          <DialogDescription>
            {relationship?.donor?.donor_name || relationship?.donor_name || 'This sponsor'} — the beneficiary stays
            enrolled either way. Ending a sponsorship never removes programme support.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="space-y-2">
            {([
              ['end', 'End the sponsorship', 'The relationship closes. The beneficiary is funded from the programme pool.'],
              ['transfer', 'Transfer this sponsor', 'Move the sponsor to another beneficiary. Both records are logged.'],
              ['lapse', 'Mark as lapsed', 'Payments stopped but the relationship may resume.'],
            ] as const).map(([value, label, help]) => (
              <label
                key={value}
                htmlFor={`mode-${value}`}
                className="flex gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
              >
                <RadioGroupItem value={value} id={`mode-${value}`} className="mt-1" />
                <span>
                  <span className="block text-sm font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">{help}</span>
                </span>
              </label>
            ))}
          </RadioGroup>

          {mode === 'transfer' && (
            <div className="space-y-2">
              <Label>Transfer to</Label>
              {target ? (
                <Card className="p-3 flex items-center justify-between">
                  <span className="text-sm font-medium">{target.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => setTarget(null)}>Change</Button>
                </Card>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Search by name or code…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  {isFetching && <p className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Searching…</p>}
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {(candidates || []).map((c) => {
                      const name = c.display_name || `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim();
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setTarget({ id: c.id, name })}
                          className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted"
                        >
                          {name}
                          <span className="text-xs text-muted-foreground ml-2">{c.beneficiary_code || ''}</span>
                        </button>
                      );
                    })}
                    {!isFetching && debounced.trim().length >= 2 && (candidates || []).length === 0 && (
                      <p className="text-xs text-muted-foreground px-1">No matches.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="end-reason">Reason {mode === 'lapse' ? '(optional)' : ''}</Label>
            <Textarea
              id="end-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this sponsorship ending?"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={disabled}>
            {endMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {mode === 'transfer' ? 'Transfer sponsor' : mode === 'lapse' ? 'Mark lapsed' : 'End sponsorship'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
