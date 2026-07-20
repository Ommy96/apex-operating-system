import { useNavigate, useParams } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ArrowLeft, Crown, Home, Loader2, MapPin, Pencil, Plus, Users, Shield, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useHousehold, useHouseholdMembers } from '@/hooks/useBeneficiaryRelationships';
import { useUpdateBeneficiaryHousehold } from '@/hooks/useBeneficiaryRelationships';
import { useBeneficiarySearch } from '@/hooks/useBeneficiarySearch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { calculateAge } from '@/lib/ageUtils';
import { useState } from 'react';
import { RegisterFamilySheet } from '@/components/beneficiary/RegisterFamilySheet';
import { formatDisplayDate } from '@/lib/dateUtils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

export default function HouseholdProfile() {
  const { householdId } = useParams<{ householdId: string }>();
  const navigate = useNavigate();
  const { data: household, isLoading } = useHousehold(householdId);
  const { data: members = [] } = useHouseholdMembers(householdId);
  useDocumentTitle((household as any)?.household_name ?? null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [headOpen, setHeadOpen] = useState(false);
  const [pickedHead, setPickedHead] = useState<string | null>(null);
  const [pickedHeadKind, setPickedHeadKind] = useState<'beneficiary' | 'guardian'>('beneficiary');
  const [savingHead, setSavingHead] = useState(false);
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { user } = useAuth();
  const canEditHead = !!(can as any).manageBeneficiaries || !!(can as any).editBeneficiaries;
  const memberIds = members.map((m: any) => m.id);
  const { searchTerm, setSearchTerm, results, isFetching } = useBeneficiarySearch(memberIds, 15);
  const updateHousehold = useUpdateBeneficiaryHousehold();

  // Load primary guardians for any member — candidates for head-of-household
  const { data: guardians = [] } = useQuery({
    enabled: memberIds.length > 0,
    queryKey: ['household-guardians', householdId, memberIds.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiary_guardians')
        .select('is_primary, beneficiary_id, guardians!inner(id, full_name, guardian_type, phone)')
        .in('beneficiary_id', memberIds);
      if (error) throw error;
      const map = new Map<string, any>();
      (data || []).forEach((row: any) => {
        if (!row.guardians) return;
        const g = { ...row.guardians, is_primary: !!row.is_primary };
        if (!map.has(g.id) || g.is_primary) map.set(g.id, g);
      });
      return Array.from(map.values());
    },
  });

  // Programmes each member is enrolled in
  const { data: memberPrograms = {} } = useQuery({
    enabled: memberIds.length > 0,
    queryKey: ['household-member-programs', memberIds.join(',')],
    queryFn: async (): Promise<Record<string, { id: string; name: string }[]>> => {
      const { data, error } = await supabase
        .from('beneficiary_services')
        .select('beneficiary_id, program_id, programs:program_id(id, name)')
        .in('beneficiary_id', memberIds)
        .eq('status', 'active');
      if (error) throw error;
      const out: Record<string, { id: string; name: string }[]> = {};
      (data || []).forEach((r: any) => {
        if (!r.programs) return;
        const arr = out[r.beneficiary_id] || (out[r.beneficiary_id] = []);
        if (!arr.find(p => p.id === r.programs.id)) arr.push({ id: r.programs.id, name: r.programs.name });
      });
      return out;
    },
  });

  // Auto-suggest head-of-household when none set (must sit with hooks, not after
  // early returns, or React throws error #310).
  const guardianHeadId: string | null = (household as any)?.head_guardian_id ?? null;
  const currentHeadBenId = (household as any)?.head_of_household_id ?? null;
  useEffect(() => {
    if (!household) return;
    if (currentHeadBenId || guardianHeadId) return;
    if (headOpen) return;
    const primary = (guardians as any[]).find((g: any) => g.is_primary);
    if (primary) {
      setPickedHead(primary.id);
      setPickedHeadKind('guardian');
    }
  }, [household, currentHeadBenId, guardianHeadId, guardians, headOpen]);

  const handleAddExisting = async (beneficiaryId: string) => {
    if (!householdId) return;
    try {
      await updateHousehold.mutateAsync({ beneficiaryId, householdId });
      toast({ title: 'Member added to household' });
      setSearchTerm('');
      setAddOpen(false);
    } catch (e: any) {
      toast({ title: 'Failed to add member', description: e?.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!household) {
    return (
      <div className="text-center py-12">
        <Home className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Household not found</h3>
        <Button variant="outline" onClick={() => navigate('/beneficiaries')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to beneficiaries
        </Button>
      </div>
    );
  }

  const guardianHeadId: string | null = (household as any).head_guardian_id ?? null;
  const beneficiaryHead = members.find((m: any) => m.id === household.head_of_household_id);
  const guardianHead = guardians.find((g: any) => g.id === guardianHeadId);
  const head = beneficiaryHead
    ? { name: beneficiaryHead.display_name, kind: 'beneficiary' as const }
    : guardianHead
      ? { name: guardianHead.full_name, kind: 'guardian' as const }
      : null;

  const handleChangeHead = async () => {
    if (!pickedHead || !householdId) return;
    setSavingHead(true);
    try {
      const previousHeadId = household.head_of_household_id || null;
      const patch: any = pickedHeadKind === 'beneficiary'
        ? { head_of_household_id: pickedHead, head_guardian_id: null }
        : { head_of_household_id: null, head_guardian_id: pickedHead };
      const { error } = await supabase
        .from('households' as any)
        .update(patch)
        .eq('id', householdId);
      if (error) throw error;
      try {
        await supabase.from('audit_logs').insert({
          event_type: 'change_household_head',
          entity_type: 'household',
          entity_id: householdId,
          user_id: user?.id,
          old_values: { head_of_household_id: previousHeadId, head_guardian_id: guardianHeadId } as any,
          new_values: patch as any,
          metadata: { household_name: household.household_name } as any,
        } as any);
      } catch (_) { /* non-fatal */ }
      const newLabel = pickedHeadKind === 'beneficiary'
        ? members.find((m: any) => m.id === pickedHead)?.display_name
        : guardians.find((g: any) => g.id === pickedHead)?.full_name;
      toast({ title: `Head of household updated to ${newLabel || 'new head'}` });
      queryClient.invalidateQueries({ queryKey: ['household', householdId] });
      queryClient.invalidateQueries({ queryKey: ['household-members', householdId] });
      setHeadOpen(false);
      setPickedHead(null);
    } catch (e: any) {
      toast({ title: 'Failed to change head', description: e?.message, variant: 'destructive' });
    } finally {
      setSavingHead(false);
    }
  };

  const eligibleBeneficiaryHeads = members.filter((m: any) => m.id !== household.head_of_household_id);
  const eligibleGuardianHeads = guardians.filter((g: any) => g.id !== guardianHeadId);

  const vulnLevels: Record<string, number> = {};
  members.forEach((m: any) => {
    const v = m.vulnerability_level || 'low';
    vulnLevels[v] = (vulnLevels[v] || 0) + 1;
  });
  const highestVuln = ['critical', 'high', 'medium', 'low'].find((l) => vulnLevels[l]) || '—';

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-4 space-y-5">
      <button
        onClick={() => navigate('/beneficiaries')}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to beneficiaries
      </button>

      <Card className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-xl font-semibold">{household.household_name || 'Household'}</h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5 flex-wrap">
              {household.county && <Badge variant="outline"><MapPin className="h-3 w-3 mr-1" />{household.county}</Badge>}
              <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
              {head && (<><span>·</span><span>
                <Crown className="h-3 w-3 inline mr-0.5 text-warning" /> Head: <strong>{head.name}</strong>
                {head.kind === 'guardian' && <Badge variant="outline" className="ml-1.5 text-[10px] py-0"><Shield className="h-2.5 w-2.5 mr-0.5" />Guardian</Badge>}
              </span></>)}
              <span>·</span>
              <span>Created {formatDisplayDate(household.created_at)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">Highest vulnerability: {highestVuln}</Badge>
            {canEditHead && (
              <Button variant="outline" size="sm" onClick={() => { setPickedHead(null); setHeadOpen(true); }}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> {head ? 'Change head' : 'Set head'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" /> Members
            </h2>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add member
            </Button>
          </div>
          <div className="space-y-2">
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground">No members yet.</p>
            )}
            {members.map((m: any) => {
              const age = calculateAge(m.date_of_birth);
              const isHead = m.id === household.head_of_household_id;
              const progs = memberPrograms[m.id] || [];
              return (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-secondary/30 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                    {m.display_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {m.display_name}
                      {isHead && <Crown className="h-3 w-3 text-warning" />}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {age !== null ? `${age}y` : 'No DOB'}
                      {m.gender ? ` · ${m.gender}` : ''}
                      {m.vulnerability_level ? ` · ${m.vulnerability_level}` : ''}
                    </div>
                    {progs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {progs.map(p => (
                          <Badge key={p.id} variant="outline" className="text-[10px] py-0 font-normal">
                            <GraduationCap className="h-2.5 w-2.5 mr-0.5" />{p.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/beneficiaries/${m.id}`)}>
                    View profile
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="space-y-3">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Vulnerability summary</h3>
            <div className="space-y-1.5 text-xs">
              {(['critical', 'high', 'medium', 'low'] as const).map((lvl) => (
                <div key={lvl} className="flex items-center justify-between">
                  <span className="capitalize text-muted-foreground">{lvl}</span>
                  <span className="font-medium">{vulnLevels[lvl] || 0}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <RegisterFamilySheet
        open={registerOpen}
        onOpenChange={setRegisterOpen}
      />

      <Dialog open={headOpen} onOpenChange={setHeadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change head of household</DialogTitle>
            <DialogDescription>
              Pick a household member or a primary guardian to serve as head.
            </DialogDescription>
          </DialogHeader>
          {eligibleBeneficiaryHeads.length === 0 && eligibleGuardianHeads.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No eligible members or guardians available.
            </p>
          ) : (
            <RadioGroup
              value={pickedHead ? `${pickedHeadKind}:${pickedHead}` : ''}
              onValueChange={(v) => {
                const [kind, id] = v.split(':');
                setPickedHeadKind(kind as any);
                setPickedHead(id);
              }}
              className="space-y-3 max-h-80 overflow-y-auto"
            >
              {eligibleBeneficiaryHeads.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">Beneficiaries</Label>
                  {eligibleBeneficiaryHeads.map((m: any) => {
                const age = calculateAge(m.date_of_birth);
                    const id = `beneficiary:${m.id}`;
                return (
                  <label
                    key={m.id}
                        htmlFor={`head-${id}`}
                    className="flex items-center gap-3 p-2 rounded-md border hover:bg-secondary/40 cursor-pointer"
                  >
                        <RadioGroupItem id={`head-${id}`} value={id} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{m.display_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {age !== null ? `${age}y` : 'No DOB'}{m.gender ? ` · ${m.gender}` : ''}
                      </div>
                    </div>
                  </label>
                );
              })}
                </div>
              )}
              {eligibleGuardianHeads.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Guardians
                  </Label>
                  {eligibleGuardianHeads.map((g: any) => {
                    const id = `guardian:${g.id}`;
                    return (
                      <label
                        key={g.id}
                        htmlFor={`head-${id}`}
                        className="flex items-center gap-3 p-2 rounded-md border hover:bg-secondary/40 cursor-pointer"
                      >
                        <RadioGroupItem id={`head-${id}`} value={id} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{g.full_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {g.guardian_type || 'Guardian'}{g.phone ? ` · ${g.phone}` : ''}
                            {g.is_primary ? ' · primary' : ''}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </RadioGroup>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHeadOpen(false)}>Cancel</Button>
            <Button onClick={handleChangeHead} disabled={!pickedHead || savingHead}>
              {savingHead ? 'Saving…' : 'Confirm change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add existing beneficiary to household</DialogTitle>
            <DialogDescription>
              Search by name or unique ID to attach an existing beneficiary to this household.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              placeholder="Search beneficiaries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
              {searchTerm.trim().length < 2 && (
                <p className="p-3 text-sm text-muted-foreground">Type at least 2 characters to search.</p>
              )}
              {searchTerm.trim().length >= 2 && !isFetching && results.length === 0 && (
                <p className="p-3 text-sm text-muted-foreground">No beneficiaries found.</p>
              )}
              {results.map((b) => {
                const age = calculateAge(b.date_of_birth);
                return (
                  <div key={b.id} className="flex items-center gap-3 p-3">
                    <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold">
                      {b.display_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{b.display_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.unique_id || '—'}
                        {age !== null ? ` · ${age}y` : ''}
                        {b.gender ? ` · ${b.gender}` : ''}
                        {b.household_id && b.household_id !== householdId ? ' · already in another household' : ''}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddExisting(b.id)}
                      disabled={updateHousehold.isPending}
                    >
                      Add
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter className="sm:justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setAddOpen(false);
                setRegisterOpen(true);
              }}
            >
              Register a new beneficiary instead
            </Button>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}