import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import {
  RELATIONSHIP_PICKER,
  RELATIONSHIP_LABELS,
  INVERSE_RELATIONSHIPS,
  isHouseholdRelationship,
  suggestHouseholdName,
  type RelationshipType,
} from '@/lib/householdUtils';
import {
  useAddRelationship,
  useHouseholds,
  useCreateHousehold,
  useUpdateBeneficiaryHousehold,
} from '@/hooks/useBeneficiaryRelationships';
import { toast } from '@/hooks/use-toast';
import { Loader2, Search, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddRelationshipSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBeneficiary: {
    id: string;
    display_name: string;
    last_name?: string | null;
    county?: string | null;
    household_id?: string | null;
    date_of_birth?: string | null;
  };
  prefilledTargetId?: string;
}

type Step = 'search' | 'type' | 'household';

export function AddRelationshipSheet({
  open,
  onOpenChange,
  currentBeneficiary,
  prefilledTargetId,
}: AddRelationshipSheetProps) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const [step, setStep] = useState<Step>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [relType, setRelType] = useState<RelationshipType | null>(null);
  const [householdMode, setHouseholdMode] = useState<'existing' | 'new' | 'none'>('none');
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>('');
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [headOfHouseholdId, setHeadOfHouseholdId] = useState<string>('');

  const addRel = useAddRelationship();
  const createHousehold = useCreateHousehold();
  const updateHousehold = useUpdateBeneficiaryHousehold();
  const { data: households = [] } = useHouseholds();

  // Search beneficiaries
  const { data: searchResults = [], isFetching } = useQuery({
    queryKey: ['beneficiary-search', orgId, searchTerm],
    queryFn: async () => {
      if (!orgId) return [];
      const term = searchTerm.trim();
      if (term.length < 2) {
        // Show recent beneficiaries when no search term entered
        const { data, error } = await supabase
          .from('beneficiaries')
          .select('id, display_name, photo_url, county, date_of_birth, household_id, last_name, unique_id, first_name')
          .eq('organization_id', orgId)
          .neq('id', currentBeneficiary.id)
          .is('deleted_at', null)
          .or('is_active.is.null,is_active.eq.true')
          .order('created_at', { ascending: false })
          .limit(15);
        if (error) return [];
        return data || [];
      }
      try {
        const data = await searchBeneficiaries(term, orgId, [currentBeneficiary.id], 15);
        return data;
      } catch {
        return [];
      }
    },
    enabled: open && !!orgId && !prefilledTargetId,
  });

  // Pre-fill target if provided
  useQuery({
    queryKey: ['prefill-target', prefilledTargetId, orgId],
    queryFn: async () => {
      if (!prefilledTargetId || !orgId) return null;
      const { data } = await supabase
        .from('beneficiaries')
        .select('id, display_name, photo_url, county, date_of_birth, household_id, last_name')
        .eq('id', prefilledTargetId)
        .eq('organization_id', orgId)
        .maybeSingle();
      if (data) {
        setSelected(data);
        setStep('type');
      }
      return data;
    },
    enabled: open && !!prefilledTargetId && !!orgId && !selected,
  });

  const reset = () => {
    setStep('search');
    setSearchTerm('');
    setSelected(null);
    setRelType(null);
    setHouseholdMode('none');
    setSelectedHouseholdId('');
    setNewHouseholdName('');
    setHeadOfHouseholdId('');
  };

  const close = () => {
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  const calcAge = (dob?: string | null) => {
    if (!dob) return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    return Math.max(0, new Date().getFullYear() - d.getFullYear());
  };

  const inverseLabel = useMemo(() => {
    if (!relType) return '';
    return RELATIONSHIP_LABELS[INVERSE_RELATIONSHIPS[relType]];
  }, [relType]);

  const isHouseholdRel = relType ? isHouseholdRelationship(relType) : false;

  const handleSelectType = (type: RelationshipType) => {
    setRelType(type);
    if (isHouseholdRelationship(type)) {
      setStep('household');
      // Default new household name suggestion
      setNewHouseholdName(
        suggestHouseholdName(
          currentBeneficiary.last_name || selected?.last_name,
          currentBeneficiary.county || selected?.county,
        ),
      );
      // Default head: older of the two
      const ageA = calcAge(currentBeneficiary.date_of_birth);
      const ageB = calcAge(selected?.date_of_birth);
      const headId =
        ageA !== null && ageB !== null
          ? ageA >= ageB
            ? currentBeneficiary.id
            : selected.id
          : currentBeneficiary.id;
      setHeadOfHouseholdId(headId);
    }
  };

  const handleSave = async () => {
    if (!selected || !relType) return;
    try {
      let householdId: string | null = null;

      if (isHouseholdRel && householdMode === 'existing' && selectedHouseholdId) {
        householdId = selectedHouseholdId;
        await updateHousehold.mutateAsync({ beneficiaryId: currentBeneficiary.id, householdId });
        await updateHousehold.mutateAsync({ beneficiaryId: selected.id, householdId });
      } else if (isHouseholdRel && householdMode === 'new' && newHouseholdName.trim()) {
        householdId = await createHousehold.mutateAsync({
          household_name: newHouseholdName.trim(),
          county: currentBeneficiary.county || selected?.county || null,
          head_of_household_id: headOfHouseholdId || null,
          member_ids: [currentBeneficiary.id, selected.id],
        });
        toast({
          title: 'Household created',
          description: `${newHouseholdName.trim()} now has 2 members.`,
        });
      }

      await addRel.mutateAsync({
        beneficiaryAId: currentBeneficiary.id,
        beneficiaryBId: selected.id,
        relationshipType: relType,
        householdId,
      });

      toast({
        title: 'Relationship added',
        description: `${currentBeneficiary.display_name} is now linked as ${RELATIONSHIP_LABELS[relType].toLowerCase()} ${selected.display_name}.`,
      });
      close();
    } catch (e: any) {
      toast({ title: 'Save failed', description: e?.message, variant: 'destructive' });
    }
  };

  const saving = addRel.isPending || createHousehold.isPending || updateHousehold.isPending;

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add relationship</SheetTitle>
          <SheetDescription>
            Link {currentBeneficiary.display_name} to another person in this organisation.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {/* Step 1 — search */}
          {step === 'search' && (
            <div className="space-y-3">
              <div>
                <Label>Search for an existing beneficiary</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Type a name…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                {isFetching && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Searching…
                  </div>
                )}
                {!isFetching && searchResults.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No matches found.
                  </div>
                )}
                {searchResults.map((b: any) => {
                  const age = calcAge(b.date_of_birth);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setSelected(b);
                        setStep('type');
                      }}
                      className="w-full text-left p-3 flex items-center gap-3 hover:bg-secondary/40 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                        {b.display_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{b.display_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {age !== null ? `${age}y` : 'No DOB'}
                          {b.county ? ` · ${b.county}` : ''}
                          {b.household_id ? ' · In household' : ''}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2 — relationship type */}
          {step === 'type' && selected && (
            <div className="space-y-4">
              <Card className="p-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                  {selected.display_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{selected.display_name}</div>
                  <div className="text-xs text-muted-foreground">{selected.county || '—'}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setStep('search'); }}>
                  Change
                </Button>
              </Card>

              <div>
                <Label>How is {currentBeneficiary.display_name} related to {selected.display_name}?</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Pick the relationship from {currentBeneficiary.display_name}'s perspective.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                  {RELATIONSHIP_PICKER.map((r) => (
                    <button
                      key={r.type}
                      type="button"
                      onClick={() => handleSelectType(r.type)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                        relType === r.type
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50 hover:bg-secondary/30',
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {relType && (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                  <div>
                    You're saying <strong>{currentBeneficiary.display_name}</strong> is the{' '}
                    <Badge variant="outline" className="mx-0.5">{RELATIONSHIP_LABELS[relType].replace(' of', '').toLowerCase()}</Badge>{' '}
                    of <strong>{selected.display_name}</strong>.
                  </div>
                  <div className="text-muted-foreground">
                    This also means <strong>{selected.display_name}</strong> is the{' '}
                    <Badge variant="outline" className="mx-0.5">{inverseLabel.replace(' of', '').toLowerCase()}</Badge>{' '}
                    of {currentBeneficiary.display_name}.
                  </div>
                </div>
              )}

              {relType && !isHouseholdRel && (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={close}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save relationship
                  </Button>
                </div>
              )}

              {relType && isHouseholdRel && (
                <div className="flex justify-end">
                  <Button onClick={() => setStep('household')}>
                    Continue <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 3 — household prompt */}
          {step === 'household' && selected && relType && (
            <div className="space-y-4">
              <div>
                <Label>Do these people live in the same household?</Label>
                <div className="grid gap-2 mt-3">
                  {([
                    { id: 'existing', title: 'Yes — add to an existing household', desc: 'Pick from this organisation\'s households.' },
                    { id: 'new', title: 'Yes — create a new household for them', desc: 'Both people will be added to a brand new household.' },
                    { id: 'none', title: 'No — related but separate households', desc: 'Just save the relationship.' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setHouseholdMode(opt.id)}
                      className={cn(
                        'text-left rounded-lg border p-3 transition-colors',
                        householdMode === opt.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40',
                      )}
                    >
                      <div className="text-sm font-medium">{opt.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {householdMode === 'existing' && (
                <div>
                  <Label>Choose a household</Label>
                  <Select value={selectedHouseholdId} onValueChange={setSelectedHouseholdId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {households.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">No households yet.</div>
                      )}
                      {households.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.household_name || 'Household'} · {h.member_count ?? 0} members
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {householdMode === 'new' && (
                <div className="space-y-3">
                  <div>
                    <Label>Household name</Label>
                    <Input
                      value={newHouseholdName}
                      onChange={(e) => setNewHouseholdName(e.target.value)}
                      placeholder="e.g. Odhiambo Family"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Head of household</Label>
                    <Select value={headOfHouseholdId} onValueChange={setHeadOfHouseholdId}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={currentBeneficiary.id}>{currentBeneficiary.display_name}</SelectItem>
                        <SelectItem value={selected.id}>{selected.display_name}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep('type')}>Back</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={close}>Cancel</Button>
                  <Button
                    onClick={handleSave}
                    disabled={
                      saving ||
                      (householdMode === 'existing' && !selectedHouseholdId) ||
                      (householdMode === 'new' && !newHouseholdName.trim())
                    }
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}