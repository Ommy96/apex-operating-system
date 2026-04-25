import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KENYA_COUNTIES } from '@/lib/kenyaCounties';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCreateHousehold } from '@/hooks/useBeneficiaryRelationships';
import { useAddRelationship } from '@/hooks/useBeneficiaryRelationships';
import { calculateAge } from '@/lib/ageUtils';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { RelationshipType } from '@/lib/householdUtils';

interface RegisterFamilySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (householdId: string) => void;
}

interface MemberDraft {
  tempId: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  relationship_to_head: string;
}

const RELATION_OPTIONS: { value: string; label: string; type: RelationshipType }[] = [
  { value: 'spouse', label: 'Spouse', type: 'spouse' },
  { value: 'child', label: 'Child', type: 'child_parent' },
  { value: 'parent', label: 'Parent', type: 'parent_child' },
  { value: 'sibling', label: 'Sibling', type: 'sibling' },
  { value: 'grandchild', label: 'Grandchild', type: 'grandchild_grandparent' },
  { value: 'ward', label: 'Ward', type: 'ward_guardian' },
  { value: 'other', label: 'Other', type: 'other_family' },
];

const newMember = (): MemberDraft => ({
  tempId: Math.random().toString(36).slice(2),
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: '',
  relationship_to_head: 'child',
});

export function RegisterFamilySheet({ open, onOpenChange, onSuccess }: RegisterFamilySheetProps) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const navigate = useNavigate();
  const createHousehold = useCreateHousehold();
  const addRel = useAddRelationship();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [householdName, setHouseholdName] = useState('');
  const [county, setCounty] = useState('');
  const [subCounty, setSubCounty] = useState('');
  const [village, setVillage] = useState('');
  const [headIdx, setHeadIdx] = useState(0);
  const [members, setMembers] = useState<MemberDraft[]>([newMember(), newMember()]);
  const [saving, setSaving] = useState(false);

  const subCounties = county ? KENYA_COUNTIES[county] || [] : [];

  const updateMember = (idx: number, patch: Partial<MemberDraft>) =>
    setMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));

  const removeMember = (idx: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== idx));
    if (headIdx >= idx && headIdx > 0) setHeadIdx(headIdx - 1);
  };

  const reset = () => {
    setStep(1);
    setHouseholdName('');
    setCounty('');
    setSubCounty('');
    setVillage('');
    setHeadIdx(0);
    setMembers([newMember(), newMember()]);
  };

  const close = () => {
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  const validStep1 = householdName.trim().length > 0 && county.length > 0;
  const validStep2 =
    members.length >= 2 &&
    members.every((m) => m.first_name.trim() && m.last_name.trim());

  const handleSave = async () => {
    if (!orgId) return;
    setSaving(true);
    try {
      // Insert beneficiaries
      const inserted: { id: string; idx: number }[] = [];
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const display_name = [m.first_name, m.last_name].filter(Boolean).join(' ').trim();
        const age = calculateAge(m.date_of_birth);
        const beneficiary_type = age !== null && age < 18 ? 'student' : 'adult';
        const { data, error } = await supabase
          .from('beneficiaries')
          .insert({
            organization_id: orgId,
            beneficiary_category: 'individual',
            beneficiary_type,
            display_name,
            first_name: m.first_name,
            last_name: m.last_name,
            date_of_birth: m.date_of_birth || null,
            gender: m.gender || null,
            county,
            sub_county: subCounty || null,
            estate_village: village || null,
            consent_given: true,
            consent_date: new Date().toISOString().slice(0, 10),
            registration_source: 'admin',
            status: 'active',
            is_active: true,
          } as any)
          .select('id')
          .single();
        if (error) throw error;
        inserted.push({ id: (data as any).id, idx: i });
      }

      const headBeneficiaryId = inserted[headIdx].id;

      // Create household and assign all members
      const householdId = await createHousehold.mutateAsync({
        household_name: householdName.trim(),
        county,
        sub_county: subCounty || null,
        head_of_household_id: headBeneficiaryId,
        member_ids: inserted.map((x) => x.id),
      });

      // Insert relationships from each non-head member to head
      for (const item of inserted) {
        if (item.idx === headIdx) continue;
        const member = members[item.idx];
        const rel = RELATION_OPTIONS.find((r) => r.value === member.relationship_to_head) || RELATION_OPTIONS[6];
        try {
          await addRel.mutateAsync({
            beneficiaryAId: headBeneficiaryId,
            beneficiaryBId: item.id,
            relationshipType: rel.type === 'child_parent' ? 'parent_child' : rel.type === 'parent_child' ? 'child_parent' : rel.type,
            householdId,
          });
        } catch {
          /* ignore individual rel failures */
        }
      }

      toast({
        title: 'Family registered',
        description: `${members.length} members added to ${householdName.trim()}.`,
      });
      onSuccess?.(householdId);
      close();
      navigate(`/households/${householdId}`);
    } catch (e: any) {
      toast({ title: 'Could not register family', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Register a family</SheetTitle>
          <SheetDescription>Create a household and add 2 or more members in one flow.</SheetDescription>
        </SheetHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <span className={step >= 1 ? 'text-foreground font-medium' : ''}>1. Household</span>
          <span>·</span>
          <span className={step >= 2 ? 'text-foreground font-medium' : ''}>2. Members</span>
          <span>·</span>
          <span className={step >= 3 ? 'text-foreground font-medium' : ''}>3. Review</span>
        </div>

        <div className="mt-5 space-y-4">
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <Label>Household name *</Label>
                <Input
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="e.g. Odhiambo Family"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>County *</Label>
                  <Select value={county} onValueChange={(v) => { setCounty(v); setSubCounty(''); }}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(KENYA_COUNTIES).map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sub-county</Label>
                  {subCounties.length ? (
                    <Select value={subCounty} onValueChange={setSubCounty}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {subCounties.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={subCounty} onChange={(e) => setSubCounty(e.target.value)} className="mt-1" />
                  )}
                </div>
              </div>
              <div>
                <Label>Village / estate</Label>
                <Input value={village} onChange={(e) => setVillage(e.target.value)} className="mt-1" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={close}>Cancel</Button>
                <Button onClick={() => setStep(2)} disabled={!validStep1}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Family members ({members.length})</div>
                <Button size="sm" variant="outline" onClick={() => setMembers((p) => [...p, newMember()])}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add member
                </Button>
              </div>

              {members.map((m, idx) => {
                const isHead = idx === headIdx;
                return (
                  <Card key={m.tempId} className="p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setHeadIdx(idx)}
                          className={`text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                            isHead ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Crown className="h-3 w-3" />
                          {isHead ? 'Head of household' : 'Make head'}
                        </button>
                        <span className="text-xs text-muted-foreground">Member {idx + 1}</span>
                      </div>
                      {members.length > 2 && (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeMember(idx)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">First name *</Label>
                        <Input value={m.first_name} onChange={(e) => updateMember(idx, { first_name: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Last name *</Label>
                        <Input value={m.last_name} onChange={(e) => updateMember(idx, { last_name: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Date of birth</Label>
                        <Input type="date" value={m.date_of_birth} onChange={(e) => updateMember(idx, { date_of_birth: e.target.value })} className="mt-1" />
                        {m.date_of_birth && (
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {calculateAge(m.date_of_birth)} years old
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Gender</Label>
                        <Select value={m.gender} onValueChange={(v) => updateMember(idx, { gender: v })}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Non-binary">Non-binary</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {!isHead && (
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Relationship to head of household</Label>
                          <Select value={m.relationship_to_head} onValueChange={(v) => updateMember(idx, { relationship_to_head: v })}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {RELATION_OPTIONS.map((r) => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!validStep2}>
                  Review <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <Card className="p-4 space-y-2">
                <div className="text-sm font-semibold">{householdName}</div>
                <div className="text-xs text-muted-foreground">
                  {[county, subCounty, village].filter(Boolean).join(' · ')}
                </div>
                <div className="border-t pt-2 mt-2 space-y-1.5">
                  {members.map((m, i) => {
                    const age = calculateAge(m.date_of_birth);
                    const rel = i === headIdx ? 'Head of household' : (RELATION_OPTIONS.find((r) => r.value === m.relationship_to_head)?.label || 'Member');
                    return (
                      <div key={m.tempId} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{[m.first_name, m.last_name].filter(Boolean).join(' ')}</span>
                        <span className="text-xs text-muted-foreground">
                          {age !== null ? `${age}y · ` : ''}{rel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Confirm and register
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}