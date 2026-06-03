import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type GuardianTypeDb = 'father' | 'mother' | 'other';

export interface GuardianFieldsValue {
  id?: string; // existing guardians.id (for updates)
  linkId?: string; // existing beneficiary_guardians.id (for updates)
  guardian_type: GuardianTypeDb;
  relationship: string; // free label shown to user, also written to beneficiary_guardians.relationship
  full_name: string;
  national_id: string;
  phone: string;
  is_alive: boolean;
  employment_type: string;
  source_of_income: string;
}

export const EMPTY_GUARDIAN: GuardianFieldsValue = {
  guardian_type: 'other',
  relationship: '',
  full_name: '',
  national_id: '',
  phone: '',
  is_alive: true,
  employment_type: '',
  source_of_income: '',
};

const RELATIONSHIP_OPTIONS = [
  'Mother',
  'Father',
  'Grandparent',
  'Aunt/Uncle',
  'Sibling',
  'Foster parent',
  'Guardian',
  'Other',
];

export const relationshipToGuardianType = (relationship: string): GuardianTypeDb => {
  const r = (relationship || '').toLowerCase();
  if (r === 'father') return 'father';
  if (r === 'mother') return 'mother';
  return 'other';
};

interface Props {
  value: GuardianFieldsValue;
  onChange: (next: GuardianFieldsValue) => void;
  title: string;
  lockRelationship?: boolean;
  requireName?: boolean;
  relationshipOptions?: string[];
}

/**
 * Presentational, controlled component for a single guardian / caregiver
 * record. Used inside BeneficiaryForm Step 3 and (via a small adapter) the
 * standalone react-hook-form GuardianForm.
 */
export function GuardianFields({
  value,
  onChange,
  title,
  lockRelationship = false,
  requireName = false,
  relationshipOptions = RELATIONSHIP_OPTIONS,
}: Props) {
  const set = <K extends keyof GuardianFieldsValue>(key: K, v: GuardianFieldsValue[K]) => {
    const next = { ...value, [key]: v };
    if (key === 'relationship') {
      next.guardian_type = relationshipToGuardianType(v as string);
    }
    onChange(next);
  };

  return (
    <div className="rounded-md border border-border bg-card p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={value.is_alive}
            onCheckedChange={(c) => set('is_alive', !!c)}
          />
          Alive
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Full name {requireName && '*'}</Label>
          <Input
            value={value.full_name}
            onChange={(e) => set('full_name', e.target.value)}
            placeholder="Enter full name"
          />
        </div>
        <div>
          <Label>Relationship</Label>
          {lockRelationship ? (
            <Input value={value.relationship} disabled />
          ) : (
            <Select value={value.relationship} onValueChange={(v) => set('relationship', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {relationshipOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>National ID</Label>
          <Input
            value={value.national_id}
            onChange={(e) => set('national_id', e.target.value)}
            placeholder="Optional but recommended"
          />
        </div>
        <div>
          <Label>Phone</Label>
          <Input
            value={value.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="e.g. 0712345678"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Employment status</Label>
          <Select value={value.employment_type} onValueChange={(v) => set('employment_type', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employed">Employed</SelectItem>
              <SelectItem value="self_employed">Self-employed</SelectItem>
              <SelectItem value="unemployed">Unemployed</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Source of income</Label>
          <Input
            value={value.source_of_income}
            onChange={(e) => set('source_of_income', e.target.value)}
            placeholder="e.g. Farming, business"
          />
        </div>
      </div>
    </div>
  );
}