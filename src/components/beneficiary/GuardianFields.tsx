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
  /** Where the guardian lives — captured separately from the beneficiary's
   *  own residence (an adult student often lives away from their parents). */
  county: string;
  sub_county: string;
  estate_village: string;
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
  county: '',
  sub_county: '',
  estate_village: '',
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
  /** Show the guardian's own county / sub-county / village block. */
  showLocation?: boolean;
  /** Counties list for the location block (falls back to free text). */
  countyOptions?: string[];
  subCountyOptionsFor?: (county: string) => string[];
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
  showLocation = false,
  countyOptions,
  subCountyOptionsFor,
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

      {showLocation && (
        <div className="space-y-3 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            Where this parent / guardian lives
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>County</Label>
              {countyOptions && countyOptions.length > 0 ? (
                <Select
                  value={value.county}
                  onValueChange={(v) => onChange({ ...value, county: v, sub_county: '' })}
                >
                  <SelectTrigger><SelectValue placeholder="Select county" /></SelectTrigger>
                  <SelectContent>
                    {countyOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={value.county} onChange={(e) => set('county', e.target.value)} />
              )}
            </div>
            <div>
              <Label>Sub-county</Label>
              {(() => {
                const subs = subCountyOptionsFor?.(value.county) ?? [];
                return subs.length > 0 ? (
                  <Select value={value.sub_county} onValueChange={(v) => set('sub_county', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {subs.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={value.sub_county}
                    onChange={(e) => set('sub_county', e.target.value)}
                  />
                );
              })()}
            </div>
          </div>
          <div>
            <Label>Village / estate</Label>
            <Input
              value={value.estate_village}
              onChange={(e) => set('estate_village', e.target.value)}
            />
          </div>
        </div>
      )}
    </div>

  );
}