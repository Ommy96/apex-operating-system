import { logger } from '@/lib/logger';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TagInput } from '@/components/ui/TagInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useOrgBeneficiaryConfig,
  type OrgBeneficiaryConfig,
} from '@/hooks/useOrgBeneficiaryConfig';
import { useBeneficiaryTerminology } from '@/hooks/useBeneficiaryTerminology';
import { KENYA_COUNTIES } from '@/lib/kenyaCounties';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toDateInputValue } from '@/lib/dateUtils';
import { useFieldVisibility } from '@/hooks/useFieldVisibility';
import { HouseholdSuggestionAlert } from './HouseholdSuggestionAlert';
import {
  GuardianFields,
  EMPTY_GUARDIAN,
  relationshipToGuardianType,
  type GuardianFieldsValue,
} from './GuardianFields';

export type BeneficiaryCategory = 'individual' | 'household' | 'group' | 'organisation';

export interface BeneficiaryFormProps {
  beneficiary?: any;
  defaultCategory?: BeneficiaryCategory;
  onSuccess?: (id: string) => void;
  onCancel?: () => void;
}

interface FormState {
  // Step 1 — core identity
  beneficiary_category: BeneficiaryCategory;
  display_name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  national_id: string;
  county: string;
  sub_county: string;
  estate_village: string;
  consent_given: boolean;
  consent_date: string;
  registration_source: string;

  // Step 2 — demographics (individual)
  religion: string;
  marital_status: string;
  disability_status: string;
  occupation: string;
  income_level: string;

  // Household
  household_size: string;
  household_children: string;
  household_adults: string;
  household_income_source: string;

  // Group
  group_name: string;
  group_type: string;
  member_count: string;
  group_registration_number: string;
  meeting_frequency: string;
  leader_name: string;
  leader_phone: string;

  // Step 3 — family
  family_status: string;
  guardians: GuardianFieldsValue[];
  removed_guardian_link_ids: string[];

  // Care arrangement
  care_arrangement:
    | ''
    | 'independent'
    | 'under_guardian_care'
    | 'head_of_household_with_dependents'
    | 'institutional_care';
  care_institution_name: string;
  care_institution_type: string;
  care_institution_contact_person: string;
  care_institution_contact_phone: string;
  care_institution_placement_date: string;
  care_case_worker_name: string;

  // Step 4 — education
  academic_level: string;
  institution_name: string;
  grade: string;
  is_enrolled: string;
  out_of_school_reason: string;

  // Step 5 — health
  allergies: string[];
  chronic_conditions: string[];
  blood_group: string;
  nutritional_status: string;
  hiv_status: string;
  last_medical_check: string;

  // Step 6 — vulnerability
  primary_need: string;
  vulnerability_tags: string[];
  vulnerability_level: string;

  // Step 7
  notes: string;
  photo_url: string;
}

const EMPTY_STATE: FormState = {
  beneficiary_category: 'individual',
  display_name: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  date_of_birth: '',
  gender: '',
  phone: '',
  national_id: '',
  county: '',
  sub_county: '',
  estate_village: '',
  consent_given: false,
  consent_date: '',
  registration_source: 'admin',
  religion: '',
  marital_status: '',
  disability_status: '',
  occupation: '',
  income_level: '',
  household_size: '',
  household_children: '',
  household_adults: '',
  household_income_source: '',
  group_name: '',
  group_type: '',
  member_count: '',
  group_registration_number: '',
  meeting_frequency: '',
  leader_name: '',
  leader_phone: '',
  family_status: '',
  guardians: [],
  removed_guardian_link_ids: [],
  care_arrangement: '',
  care_institution_name: '',
  care_institution_type: '',
  care_institution_contact_person: '',
  care_institution_contact_phone: '',
  care_institution_placement_date: '',
  care_case_worker_name: '',
  academic_level: '',
  institution_name: '',
  grade: '',
  is_enrolled: 'yes',
  out_of_school_reason: '',
  allergies: [],
  chronic_conditions: [],
  blood_group: '',
  nutritional_status: '',
  hiv_status: '',
  last_medical_check: '',
  primary_need: '',
  vulnerability_tags: [],
  vulnerability_level: '',
  notes: '',
  photo_url: '',
};

const DEFAULT_VULN_TAGS = [
  'Orphan',
  'Child-headed household',
  'Person with disability',
  'Chronic illness',
  'Extreme poverty',
  'GBV survivor',
  'Refugee/IDP',
  'Elderly',
  'Teen mother',
  'Street connected',
  'Out of school',
];

const PRIMARY_NEED_BY_ORG: Record<string, string[]> = {
  health: ['HIV treatment', 'TB treatment', 'Maternal health', 'Mental health', 'Disability support', 'Other'],
  livelihood: ['Income generation', 'Skills training', 'Market access', 'Financial inclusion', 'Other'],
  disaster_response: ['Emergency food', 'Emergency shelter', 'WASH', 'Medical care', 'Documentation', 'Other'],
  default: ['Food security', 'Education', 'Healthcare', 'Shelter', 'Protection', 'Psychosocial support', 'Economic empowerment', 'Other'],
};

const STEP_LABELS = [
  'Identity',
  'Demographics',
  'Family',
  'Education',
  'Health',
  'Vulnerability',
  'Notes',
];
const parseTagArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === 'string') {
    return value.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

const createFormStateFromBeneficiary = (beneficiary: any, defaultCategory: BeneficiaryCategory): FormState => ({
  ...EMPTY_STATE,
  beneficiary_category: (beneficiary?.beneficiary_category as BeneficiaryCategory) || defaultCategory,
  display_name: beneficiary?.display_name ?? '',
  first_name: beneficiary?.first_name ?? '',
  middle_name: beneficiary?.middle_name ?? '',
  last_name: beneficiary?.last_name ?? '',
  date_of_birth: toDateInputValue(beneficiary?.date_of_birth),
  gender: beneficiary?.gender ?? '',
  phone: beneficiary?.phone ?? '',
  national_id: beneficiary?.national_id ?? '',
  county: beneficiary?.county ?? '',
  sub_county: beneficiary?.sub_county ?? '',
  estate_village: beneficiary?.estate_village ?? '',
  consent_given: !!beneficiary?.consent_given,
  consent_date: toDateInputValue(beneficiary?.consent_date),
  registration_source: beneficiary?.registration_source ?? 'admin',
  religion: beneficiary?.religion ?? '',
  marital_status: beneficiary?.marital_status ?? '',
  disability_status: beneficiary?.disability_status ?? '',
  occupation: beneficiary?.occupation ?? '',
  income_level: beneficiary?.income_level ?? '',
  household_size: beneficiary?.household_size?.toString() ?? '',
  household_income_source: beneficiary?.source_of_income ?? '',
  group_name: beneficiary?.group_name ?? '',
  member_count: beneficiary?.member_count?.toString() ?? '',
  leader_name: beneficiary?.leader_name ?? '',
  leader_phone: beneficiary?.leader_phone ?? '',
  meeting_frequency: beneficiary?.group_schedule ?? '',
  family_status: beneficiary?.family_status ?? '',
  care_arrangement: (beneficiary?.care_arrangement && beneficiary.care_arrangement !== 'unknown'
    ? beneficiary.care_arrangement
    : '') as FormState['care_arrangement'],
  care_institution_name: beneficiary?.institution_name ?? '',
  care_institution_type: beneficiary?.institution_type ?? '',
  care_institution_contact_person: beneficiary?.institution_contact_person ?? '',
  care_institution_contact_phone: beneficiary?.institution_contact_phone ?? '',
  care_institution_placement_date: toDateInputValue(beneficiary?.institution_placement_date),
  care_case_worker_name: beneficiary?.case_worker_name ?? '',
  academic_level: beneficiary?.academic_level ?? '',
  institution_name: beneficiary?.institution_name ?? '',
  grade: beneficiary?.grade ?? '',
  allergies: parseTagArray(beneficiary?.allergies),
  chronic_conditions: parseTagArray(beneficiary?.chronic_conditions ?? beneficiary?.other_medical_conditions),
  blood_group: beneficiary?.blood_group ?? '',
  nutritional_status: beneficiary?.nutritional_status ?? '',
  hiv_status: beneficiary?.hiv_status ?? '',
  last_medical_check: toDateInputValue(beneficiary?.last_medical_check),
  primary_need: beneficiary?.primary_need ?? '',
  vulnerability_tags: parseTagArray(beneficiary?.vulnerability_tags),
  vulnerability_level: beneficiary?.vulnerability_level ?? '',
  notes: beneficiary?.background_narrative ?? beneficiary?.notes ?? '',
  photo_url: beneficiary?.photo_url ?? '',
});

const compactPayload = (payload: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );


export function BeneficiaryForm({
  beneficiary,
  defaultCategory = 'individual',
  onSuccess,
  onCancel,
}: BeneficiaryFormProps) {
  const { currentOrganization } = useOrganization();
  const { config } = useOrgBeneficiaryConfig();
  const { term } = useBeneficiaryTerminology();
  const { can } = usePermissions();
  const orgId = currentOrganization?.organization_id;

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdUniqueId, setCreatedUniqueId] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    beneficiary
      ? createFormStateFromBeneficiary(beneficiary, defaultCategory)
      : { ...EMPTY_STATE, beneficiary_category: defaultCategory },
  );

  // Age-aware field visibility
  const visibility = useFieldVisibility(form.date_of_birth, config);

  // When the beneficiary becomes a minor (DOB makes them < 18),
  // clear any National ID that was captured earlier so a stale value
  // cannot be saved.
  useEffect(() => {
    if (visibility.isMinor && form.national_id) {
      setForm((prev) => ({ ...prev, national_id: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibility.isMinor]);

  // Care arrangement: suggest a default the first time the registrar lands on
  // Step 3 (or whenever DOB/family status changes and no choice has been made).
  const [careSuggestedFrom, setCareSuggestedFrom] = useState<string | null>(null);
  useEffect(() => {
    if (form.care_arrangement) return;
    let suggestion: FormState['care_arrangement'] = '';
    let reason: string | null = null;
    if (form.family_status === 'Independent adult') {
      suggestion = 'independent';
      reason = 'Suggested because family status is Independent adult.';
    } else if (form.family_status === 'Child-headed household') {
      suggestion = 'head_of_household_with_dependents';
      reason = 'Suggested because family status is Child-headed household.';
    } else if (visibility.age !== null && visibility.age < 18) {
      suggestion = 'under_guardian_care';
      reason = `Suggested because age is ${visibility.age}.`;
    } else if (visibility.age !== null && visibility.age >= 25) {
      suggestion = 'independent';
      reason = `Suggested because age is ${visibility.age}.`;
    }
    if (suggestion) {
      setForm((prev) => prev.care_arrangement ? prev : { ...prev, care_arrangement: suggestion });
      setCareSuggestedFrom(reason);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.family_status, form.date_of_birth]);

  // Load existing guardian links when editing an existing beneficiary,
  // so the user can update / remove parents instead of duplicating them.
  useEffect(() => {
    if (!beneficiary?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('beneficiary_guardians')
        .select(
          `id, relationship, is_primary,
           guardians ( id, full_name, guardian_type, national_id, phone, is_alive, employment_type, source_of_income )`,
        )
        .eq('beneficiary_id', beneficiary.id);
      if (error || cancelled || !data) return;
      const loaded: GuardianFieldsValue[] = data
        .filter((row: any) => row.guardians)
        .map((row: any) => {
          const g = row.guardians;
          // Prefer the link.relationship if present, else derive from type
          const rel =
            row.relationship ||
            (g.guardian_type === 'father'
              ? 'Father'
              : g.guardian_type === 'mother'
              ? 'Mother'
              : 'Other');
          return {
            id: g.id,
            linkId: row.id,
            guardian_type: g.guardian_type,
            relationship: rel,
            full_name: g.full_name ?? '',
            national_id: g.national_id ?? '',
            phone: g.phone ?? '',
            is_alive: g.is_alive !== false,
            employment_type: g.employment_type ?? '',
            source_of_income: g.source_of_income ?? '',
          };
        });
      if (loaded.length) {
        setForm((prev) => ({ ...prev, guardians: loaded }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [beneficiary?.id]);

  useEffect(() => {
    if (beneficiary) {
      setForm(createFormStateFromBeneficiary(beneficiary, defaultCategory));
    }
  }, [beneficiary?.id, beneficiary?.updated_at, defaultCategory]);

  const draftKey = `beneficiary-form-draft-${orgId ?? 'none'}-${beneficiary?.id ?? 'new'}`;

  // Load draft once
  useEffect(() => {
    if (beneficiary) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setForm((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initialForm = useMemo(() =>
    beneficiary
      ? createFormStateFromBeneficiary(beneficiary, defaultCategory)
      : { ...EMPTY_STATE, beneficiary_category: defaultCategory },
    [beneficiary, defaultCategory],
  );
  const hasChanges = JSON.stringify(form) !== JSON.stringify(initialForm);

  useEffect(() => {
    if (!hasChanges) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasChanges]);

  const requestCancel = () => {
    if (hasChanges) {
      setShowDiscardConfirm(true);
      return;
    }
    onCancel?.();
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const isIndividual = form.beneficiary_category === 'individual';
  const isHousehold = form.beneficiary_category === 'household';
  const isGroup = form.beneficiary_category === 'group';
  const isOrganisation = form.beneficiary_category === 'organisation';

  // Determine which steps are visible
  const visibleSteps = useMemo(() => {
    const steps: number[] = [0]; // Identity always
    steps.push(1); // Demographics — always (but body adapts per category)
    if (isIndividual && (config?.collect_household_data || true)) steps.push(2); // Family
    if (config?.collect_education_data && (isIndividual || isHousehold) && (visibility.showEducation && (visibility.ageUnknown || (visibility.age !== null && visibility.age >= 3)))) steps.push(3);
    if (config?.collect_health_data && (isIndividual || isHousehold) && visibility.showHealth) steps.push(4);
    steps.push(5); // Vulnerability — always
    steps.push(6); // Notes — always
    return steps;
  }, [config, isIndividual, isHousehold, visibility.showEducation, visibility.showHealth, visibility.age, visibility.ageUnknown]);

  const currentStepIndex = visibleSteps.indexOf(step);
  const totalSteps = visibleSteps.length;

  const goNext = () => {
    const nextIdx = currentStepIndex + 1;
    if (nextIdx < visibleSteps.length) setStep(visibleSteps[nextIdx]);
  };
  const goBack = () => {
    const prevIdx = currentStepIndex - 1;
    if (prevIdx >= 0) setStep(visibleSteps[prevIdx]);
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(form));
      toast({ title: 'Draft saved', description: 'You can resume later.' });
    } catch {
      toast({ title: 'Could not save draft', variant: 'destructive' });
    }
  };

  const validateStep1 = () => {
    if (!form.beneficiary_category) {
      toast({ title: 'Select a category', variant: 'destructive' });
      return false;
    }
    if (isGroup || isOrganisation) {
      if (!form.group_name.trim()) {
        toast({ title: 'Name is required', variant: 'destructive' });
        return false;
      }
    } else {
      if (!form.first_name.trim() || !form.last_name.trim()) {
        toast({ title: 'First and last name are required', variant: 'destructive' });
        return false;
      }
    }
    if (!form.county) {
      toast({ title: 'County is required', variant: 'destructive' });
      return false;
    }
    if (!form.consent_given) {
      toast({ title: 'Informed consent is required', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleNextOnStep1 = () => {
    if (!validateStep1()) return;
    if (form.consent_given && !form.consent_date) {
      update('consent_date', new Date().toISOString().slice(0, 10));
    }
    goNext();
  };

  const buildDisplayName = () => {
    if (isGroup || isOrganisation) return form.group_name.trim();
    return [form.first_name, form.middle_name, form.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
  };

  const submit = async () => {
    if (!orgId) {
      toast({ title: 'No organization', variant: 'destructive' });
      return;
    }
    if (!validateStep1()) {
      setStep(0);
      return;
    }
    const filledGuardians = form.guardians.filter((g) => g.full_name.trim());
    if (isIndividual && visibility.isMinor && filledGuardians.length === 0) {
      toast({
        title: 'Guardian required',
        description: 'Minors must have at least one parent or guardian on file.',
        variant: 'destructive',
      });
      const familyStep = visibleSteps.indexOf(2);
      if (familyStep >= 0) setStep(2);
      return;
    }

    setIsLoading(true);
    try {
      const display_name = buildDisplayName();

      // Map category → legacy beneficiary_type for backward compat
      const legacyType: 'student' | 'adult' | 'group' = isGroup
        ? 'group'
        : isIndividual && form.academic_level && form.academic_level !== 'none'
        ? 'student'
        : 'adult';

      const payload: any = compactPayload({
        organization_id: orgId,
        beneficiary_category: form.beneficiary_category,
        beneficiary_type: legacyType,
        display_name,
        first_name: isGroup || isOrganisation ? null : form.first_name || null,
        middle_name: isGroup || isOrganisation ? null : form.middle_name || null,
        last_name: isGroup || isOrganisation ? null : form.last_name || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        county: form.county || null,
        sub_county: form.sub_county || null,
        estate_village: form.estate_village || null,
        consent_given: form.consent_given,
        consent_date: form.consent_date || null,
        registration_source: form.registration_source || 'admin',
        religion: config.collect_religion ? form.religion || null : beneficiary?.id ? undefined : null,
        marital_status: form.marital_status || null,
        disability_status: config.collect_disability_details
          ? form.disability_status || null
          : beneficiary?.id ? undefined : null,
        occupation: config.collect_economic_data ? form.occupation || null : beneficiary?.id ? undefined : null,
        income_level: config.collect_economic_data ? form.income_level || null : beneficiary?.id ? undefined : null,
        household_size: form.household_size ? Number(form.household_size) : null,
        group_name: isGroup || isOrganisation ? form.group_name || null : null,
        member_count: form.member_count ? Number(form.member_count) : null,
        leader_name: isGroup ? form.leader_name || null : null,
        leader_phone: isGroup ? form.leader_phone || null : null,
        group_schedule: isGroup ? form.meeting_frequency || null : null,
        academic_level: config.collect_education_data
          ? (form.academic_level as any) || null
          : beneficiary?.id ? undefined : null,
        grade: config.collect_education_data ? form.grade || null : beneficiary?.id ? undefined : null,
        family_status: form.family_status || null,
        // Care arrangement
        care_arrangement: (form.care_arrangement || 'unknown') as any,
        ...(form.care_arrangement && (!beneficiary?.id || beneficiary.care_arrangement !== form.care_arrangement)
          ? {
              care_arrangement_set_by: (await supabase.auth.getUser()).data.user?.id ?? null,
              care_arrangement_set_at: new Date().toISOString(),
            }
          : {}),
        institution_name: form.care_arrangement === 'institutional_care'
          ? (form.care_institution_name || null)
          : (config.collect_education_data ? form.institution_name || null : beneficiary?.id ? undefined : null),
        institution_type: form.care_arrangement === 'institutional_care' ? (form.care_institution_type || null) : null,
        institution_contact_person: form.care_arrangement === 'institutional_care' ? (form.care_institution_contact_person || null) : null,
        institution_contact_phone: form.care_arrangement === 'institutional_care' ? (form.care_institution_contact_phone || null) : null,
        institution_placement_date: form.care_arrangement === 'institutional_care' ? (form.care_institution_placement_date || null) : null,
        case_worker_name: form.care_arrangement === 'institutional_care' ? (form.care_case_worker_name || null) : null,
        hiv_status:
          config.collect_health_data && config.collect_hiv_status && (can as any)?.viewHIVData !== false
            ? (form.hiv_status as any) || null
            : beneficiary?.id ? undefined : null,
        other_medical_conditions:
          config.collect_health_data
            ? [...form.allergies, ...form.chronic_conditions].filter(Boolean).join('; ') || null
            : beneficiary?.id ? undefined : null,
        primary_need: form.primary_need || null,
        vulnerability_tags: form.vulnerability_tags.length ? form.vulnerability_tags : null,
        vulnerability_level: form.vulnerability_level || null,
        background_narrative: form.notes || null,
        photo_url: form.photo_url || null,
        status: 'active',
        is_active: true,
      });

      let beneficiaryId = beneficiary?.id;
      let uniqueId = beneficiary?.unique_id;

      if (beneficiary?.id) {
        const { error } = await supabase
          .from('beneficiaries')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', beneficiary.id)
          .eq('organization_id', orgId);
        if (error) throw error;
      } else {
        // Generate unique_id via RPC
        try {
          const { data: idData } = await supabase.rpc(
            'generate_beneficiary_unique_id' as any,
            { _org_id: orgId },
          );
          if (idData && typeof idData === 'string') {
            payload.unique_id = idData;
            uniqueId = idData;
          }
        } catch (e) {
          logger.warn('Could not generate unique_id', e);
        }
        const { data, error } = await supabase
          .from('beneficiaries')
          .insert(payload)
          .select('id, unique_id')
          .single();
        if (error) throw error;
        beneficiaryId = data.id;
        uniqueId = data.unique_id;
      }

      // Save / upsert guardians & beneficiary_guardians links.
      if (isIndividual && beneficiaryId) {
        try {
          // 1. Remove links the user deleted while editing.
          if (form.removed_guardian_link_ids.length) {
            await supabase
              .from('beneficiary_guardians')
              .delete()
              .in('id', form.removed_guardian_link_ids);
          }

          // 2. Upsert each filled guardian.
          for (let idx = 0; idx < filledGuardians.length; idx++) {
            const g = filledGuardians[idx];
            const guardianType = relationshipToGuardianType(g.relationship);
            const guardianPayload: any = {
              organization_id: orgId,
              full_name: g.full_name.trim(),
              guardian_type: guardianType,
              national_id: g.national_id?.trim() || null,
              phone: g.phone?.trim() || null,
              is_alive: g.is_alive,
              employment_type: g.employment_type || null,
              source_of_income: g.source_of_income?.trim() || null,
            };

            let guardianId = g.id;
            if (guardianId) {
              const { error: upErr } = await supabase
                .from('guardians')
                .update(guardianPayload)
                .eq('id', guardianId);
              if (upErr) throw upErr;
            } else {
              const { data: inserted, error: insErr } = await supabase
                .from('guardians')
                .insert(guardianPayload)
                .select('id')
                .single();
              if (insErr) throw insErr;
              guardianId = inserted!.id;
            }

            // Link row
            if (g.linkId) {
              await supabase
                .from('beneficiary_guardians')
                .update({
                  relationship: g.relationship || null,
                  is_primary: idx === 0,
                } as any)
                .eq('id', g.linkId);
            } else {
              await supabase
                .from('beneficiary_guardians')
                .insert({
                  beneficiary_id: beneficiaryId,
                  guardian_id: guardianId,
                  relationship: g.relationship || null,
                  is_primary: idx === 0,
                } as any);
            }
          }
        } catch (e: any) {
          logger.error('Failed to save guardian', e);
          toast({
            title: 'Could not save guardian information',
            description: e?.message || 'Please try again.',
            variant: 'destructive',
          });
        }
      }

      localStorage.removeItem(draftKey);
      setCreatedId(beneficiaryId!);
      setCreatedUniqueId(uniqueId || null);
      toast({
        title: beneficiary ? `${term} updated` : `${term} registered`,
        description: uniqueId ? `ID: ${uniqueId}` : undefined,
      });

      if (onSuccess) onSuccess(beneficiaryId!);
    } catch (error: any) {
      logger.error('BeneficiaryForm submit error', error);
      toast({
        title: 'Save failed',
        description: error?.message || 'Could not save record',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Confirmation card
  if (createdId && !beneficiary) {
    return (
      <div className="py-8 text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{term} registered</h3>
          {createdUniqueId && (
            <p className="text-sm text-muted-foreground mt-1">
              Reference: <span className="font-mono">{createdUniqueId}</span>
            </p>
          )}
        </div>
        {isIndividual && (
          <div className="text-left">
            <HouseholdSuggestionAlert
              beneficiary={{
                id: createdId,
                display_name: buildDisplayName(),
                last_name: form.last_name || null,
                county: form.county || null,
                sub_county: form.sub_county || null,
                date_of_birth: form.date_of_birth || null,
                household_id: null,
              }}
            />
          </div>
        )}
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="outline" onClick={requestCancel}>
            Close
          </Button>
          <Button
            onClick={() => {
              setForm({ ...EMPTY_STATE, beneficiary_category: defaultCategory });
              setCreatedId(null);
              setCreatedUniqueId(null);
              setStep(0);
            }}
          >
            Register another
          </Button>
        </div>
      </div>
    );
  }

  const subCounties = form.county ? KENYA_COUNTIES[form.county] || [] : [];
  const orgPrimaryNeeds =
    PRIMARY_NEED_BY_ORG[config?.org_type as string] || PRIMARY_NEED_BY_ORG.default;
  const allVulnTags = [
    ...DEFAULT_VULN_TAGS,
    ...((config?.custom_vulnerability_tags as string[]) || []),
  ];

  return (
    <div className="space-y-5">
      {/* Age indicator pill */}
      {(isIndividual || isHousehold) && form.date_of_birth && visibility.age !== null && (
        <div className="flex items-center gap-2 px-1 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 font-medium">
            {visibility.age} years old · {visibility.ageGroup.replace('_', ' ')}
          </span>
          {visibility.isMinor && (
            <span className="text-muted-foreground">
              Minor — guardian information required
            </span>
          )}
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="text-xs text-muted-foreground">
          Step {currentStepIndex + 1} of {totalSteps}
          {' — '}
          <span className="font-medium text-foreground">{STEP_LABELS[step]}</span>
        </div>
        <div className="flex gap-1">
          {visibleSteps.map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1 w-6 rounded-full transition-colors',
                i <= currentStepIndex ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <Card className="p-4 sm:p-6 space-y-4">
        {step === 0 && (
          <Step1Identity
            form={form}
            update={update}
            subCounties={subCounties}
            term={term}
            showNationalId={visibility.showNationalId}
          />
        )}
        {step === 1 && (
          <Step2Demographics
            form={form}
            update={update}
            config={config}
          />
        )}
        {step === 2 && <Step3Family form={form} update={update} />}
        {step === 3 && <Step4Education form={form} update={update} ageLabels={visibility.educationLabels} />}
        {step === 4 && (
          <Step5Health form={form} update={update} config={config} can={can} />
        )}
        {step === 5 && (
          <Step6Vulnerability
            form={form}
            update={update}
            options={orgPrimaryNeeds}
            tags={allVulnTags}
          />
        )}
        {step === 6 && <Step7Notes form={form} update={update} />}
      </Card>

      <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>You have unsaved changes. Discard them?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay and save</AlertDialogCancel>
            <AlertDialogAction onClick={() => onCancel?.()}>Discard changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={requestCancel}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={saveDraft}>
            <Save className="h-4 w-4 mr-1" /> Save draft
          </Button>
        </div>
        <div className="flex gap-2 ml-auto">
          {currentStepIndex > 0 && (
            <Button variant="outline" onClick={goBack} disabled={isLoading}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          {currentStepIndex < visibleSteps.length - 1 ? (
            <Button
              onClick={step === 0 ? handleNextOnStep1 : goNext}
              disabled={isLoading}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {beneficiary ? `Update ${term.toLowerCase()}` : `Register ${term.toLowerCase()}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------- Step 1 -------- */
function Step1Identity({
  form,
  update,
  subCounties,
  term,
  showNationalId,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  subCounties: string[];
  term: string;
  showNationalId: boolean;
}) {
  const isPerson =
    form.beneficiary_category === 'individual' ||
    form.beneficiary_category === 'household';
  const isGroup = form.beneficiary_category === 'group';
  const isOrg = form.beneficiary_category === 'organisation';

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Core identity</h3>
        <p className="text-xs text-muted-foreground">
          Required information for every {term.toLowerCase()}.
        </p>
      </div>

      <div>
        <Label>{term} category *</Label>
        <Select
          value={form.beneficiary_category}
          onValueChange={(v) =>
            update('beneficiary_category', v as BeneficiaryCategory)
          }
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">Individual — a single person</SelectItem>
            <SelectItem value="household">Household — a family unit</SelectItem>
            <SelectItem value="group">Group — community/self-help group</SelectItem>
            <SelectItem value="organisation">Organisation — partner institution</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(isGroup || isOrg) && (
        <div>
          <Label>{isGroup ? 'Group' : 'Organisation'} name *</Label>
          <Input
            value={form.group_name}
            onChange={(e) => update('group_name', e.target.value)}
          />
        </div>
      )}

      {isPerson && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>First name *</Label>
            <Input
              value={form.first_name}
              onChange={(e) => update('first_name', e.target.value)}
            />
          </div>
          <div>
            <Label>Middle name</Label>
            <Input
              value={form.middle_name}
              onChange={(e) => update('middle_name', e.target.value)}
            />
          </div>
          <div>
            <Label>Last name *</Label>
            <Input
              value={form.last_name}
              onChange={(e) => update('last_name', e.target.value)}
            />
          </div>
        </div>
      )}

      {isPerson && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Date of birth</Label>
            <Input
              type="date"
              value={toDateInputValue(form.date_of_birth)}
              onChange={(e) => update('date_of_birth', e.target.value)}
            />
          </div>
          <div>
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={(v) => update('gender', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Non-binary">Non-binary</SelectItem>
                <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} />
        </div>
        {isPerson && showNationalId && (
          <div>
            <Label>National ID / Passport</Label>
            <Input
              value={form.national_id}
              onChange={(e) => update('national_id', e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>County *</Label>
          <Select value={form.county} onValueChange={(v) => { update('county', v); update('sub_county', ''); }}>
            <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
            <SelectContent>
              {Object.keys(KENYA_COUNTIES).map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Sub-county</Label>
          {subCounties.length > 0 ? (
            <Select value={form.sub_county} onValueChange={(v) => update('sub_county', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {subCounties.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={form.sub_county}
              onChange={(e) => update('sub_county', e.target.value)}
            />
          )}
        </div>
      </div>

      <div>
        <Label>Village / estate</Label>
        <Input
          value={form.estate_village}
          onChange={(e) => update('estate_village', e.target.value)}
        />
      </div>

      <div>
        <Label>Registration source</Label>
        <Select
          value={form.registration_source}
          onValueChange={(v) => update('registration_source', v)}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin entry</SelectItem>
            <SelectItem value="field_officer">Field officer</SelectItem>
            <SelectItem value="self_referral">Self-referral</SelectItem>
            <SelectItem value="partner_referral">Partner referral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox
            checked={form.consent_given}
            onCheckedChange={(v) => {
              update('consent_given', !!v);
              if (v && !form.consent_date) {
                update('consent_date', new Date().toISOString().slice(0, 10));
              }
            }}
            className="mt-0.5"
          />
          <span className="text-sm">
            This {term.toLowerCase()} has given <strong>informed consent</strong> for data collection.
          </span>
        </label>
        {form.consent_given && (
          <div className="pl-6">
            <Label className="text-xs">Consent date</Label>
            <Input
              type="date"
              value={toDateInputValue(form.consent_date)}
              onChange={(e) => update('consent_date', e.target.value)}
              className="max-w-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* -------- Step 2 -------- */
function Step2Demographics({
  form,
  update,
  config,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  config: OrgBeneficiaryConfig;
}) {
  const cat = form.beneficiary_category;
  const visibility = useFieldVisibility(form.date_of_birth, config);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Demographics</h3>
        <p className="text-xs text-muted-foreground">Background information.</p>
      </div>

      {cat === 'individual' && (
        <div className="space-y-3">
          {config.collect_religion && (
            <div>
              <Label>Religion</Label>
              <Select value={form.religion} onValueChange={(v) => update('religion', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Christian">Christian</SelectItem>
                  <SelectItem value="Muslim">Muslim</SelectItem>
                  <SelectItem value="Hindu">Hindu</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {visibility.showMaritalStatus && (
            <div>
              <Label>Marital status</Label>
              <Select value={form.marital_status} onValueChange={(v) => update('marital_status', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married">Married</SelectItem>
                  <SelectItem value="Widowed">Widowed</SelectItem>
                  <SelectItem value="Divorced">Divorced</SelectItem>
                  <SelectItem value="Separated">Separated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {config.collect_disability_details && (
            <div>
              <Label>Disability status</Label>
              <Select value={form.disability_status} onValueChange={(v) => update('disability_status', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Physical">Physical</SelectItem>
                  <SelectItem value="Visual">Visual</SelectItem>
                  <SelectItem value="Hearing">Hearing</SelectItem>
                  <SelectItem value="Cognitive">Cognitive</SelectItem>
                  <SelectItem value="Multiple">Multiple</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {config.collect_economic_data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Occupation</Label>
                <Input
                  value={form.occupation}
                  onChange={(e) => update('occupation', e.target.value)}
                />
              </div>
              <div>
                <Label>Income level</Label>
                <Select value={form.income_level} onValueChange={(v) => update('income_level', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="below_poverty">Below poverty line</SelectItem>
                    <SelectItem value="low">Low income</SelectItem>
                    <SelectItem value="medium">Medium income</SelectItem>
                    <SelectItem value="not_assessed">Not assessed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      {cat === 'household' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Total household members</Label>
            <Input
              type="number"
              value={form.household_size}
              onChange={(e) => update('household_size', e.target.value)}
            />
          </div>
          <div>
            <Label>Children under 18</Label>
            <Input
              type="number"
              value={form.household_children}
              onChange={(e) => update('household_children', e.target.value)}
            />
          </div>
          <div>
            <Label>Adults</Label>
            <Input
              type="number"
              value={form.household_adults}
              onChange={(e) => update('household_adults', e.target.value)}
            />
          </div>
          <div>
            <Label>Primary income source</Label>
            <Input
              value={form.household_income_source}
              onChange={(e) => update('household_income_source', e.target.value)}
            />
          </div>
        </div>
      )}

      {cat === 'group' && (
        <div className="space-y-3">
          <div>
            <Label>Group type</Label>
            <Select value={form.group_type} onValueChange={(v) => update('group_type', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Self-help group">Self-help group</SelectItem>
                <SelectItem value="Cooperative">Cooperative</SelectItem>
                <SelectItem value="Community group">Community group</SelectItem>
                <SelectItem value="Youth group">Youth group</SelectItem>
                <SelectItem value="Women's group">Women's group</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Number of members</Label>
              <Input
                type="number"
                value={form.member_count}
                onChange={(e) => update('member_count', e.target.value)}
              />
            </div>
            <div>
              <Label>Group registration #</Label>
              <Input
                value={form.group_registration_number}
                onChange={(e) => update('group_registration_number', e.target.value)}
              />
            </div>
            <div>
              <Label>Leader name</Label>
              <Input
                value={form.leader_name}
                onChange={(e) => update('leader_name', e.target.value)}
              />
            </div>
            <div>
              <Label>Leader phone</Label>
              <Input
                value={form.leader_phone}
                onChange={(e) => update('leader_phone', e.target.value)}
              />
            </div>
            <div>
              <Label>Meeting frequency</Label>
              <Select value={form.meeting_frequency} onValueChange={(v) => update('meeting_frequency', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {cat === 'organisation' && (
        <p className="text-sm text-muted-foreground">
          No additional demographics required for organisations. Continue to the next step.
        </p>
      )}
    </div>
  );
}

/* -------- Step 3 -------- */
function Step3Family({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  const status = form.family_status;
  const guardians = form.guardians;

  const setGuardianAt = (index: number, next: GuardianFieldsValue) => {
    const copy = [...guardians];
    copy[index] = next;
    update('guardians', copy);
  };

  const removeGuardianAt = (index: number) => {
    const removed = guardians[index];
    const copy = guardians.filter((_, i) => i !== index);
    update('guardians', copy);
    if (removed?.linkId) {
      update('removed_guardian_link_ids', [
        ...form.removed_guardian_link_ids,
        removed.linkId,
      ]);
    }
  };

  // Find or seed a guardian record for a locked role (father / mother).
  const ensureRole = (role: 'Father' | 'Mother'): GuardianFieldsValue => {
    const found = guardians.find(
      (g) => g.relationship.toLowerCase() === role.toLowerCase(),
    );
    return (
      found || {
        ...EMPTY_GUARDIAN,
        relationship: role,
        guardian_type: role === 'Father' ? 'father' : 'mother',
      }
    );
  };

  const upsertRole = (role: 'Father' | 'Mother', next: GuardianFieldsValue) => {
    const idx = guardians.findIndex(
      (g) => g.relationship.toLowerCase() === role.toLowerCase(),
    );
    if (idx >= 0) {
      setGuardianAt(idx, { ...next, relationship: role });
    } else {
      update('guardians', [...guardians, { ...next, relationship: role }]);
    }
  };

  const isBothParents = status === 'Both parents present';
  const isSingleish = status === 'Single parent' || status === 'Single orphan';
  const isOrphan = status === 'Double orphan' || status === 'Child-headed household';
  const isIndependent = status === 'Independent adult';

  // Primary guardian (single slot) — first non-empty record.
  const primaryIndex = guardians.findIndex((g) => g.full_name || g.relationship);
  const primaryGuardian = primaryIndex >= 0 ? guardians[primaryIndex] : { ...EMPTY_GUARDIAN };
  const setPrimaryGuardian = (next: GuardianFieldsValue) => {
    if (primaryIndex >= 0) {
      setGuardianAt(primaryIndex, next);
    } else {
      update('guardians', [next, ...guardians]);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Family dynamics</h3>
        <p className="text-xs text-muted-foreground">
          Who lives with this person and who can be contacted on their behalf.
        </p>
      </div>
      <div>
        <Label>Family status</Label>
        <Select value={status} onValueChange={(v) => update('family_status', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Both parents present">Both parents present</SelectItem>
            <SelectItem value="Single parent">Single parent</SelectItem>
            <SelectItem value="Single orphan">Single orphan</SelectItem>
            <SelectItem value="Double orphan">Double orphan</SelectItem>
            <SelectItem value="Child-headed household">Child-headed household</SelectItem>
            <SelectItem value="Independent adult">Independent adult</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isBothParents && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 border-t pt-3">
          <GuardianFields
            title="Father"
            value={ensureRole('Father')}
            onChange={(v) => upsertRole('Father', v)}
            lockRelationship
            requireName
          />
          <GuardianFields
            title="Mother"
            value={ensureRole('Mother')}
            onChange={(v) => upsertRole('Mother', v)}
            lockRelationship
            requireName
          />
        </div>
      )}

      {isSingleish && (
        <div className="border-t pt-3">
          <GuardianFields
            title="Primary guardian"
            value={primaryGuardian}
            onChange={setPrimaryGuardian}
            requireName
          />
        </div>
      )}

      {isOrphan && (
        <div className="border-t pt-3">
          <GuardianFields
            title="Caregiver / contact"
            value={primaryGuardian}
            onChange={setPrimaryGuardian}
            requireName
            relationshipOptions={[
              'Grandparent',
              'Aunt/Uncle',
              'Sibling',
              'Foster parent',
              'Guardian',
              'Neighbour',
              'Other',
            ]}
          />
        </div>
      )}

      {isIndependent && (
        <p className="text-sm text-muted-foreground border-t pt-3">
          No parent or guardian details required for an independent adult.
        </p>
      )}

      {!status && form.date_of_birth && (
        <p className="text-xs text-muted-foreground">
          Select a family status above to capture parent or guardian details.
        </p>
      )}
    </div>
  );
}

/* -------- Step 4 -------- */
function Step4Education({
  form,
  update,
  ageLabels,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  ageLabels?: import('@/lib/ageUtils').EducationLabels | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Education</h3>
        {ageLabels && (
          <p className="text-xs text-muted-foreground">
            Age-appropriate level: <span className="font-medium text-foreground">{ageLabels.levelLabel}</span>
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>{ageLabels?.levelLabel || 'Education level'}</Label>
          <Select value={form.academic_level} onValueChange={(v) => update('academic_level', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="Pre Primary">Pre Primary</SelectItem>
              <SelectItem value="Lower Primary">Lower Primary</SelectItem>
              <SelectItem value="Upper Primary">Upper Primary</SelectItem>
              <SelectItem value="Junior Secondary School">Junior Secondary School</SelectItem>
              <SelectItem value="Senior School">Senior School</SelectItem>
              <SelectItem value="Secondary School">Secondary School</SelectItem>
              <SelectItem value="Tertiary">Tertiary</SelectItem>
              <SelectItem value="Special School">Special School</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Class / grade / year</Label>
          <Input value={form.grade} onChange={(e) => update('grade', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Institution name</Label>
          <Input
            value={form.institution_name}
            onChange={(e) => update('institution_name', e.target.value)}
          />
        </div>
        <div>
          <Label>Currently enrolled?</Label>
          <Select value={form.is_enrolled} onValueChange={(v) => update('is_enrolled', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {form.is_enrolled === 'no' && (
          <div>
            <Label>Out-of-school reason</Label>
            <Select value={form.out_of_school_reason} onValueChange={(v) => update('out_of_school_reason', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {['Financial', 'Distance', 'Disability', 'Family responsibilities', 'Completed', 'Never enrolled', 'Other'].map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------- Step 5 -------- */
function Step5Health({
  form,
  update,
  config,
  can,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  config: OrgBeneficiaryConfig;
  can: any;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Health</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label>Allergies</Label>
          <TagInput value={form.allergies} onChange={(tags) => update('allergies', tags)} placeholder="Add allergy" />
        </div>
        <div className="sm:col-span-2">
          <Label>Chronic conditions</Label>
          <TagInput
            value={form.chronic_conditions}
            onChange={(tags) => update('chronic_conditions', tags)}
            placeholder="Add chronic condition"
          />
        </div>
        <div>
          <Label>Blood group</Label>
          <Select value={form.blood_group} onValueChange={(v) => update('blood_group', v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown'].map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Last medical check</Label>
          <Input
            type="date"
            value={toDateInputValue(form.last_medical_check)}
            onChange={(e) => update('last_medical_check', e.target.value)}
          />
        </div>
        {config.collect_nutritional_status && (
          <div>
            <Label>Nutritional status</Label>
            <Select value={form.nutritional_status} onValueChange={(v) => update('nutritional_status', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Well-nourished">Well-nourished</SelectItem>
                <SelectItem value="Moderate malnutrition">Moderate malnutrition</SelectItem>
                <SelectItem value="Severe malnutrition">Severe malnutrition</SelectItem>
                <SelectItem value="Not assessed">Not assessed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {config.collect_hiv_status && (can?.viewHIVData !== false) && (
          <div>
            <Label>HIV status</Label>
            <Select value={form.hiv_status} onValueChange={(v) => update('hiv_status', v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------- Step 6 -------- */
function Step6Vulnerability({
  form,
  update,
  options,
  tags,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  options: string[];
  tags: string[];
}) {
  const toggleTag = (tag: string) => {
    const has = form.vulnerability_tags.includes(tag);
    update(
      'vulnerability_tags',
      has
        ? form.vulnerability_tags.filter((t) => t !== tag)
        : [...form.vulnerability_tags, tag],
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Vulnerability assessment</h3>
        <p className="text-xs text-muted-foreground">
          Helps prioritise support and reporting.
        </p>
      </div>
      <div>
        <Label>Primary need</Label>
        <Select value={form.primary_need} onValueChange={(v) => update('primary_need', v)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Vulnerability tags</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => {
            const active = form.vulnerability_tags.includes(tag);
            return (
              <Badge
                key={tag}
                variant={active ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            );
          })}
        </div>
      </div>
      <div>
        <Label>Overall vulnerability level</Label>
        <Select value={form.vulnerability_level} onValueChange={(v) => update('vulnerability_level', v)}>
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/* -------- Step 7 -------- */
function Step7Notes({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Notes</h3>
      </div>
      <div>
        <Label>Additional notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          rows={5}
        />
      </div>
      <div>
        <Label>Photo URL (optional)</Label>
        <Input
          value={form.photo_url}
          onChange={(e) => update('photo_url', e.target.value)}
          placeholder="https://..."
        />
      </div>
    </div>
  );
}
