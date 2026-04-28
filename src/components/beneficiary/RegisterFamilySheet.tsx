import { useState, useMemo, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { KENYA_COUNTIES } from '@/lib/kenyaCounties';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useCreateHousehold, useAddRelationship } from '@/hooks/useBeneficiaryRelationships';
import { calculateAge } from '@/lib/ageUtils';
import { toast } from '@/hooks/use-toast';
import {
  Loader2,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Search,
  UserPlus,
  X,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { RelationshipType } from '@/lib/householdUtils';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface RegisterFamilySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (householdId: string) => void;
}

type FamilyRole =
  | 'parent_head'
  | 'child'
  | 'spouse'
  | 'sibling'
  | 'grandparent'
  | 'grandchild'
  | 'guardian'
  | 'other';

const ROLE_OPTIONS: { value: FamilyRole; label: string }[] = [
  { value: 'parent_head', label: 'Parent / Head' },
  { value: 'child', label: 'Child' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'other', label: 'Other' },
];

interface BaseMember {
  tempId: string;
  role: FamilyRole;
  isHead: boolean;
}

interface ExistingMember extends BaseMember {
  type: 'existing';
  beneficiaryId: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  county: string | null;
  sub_county: string | null;
  household_id: string | null;
  unique_id: string | null;
  photo_url: string | null;
}

interface NewMember extends BaseMember {
  type: 'new';
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  county: string;
}

type PendingMember = ExistingMember | NewMember;

const initials = (name?: string | null, fallback?: string | null) => {
  const source = name || fallback || '';
  return source
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
};

const memberDisplayName = (m: PendingMember) =>
  m.type === 'existing'
    ? m.display_name
    : [m.first_name, m.last_name].filter(Boolean).join(' ').trim() || 'New member';

const memberDob = (m: PendingMember) => (m.type === 'existing' ? m.date_of_birth : m.date_of_birth);
const memberCounty = (m: PendingMember) => (m.type === 'existing' ? m.county : m.county);

// Map a (memberA.role, memberB.role) pair to the relationship type FROM A TO B.
function deriveRelationship(a: FamilyRole, b: FamilyRole): RelationshipType {
  // Parent-child links
  if (a === 'parent_head' && b === 'child') return 'parent_child';
  if (a === 'child' && b === 'parent_head') return 'child_parent';
  if (a === 'guardian' && b === 'child') return 'guardian_ward';
  if (a === 'child' && b === 'guardian') return 'ward_guardian';
  // Spouse
  if (a === 'spouse' && b === 'parent_head') return 'spouse';
  if (a === 'parent_head' && b === 'spouse') return 'spouse';
  if (a === 'spouse' && b === 'spouse') return 'spouse';
  // Siblings
  if (a === 'child' && b === 'child') return 'sibling';
  if (a === 'sibling' && b === 'sibling') return 'sibling';
  if (a === 'sibling' && b === 'child') return 'sibling';
  if (a === 'child' && b === 'sibling') return 'sibling';
  // Grandparent / grandchild
  if (a === 'grandparent' && (b === 'child' || b === 'grandchild')) return 'grandparent_grandchild';
  if ((a === 'child' || a === 'grandchild') && b === 'grandparent') return 'grandchild_grandparent';
  if (a === 'grandparent' && b === 'parent_head') return 'parent_child';
  if (a === 'parent_head' && b === 'grandparent') return 'child_parent';
  // Default
  return 'other_family';
}

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
  const [members, setMembers] = useState<PendingMember[]>([]);
  const [saving, setSaving] = useState(false);
  const [notifyManager, setNotifyManager] = useState(false);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  // Add-member UI state
  const [addMode, setAddMode] = useState<'choose' | 'search' | 'new'>('choose');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Inline new member draft
  const [draft, setDraft] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    county: '',
    role: '' as FamilyRole | '',
  });

  const subCounties = county ? KENYA_COUNTIES[county] || [] : [];

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    if (!orgId || addMode !== 'search') return;
    if (debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    (async () => {
      try {
        const data = await searchBeneficiaries(debouncedSearch, orgId, [], 10);
        if (cancelled) return;
        setSearchResults(data);
      } catch (error) {
        if (cancelled) return;
        logger.error('Search failed', error);
        setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, orgId, addMode]);

  const headIdx = useMemo(() => members.findIndex((m) => m.isHead), [members]);
  const head = headIdx >= 0 ? members[headIdx] : null;

  const hasAdult = useMemo(
    () => members.some((m) => {
      const age = calculateAge(memberDob(m));
      return age === null ? false : age >= 18;
    }),
    [members],
  );

  // When a non-existing-in-list person is selected, suggest a default role
  const suggestRole = (dob: string | null | undefined): FamilyRole => {
    const age = calculateAge(dob || null);
    if (age !== null && age < 18) return 'child';
    if (!head) return 'parent_head';
    return 'spouse';
  };

  const reset = () => {
    setStep(1);
    setHouseholdName('');
    setCounty('');
    setSubCounty('');
    setVillage('');
    setMembers([]);
    setNotifyManager(false);
    setAddMode('choose');
    setSearchTerm('');
    setDebouncedSearch('');
    setSearchResults([]);
    setDraft({ first_name: '', last_name: '', date_of_birth: '', gender: '', county: '', role: '' });
  };

  const close = (force = false) => {
    if (!force && members.length > 0) {
      setConfirmDiscardOpen(true);
      return;
    }
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  const handleSheetOpenChange = (v: boolean) => {
    if (v) {
      onOpenChange(v);
    } else {
      close();
    }
  };

  const ensureHead = (next: PendingMember[]): PendingMember[] => {
    if (next.length === 0) return next;
    if (next.some((m) => m.isHead)) return next;
    // Auto-pick first adult, else first member
    const firstAdultIdx = next.findIndex((m) => {
      const age = calculateAge(memberDob(m));
      return age !== null && age >= 18;
    });
    const idx = firstAdultIdx >= 0 ? firstAdultIdx : 0;
    return next.map((m, i) => ({ ...m, isHead: i === idx }));
  };

  const addExisting = (b: any, role: FamilyRole) => {
    const newMember: ExistingMember = {
      type: 'existing',
      tempId: `existing-${b.id}`,
      role,
      isHead: false,
      beneficiaryId: b.id,
      display_name: b.display_name || [b.first_name, b.last_name].filter(Boolean).join(' '),
      first_name: b.first_name,
      last_name: b.last_name,
      date_of_birth: b.date_of_birth,
      gender: b.gender,
      county: b.county,
      sub_county: b.sub_county,
      household_id: b.household_id,
      unique_id: b.unique_id,
      photo_url: b.photo_url,
    };
    setMembers((prev) => ensureHead([...prev, newMember]));
    setAddMode('choose');
    setSearchTerm('');
    setSearchResults([]);
  };

  const addNew = () => {
    if (!draft.first_name.trim() || !draft.date_of_birth || !draft.gender || !draft.role) return;
    const newMember: NewMember = {
      type: 'new',
      tempId: `new-${Math.random().toString(36).slice(2)}`,
      role: draft.role as FamilyRole,
      isHead: false,
      first_name: draft.first_name.trim(),
      last_name: draft.last_name.trim(),
      date_of_birth: draft.date_of_birth,
      gender: draft.gender,
      county: draft.county || county,
    };
    setMembers((prev) => ensureHead([...prev, newMember]));
    setDraft({ first_name: '', last_name: '', date_of_birth: '', gender: '', county: '', role: '' });
    setAddMode('choose');
  };

  const removeMember = (tempId: string) => {
    setMembers((prev) => ensureHead(prev.filter((m) => m.tempId !== tempId)));
  };

  const setRole = (tempId: string, role: FamilyRole) => {
    setMembers((prev) => prev.map((m) => (m.tempId === tempId ? { ...m, role } : m)));
  };

  const setHead = (tempId: string) => {
    const target = members.find((m) => m.tempId === tempId);
    if (!target) return;
    const age = calculateAge(memberDob(target));
    if (age !== null && age < 18) {
      toast({ title: 'Cannot set head', description: 'Children cannot be head of household.', variant: 'destructive' });
      return;
    }
    setMembers((prev) => prev.map((m) => ({ ...m, isHead: m.tempId === tempId })));
  };

  // Validation
  const validStep1 = householdName.trim().length > 0 && county.length > 0;
  const allExistingSameHousehold = useMemo(() => {
    if (members.length < 2) return false;
    if (!members.every((m) => m.type === 'existing')) return false;
    const ids = new Set(members.map((m) => (m as ExistingMember).household_id).filter(Boolean));
    if (ids.size !== 1) return false;
    return members.every((m) => (m as ExistingMember).household_id);
  }, [members]);
  const validStep2 = members.length >= 2 && !allExistingSameHousehold;

  const handleSave = async () => {
    if (!orgId || !validStep2) return;
    setSaving(true);
    try {
      // 1) Insert any new beneficiaries
      const memberToBeneficiaryId = new Map<string, string>();
      const failures: string[] = [];

      for (const m of members) {
        if (m.type === 'existing') {
          memberToBeneficiaryId.set(m.tempId, m.beneficiaryId);
          continue;
        }
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
            county: m.county || county,
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
        if (error || !data) {
          logger.error('Insert beneficiary failed', error);
          failures.push(display_name);
          continue;
        }
        memberToBeneficiaryId.set(m.tempId, (data as any).id);
      }

      const memberIds = Array.from(memberToBeneficiaryId.values());
      if (memberIds.length < 2) {
        throw new Error('Could not create enough members to form a household.');
      }

      // 2) Create household
      const headTempId = members.find((m) => m.isHead)?.tempId;
      const headBeneficiaryId = headTempId ? memberToBeneficiaryId.get(headTempId) : null;

      const householdId = await createHousehold.mutateAsync({
        household_name: householdName.trim(),
        county,
        sub_county: subCounty || null,
        head_of_household_id: headBeneficiaryId || null,
        member_ids: memberIds,
      });

      // 3) Insert pairwise relationships (skip duplicates by sorting pair)
      const seen = new Set<string>();
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const a = members[i];
          const b = members[j];
          const aId = memberToBeneficiaryId.get(a.tempId);
          const bId = memberToBeneficiaryId.get(b.tempId);
          if (!aId || !bId) continue;
          const key = [aId, bId].sort().join('|');
          if (seen.has(key)) continue;
          seen.add(key);
          const relType = deriveRelationship(a.role, b.role);
          try {
            await addRel.mutateAsync({
              beneficiaryAId: aId,
              beneficiaryBId: bId,
              relationshipType: relType,
              householdId,
            });
          } catch (e) {
            logger.error('Relationship insert failed', e);
            failures.push(`${memberDisplayName(a)} ↔ ${memberDisplayName(b)}`);
          }
        }
      }

      if (failures.length) {
        toast({
          title: 'Family created with some issues',
          description: `Could not link: ${failures.slice(0, 3).join(', ')}${failures.length > 3 ? '…' : ''}. Use the Relationships tab to fix.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Family registered',
          description: `${members.length} members in ${householdName.trim()}.`,
        });
      }

      onSuccess?.(householdId);
      onOpenChange(false);
      setTimeout(reset, 300);
      navigate(`/households/${householdId}`);
    } catch (e: any) {
      toast({ title: 'Could not register family', description: e?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const existingCount = members.filter((m) => m.type === 'existing').length;
  const newCount = members.filter((m) => m.type === 'new').length;
  const alreadyAddedIds = new Set(
    members.filter((m): m is ExistingMember => m.type === 'existing').map((m) => m.beneficiaryId),
  );

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Register a family</SheetTitle>
            <SheetDescription>Create a household and link existing or new members in one flow.</SheetDescription>
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
                  <Button variant="outline" onClick={() => close()}>Cancel</Button>
                  <Button onClick={() => setStep(2)} disabled={!validStep1}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {/* Members list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">Family members ({members.length})</div>
                    {members.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {existingCount > 0 && `${existingCount} existing`}{existingCount > 0 && newCount > 0 ? ' · ' : ''}{newCount > 0 && `${newCount} new`}
                      </div>
                    )}
                  </div>

                  {members.length === 0 && (
                    <Card className="p-6 text-center text-sm text-muted-foreground">
                      No members yet. Use the options below to add people to this household.
                    </Card>
                  )}

                  <div className="space-y-2">
                    {members.map((m) => {
                      const name = memberDisplayName(m);
                      const age = calculateAge(memberDob(m));
                      const isMinor = age !== null && age < 18;
                      const isExisting = m.type === 'existing';
                      const inOtherHh = isExisting && (m as ExistingMember).household_id;
                      return (
                        <Card key={m.tempId} className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-semibold shrink-0">
                              {isExisting && (m as ExistingMember).photo_url ? (
                                <img
                                  src={(m as ExistingMember).photo_url!}
                                  alt={name}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                initials(name)
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium truncate">{name}</span>
                                {age !== null && (
                                  <span className="text-xs text-muted-foreground">{age} yrs</span>
                                )}
                                {m.isHead && (
                                  <Badge variant="default" className="gap-1">
                                    <Crown className="h-3 w-3" /> Head
                                  </Badge>
                                )}
                                {isExisting ? (
                                  <Badge variant="info" className="text-[10px]">
                                    Existing{(m as ExistingMember).unique_id ? ` · ${(m as ExistingMember).unique_id}` : ''}
                                  </Badge>
                                ) : (
                                  <Badge variant="success" className="text-[10px]">New</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {memberCounty(m) || county}
                              </div>
                              {inOtherHh && (
                                <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" /> Currently in another household
                                </div>
                              )}
                              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] text-muted-foreground mr-1">Role:</span>
                                {ROLE_OPTIONS.map((r) => (
                                  <button
                                    key={r.value}
                                    type="button"
                                    onClick={() => setRole(m.tempId, r.value)}
                                    className={cn(
                                      'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                                      m.role === r.value
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40',
                                    )}
                                  >
                                    {r.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => removeMember(m.tempId)}
                                title="Remove"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                              <button
                                type="button"
                                disabled={isMinor}
                                onClick={() => setHead(m.tempId)}
                                title={isMinor ? 'Children cannot be head of household' : (m.isHead ? 'Head' : 'Make head')}
                                className={cn(
                                  'p-1 rounded transition-colors',
                                  m.isHead ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                                  isMinor && 'opacity-30 cursor-not-allowed',
                                )}
                              >
                                <Crown className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {allExistingSameHousehold && (
                  <Card className="p-3 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                    <div className="text-xs text-amber-800 dark:text-amber-300 flex gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      All selected members are already in the same household. No changes are needed.
                    </div>
                  </Card>
                )}

                {/* Add member section */}
                <Card className="p-3 border-dashed">
                  {addMode === 'choose' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAddMode('search')}
                        className="text-left rounded-lg border p-3 hover:border-primary/50 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Search className="h-4 w-4 text-primary" /> Search existing
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Find someone already registered in the system
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft((d) => ({ ...d, role: suggestRole(null) }));
                          setAddMode('new');
                        }}
                        className="text-left rounded-lg border p-3 hover:border-primary/50 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <UserPlus className="h-4 w-4 text-primary" /> Register new
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          This person is not yet in the system
                        </div>
                      </button>
                    </div>
                  )}

                  {addMode === 'search' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Search existing beneficiaries</Label>
                        <Button size="sm" variant="ghost" onClick={() => { setAddMode('choose'); setSearchTerm(''); }}>
                          <X className="h-3.5 w-3.5 mr-1" /> Cancel
                        </Button>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          autoFocus
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder={members.length ? 'Search for another family member…' : 'Type name, ID, or phone to search…'}
                          className="pl-9"
                        />
                      </div>
                      {debouncedSearch.length > 0 && debouncedSearch.length < 2 && (
                        <p className="text-xs text-muted-foreground">Type at least 2 characters to search</p>
                      )}
                      {searching && (
                        <div className="text-xs text-muted-foreground flex items-center">
                          <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> Searching…
                        </div>
                      )}
                      {!searching && debouncedSearch.length >= 2 && searchResults.length === 0 && (
                        <div className="text-sm space-y-1 py-2">
                          <div className="text-muted-foreground">
                            No beneficiary found matching "{debouncedSearch}"
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const parts = debouncedSearch.split(' ');
                              setDraft({
                                first_name: parts[0] || '',
                                last_name: parts.slice(1).join(' '),
                                date_of_birth: '',
                                gender: '',
                                county: '',
                                role: suggestRole(null),
                              });
                              setAddMode('new');
                            }}
                            className="text-primary text-xs hover:underline"
                          >
                            Want to register them as a new person? →
                          </button>
                        </div>
                      )}
                      <div className="space-y-1.5">
                        {searchResults.map((b) => {
                          const age = calculateAge(b.date_of_birth);
                          const alreadyAdded = alreadyAddedIds.has(b.id);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              disabled={alreadyAdded}
                              onClick={() => addExisting(b, suggestRole(b.date_of_birth))}
                              className={cn(
                                'w-full text-left p-2.5 rounded-lg border flex items-center gap-3 transition-colors',
                                alreadyAdded
                                  ? 'opacity-60 cursor-not-allowed bg-muted/30'
                                  : 'hover:border-primary/50 hover:bg-secondary/30',
                              )}
                            >
                              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-xs font-semibold shrink-0">
                                {b.photo_url ? (
                                  <img src={b.photo_url} alt={b.display_name} className="h-9 w-9 rounded-full object-cover" />
                                ) : (
                                  initials(b.display_name, `${b.first_name || ''} ${b.last_name || ''}`)
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{b.display_name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {b.unique_id ? `${b.unique_id}` : 'No ID'}
                                  {age !== null ? ` · ${age}y` : ''}
                                  {b.county ? ` · ${b.county}` : ''}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {b.household_id && !alreadyAdded && (
                                    <Badge variant="warning" className="text-[10px]">Already in a household</Badge>
                                  )}
                                  {alreadyAdded && (
                                    <Badge variant="secondary" className="text-[10px]">Already added</Badge>
                                  )}
                                </div>
                              </div>
                              {!alreadyAdded && (
                                <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {addMode === 'new' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Register a new beneficiary</Label>
                        <Button size="sm" variant="ghost" onClick={() => setAddMode('choose')}>
                          <X className="h-3.5 w-3.5 mr-1" /> Cancel
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <Label className="text-xs">First name *</Label>
                          <Input value={draft.first_name} onChange={(e) => setDraft((d) => ({ ...d, first_name: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Last name</Label>
                          <Input value={draft.last_name} onChange={(e) => setDraft((d) => ({ ...d, last_name: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                          <Label className="text-xs">Date of birth *</Label>
                          <Input
                            type="date"
                            value={draft.date_of_birth}
                            onChange={(e) => {
                              const dob = e.target.value;
                              setDraft((d) => ({ ...d, date_of_birth: dob, role: d.role || suggestRole(dob) }));
                            }}
                            className="mt-1"
                          />
                          {draft.date_of_birth && (
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {calculateAge(draft.date_of_birth)} years old
                            </p>
                          )}
                        </div>
                        <div>
                          <Label className="text-xs">Gender *</Label>
                          <Select value={draft.gender} onValueChange={(v) => setDraft((d) => ({ ...d, gender: v }))}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Non-binary">Non-binary</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">County</Label>
                          <Select value={draft.county} onValueChange={(v) => setDraft((d) => ({ ...d, county: v }))}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder={county || 'Select'} /></SelectTrigger>
                            <SelectContent>
                              {Object.keys(KENYA_COUNTIES).map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Role in family *</Label>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {ROLE_OPTIONS.map((r) => (
                              <button
                                key={r.value}
                                type="button"
                                onClick={() => setDraft((d) => ({ ...d, role: r.value }))}
                                className={cn(
                                  'text-xs px-2.5 py-1 rounded-full border transition-colors',
                                  draft.role === r.value
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40',
                                )}
                              >
                                {r.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={addNew}
                          disabled={!draft.first_name.trim() || !draft.date_of_birth || !draft.gender || !draft.role}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Add to family
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>

                {members.length === 1 && (
                  <p className="text-xs text-muted-foreground text-center">
                    A household needs at least 2 members. Add another family member.
                  </p>
                )}

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
                <Card className="p-4 space-y-3">
                  <div>
                    <div className="text-sm font-semibold">{householdName}</div>
                    <div className="text-xs text-muted-foreground">
                      {[county, subCounty, village].filter(Boolean).join(' · ')}
                    </div>
                  </div>

                  {existingCount > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1.5">
                        Existing beneficiaries being linked ({existingCount}):
                      </div>
                      <div className="space-y-1">
                        {members.filter((m): m is ExistingMember => m.type === 'existing').map((m) => (
                          <div key={m.tempId} className="text-sm flex items-center justify-between">
                            <span>{m.display_name}{m.unique_id ? ` · ${m.unique_id}` : ''}</span>
                            <span className="text-xs text-muted-foreground">
                              {m.isHead ? 'Head' : ROLE_OPTIONS.find((r) => r.value === m.role)?.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {newCount > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1.5">
                        New beneficiaries being registered ({newCount}):
                      </div>
                      <div className="space-y-1">
                        {members.filter((m): m is NewMember => m.type === 'new').map((m) => {
                          const age = calculateAge(m.date_of_birth);
                          return (
                            <div key={m.tempId} className="text-sm flex items-center justify-between">
                              <span>{[m.first_name, m.last_name].filter(Boolean).join(' ')}{age !== null ? ` · ${age}y` : ''}</span>
                              <span className="text-xs text-muted-foreground">
                                {m.isHead ? 'Head' : ROLE_OPTIONS.find((r) => r.value === m.role)?.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Card>

                <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 leading-relaxed">
                  This will create 1 household
                  {newCount > 0 && ` and register ${newCount} new beneficiar${newCount === 1 ? 'y' : 'ies'}`}.
                  {existingCount > 0 && ` ${existingCount} existing beneficiar${existingCount === 1 ? 'y' : 'ies'} will be linked to this household. Their existing data will not be changed.`}
                </div>

                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox checked={notifyManager} onCheckedChange={(v) => setNotifyManager(!!v)} />
                  Send a notification to the programme manager about this new household
                </label>

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

      <AlertDialog open={confirmDiscardOpen} onOpenChange={setConfirmDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard family registration?</AlertDialogTitle>
            <AlertDialogDescription>
              You have {members.length} family member{members.length === 1 ? '' : 's'} ready to register. If you close now, this data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscardOpen(false);
                onOpenChange(false);
                setTimeout(reset, 300);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
