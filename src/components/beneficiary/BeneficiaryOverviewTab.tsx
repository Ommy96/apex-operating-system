import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ActivityTimeline } from './ActivityTimeline';
import { formatDisplayDate } from '@/lib/dateUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { FieldVisibility } from '@/hooks/useFieldVisibility';
import { InlineEditableField, type InlineFieldType } from './InlineEditableField';
import { saveBeneficiaryField } from '@/lib/saveBeneficiaryField';
import { COUNTY_NAMES, getSubCounties } from '@/lib/kenyaCounties';
import { OutOfSystemContacts } from './OutOfSystemContacts';

interface OverviewProps {
  beneficiary: any;
  guardians: any[];
  donors: any[];
  visibility: FieldVisibility;
  canLogVisit?: boolean;
  onLogVisit?: () => void;
  /** Permission gate for inline editing. */
  canEdit?: boolean;
  organizationId?: string | null;
  userId?: string | null;
  /** Optimistically merges a partial update into the beneficiary record. */
  onLocalUpdate?: (partial: Record<string, any>) => void;
  /** Opens the full edit sheet (used by the "Add guardian" empty-state CTA). */
  onAddGuardian?: () => void;
  /** Pre-rendered signature impact line, shown above the activity timeline. */
  signatureLine?: React.ReactNode;
}

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const MARITAL_OPTIONS = ['Single', 'Married', 'Divorced', 'Widowed', 'Separated'];
const VULNERABILITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Critical', value: 'critical' },
];
const FAMILY_STATUS_OPTIONS = [
  'Both parents present', 'Single mother', 'Single father',
  'Orphan', 'Child-headed', 'Guardian-led', 'Other',
];
const YES_NO = [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }];

export function BeneficiaryOverviewTab({
  beneficiary, guardians, donors, visibility, canLogVisit, onLogVisit,
  canEdit = false, organizationId, userId, onLocalUpdate, onAddGuardian, signatureLine,
}: OverviewProps) {
  const isMobile = useIsMobile();
  const age = visibility.age;
  const isMinorAge = visibility.isMinor;
  const vulnerabilityTags: string[] = beneficiary.vulnerability_tags || [];

  const canSave = canEdit && !!organizationId;
  const subCounties = beneficiary.county ? getSubCounties(beneficiary.county) : [];

  const makeSaver = (field: string, label: string) => async (newValue: any) => {
    if (!organizationId) return;
    await saveBeneficiaryField({
      beneficiaryId: beneficiary.id,
      organizationId,
      field,
      label,
      newValue,
      oldValue: beneficiary[field] ?? null,
      userId: userId ?? null,
      applyLocal: (v) => onLocalUpdate?.({ [field]: v }),
    });
  };

  // Saver wrappers that coerce types
  const boolSaver = (field: string, label: string) => async (v: any) => {
    const coerced = v === null || v === '' ? null : v === 'true' || v === true;
    if (!organizationId) return;
    await saveBeneficiaryField({
      beneficiaryId: beneficiary.id, organizationId, field, label,
      newValue: coerced, oldValue: beneficiary[field] ?? null,
      userId: userId ?? null,
      applyLocal: (val) => onLocalUpdate?.({ [field]: val }),
    });
  };

  const numSaver = (field: string, label: string) => async (v: any) => {
    const coerced = v === null || v === '' ? null : Number(v);
    if (!organizationId) return;
    await saveBeneficiaryField({
      beneficiaryId: beneficiary.id, organizationId, field, label,
      newValue: coerced, oldValue: beneficiary[field] ?? null,
      userId: userId ?? null,
      applyLocal: (val) => onLocalUpdate?.({ [field]: val }),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 lg:gap-12">
      {/* Timeline column */}
      <div className="min-w-0">
        <ActivityTimeline
          beneficiaryId={beneficiary.id}
          beneficiary={beneficiary}
          donors={donors}
          canLogVisit={canLogVisit}
          onLogVisit={onLogVisit}
          signatureLine={signatureLine}
        />
      </div>

      {/* Details side panel — continuous list, no card chrome */}
      <aside className="min-w-0">
        <PanelSection title="Personal" first defaultOpen={!isMobile} isMobile={isMobile}>
          <EditableRow label="Full name" value={beneficiary.display_name} canEdit={canSave} type="text"
            onSave={makeSaver('display_name', 'Full name')}
            validate={(v) => !v ? 'Name is required' : null} />
          <EditableRow label="Date of birth" value={beneficiary.date_of_birth} canEdit={canSave} type="date"
            display={(v) => v ? `${formatDisplayDate(v)} · ${age ?? '?'} yrs` : '—'}
            onSave={makeSaver('date_of_birth', 'Date of birth')} />
          <EditableRow label="Gender" value={beneficiary.gender} canEdit={canSave} type="select" options={GENDER_OPTIONS}
            onSave={makeSaver('gender', 'Gender')} />
          <EditableRow label="Religion" value={beneficiary.religion} canEdit={canSave} type="text"
            onSave={makeSaver('religion', 'Religion')} />
          {!isMinorAge && (
            <EditableRow label="Marital status" value={beneficiary.marital_status} canEdit={canSave} type="select" options={MARITAL_OPTIONS}
              onSave={makeSaver('marital_status', 'Marital status')} />
          )}
        </PanelSection>

        <PanelSection title="Contact" defaultOpen={!isMobile} isMobile={isMobile}>
          <EditableRow label="Phone" value={beneficiary.phone} canEdit={canSave} type="phone" mono
            validate={(v) => v && !/^[+\d\s\-()]{7,20}$/.test(String(v)) ? 'Invalid phone number' : null}
            onSave={makeSaver('phone', 'Phone')} />
          {visibility.showNationalId && (
            <EditableRow label="National ID" value={beneficiary.national_id} canEdit={canSave} type="text" mono
              onSave={makeSaver('national_id', 'National ID')} />
          )}
          <EditableRow label="County" value={beneficiary.county} canEdit={canSave} type="select" options={COUNTY_NAMES}
            onSave={makeSaver('county', 'County')} />
          <EditableRow label="Sub-county" value={beneficiary.sub_county} canEdit={canSave}
            type={subCounties.length > 0 ? 'select' : 'text'}
            options={subCounties.length > 0 ? subCounties : undefined}
            onSave={makeSaver('sub_county', 'Sub-county')} />
          <EditableRow label="Village / Estate" value={beneficiary.estate_village} canEdit={canSave} type="text"
            onSave={makeSaver('estate_village', 'Village / Estate')} />
          <EditableRow label="Address" value={beneficiary.address} canEdit={canSave} type="long-text"
            onSave={makeSaver('address', 'Address')} />
        </PanelSection>
        <PanelSection title="Family" defaultOpen={!isMobile} isMobile={isMobile}>
          <EditableRow label="Family status" value={beneficiary.family_status} canEdit={canSave}
            type="select" options={FAMILY_STATUS_OPTIONS}
            onSave={makeSaver('family_status', 'Family status')} />

          {/* Parents / guardians */}
          <div className="mt-3 mb-1 text-[11px]" style={{ color: '#78716C', fontWeight: 500 }}>Parents / guardians</div>
          {guardians.length === 0 && isMinorAge && (
            <div className="rounded-md p-3 text-[12px] text-center space-y-2" style={{ background: '#FEF3C7', color: '#92400E' }}>
              <p>No parent or guardian recorded for this minor.</p>
              {onAddGuardian && (
                <button onClick={onAddGuardian} className="text-[12px] font-medium underline" style={{ color: '#0F7B6C' }}>
                  Add guardian →
                </button>
              )}
            </div>
          )}
          {guardians.length === 0 && !isMinorAge && (
            <p className="text-[12px] italic" style={{ color: '#A8A29E' }}>No guardians recorded</p>
          )}
          {guardians.map((g) => {
            const relLabel = g.relationship || (g.guardian_type === 'father' ? 'Father' : g.guardian_type === 'mother' ? 'Mother' : 'Guardian');
            return (
              <div key={g.id} className="mt-2 pt-2" style={{ borderTop: '1px solid #F5F0E8' }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px]" style={{ color: '#1C1917', fontWeight: 600 }}>{g.full_name}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={g.is_alive === false ? { background: '#FEE2E2', color: '#991B1B' } : { background: '#DCFCE7', color: '#166534' }}
                  >
                    {g.is_alive === false ? 'Deceased' : 'Alive'}
                  </span>
                </div>
                <div className="text-[11px]" style={{ color: '#78716C' }}>{relLabel}</div>
                {g.phone && <div className="text-[11px]" style={{ color: '#44403C' }}>📞 {g.phone}</div>}
                {g.national_id && <div className="text-[11px]" style={{ color: '#78716C' }}>ID: {g.national_id}</div>}
                {(g.employment_type || g.source_of_income) && (
                  <div className="text-[11px]" style={{ color: '#78716C' }}>
                    {[g.employment_type, g.source_of_income].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
            );
          })}

          {/* Out-of-system contacts */}
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid #EDE5D8' }}>
            <OutOfSystemContacts beneficiaryId={beneficiary.id} />
          </div>
        </PanelSection>
        <PanelSection title="Household" defaultOpen={!isMobile} isMobile={isMobile}>
          <EditableRow label="Household size" value={beneficiary.household_size} canEdit={canSave} type="number"
            validate={(v) => v != null && Number(v) < 0 ? 'Must be ≥ 0' : null}
            onSave={numSaver('household_size', 'Household size')} />
          <Row label="Household ID" value={beneficiary.household_id} />
        </PanelSection>
        <PanelSection title="Vulnerability" defaultOpen={!isMobile} isMobile={isMobile}>
          <EditableRow label="Vulnerability level" value={beneficiary.vulnerability_level} canEdit={canSave}
            type="select" options={VULNERABILITY_OPTIONS}
            display={(v) => v ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : '—'}
            onSave={makeSaver('vulnerability_level', 'Vulnerability level')} />
          <EditableRow label="Primary need" value={beneficiary.primary_need} canEdit={canSave} type="text"
            onSave={makeSaver('primary_need', 'Primary need')} />
          <div className="mt-2">
            <div className="text-[11px] mb-1" style={{ color: '#78716C', fontWeight: 500 }}>Tags</div>
            <div className="flex flex-wrap gap-1.5">
              {vulnerabilityTags.length === 0
                ? <span className="text-[11px] italic" style={{ color: '#A8A29E' }}>None</span>
                : vulnerabilityTags.map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-[5px]" style={{ background: '#FDF2F8', color: '#831843' }}>{t}</span>
                  ))}
            </div>
          </div>
        </PanelSection>
        <PanelSection title="Consent" defaultOpen={!isMobile} isMobile={isMobile}>
          <EditableRow label="Consent given" value={beneficiary.consent_given === null || beneficiary.consent_given === undefined ? null : String(!!beneficiary.consent_given)}
            canEdit={canSave} type="select" options={YES_NO}
            display={(v) => v === null || v === '' ? '—' : v === 'true' || v === true ? 'Yes' : 'No'}
            onSave={boolSaver('consent_given', 'Consent given')} />
          <EditableRow label="Consent date" value={beneficiary.consent_date} canEdit={canSave} type="date"
            display={(v) => v ? formatDisplayDate(v) : '—'}
            onSave={makeSaver('consent_date', 'Consent date')} />
          <EditableRow label="Registration source" value={beneficiary.registration_source} canEdit={canSave} type="text"
            onSave={makeSaver('registration_source', 'Registration source')} />
        </PanelSection>
      </aside>
    </div>
  );
}

function DetailsSection({
  title, rows, children, defaultOpen = true,
}: { title: string; rows?: Array<[string, any]>; children?: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-[14px]" >
      <div style={{ background: '#FFFEF9', border: '1px solid #E7E2DA', borderRadius: 14 }}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-5 py-3">
          <span className="text-[13px]" style={{ color: '#1C1917', fontWeight: 600 }}>{title}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: '#78716C' }} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-4 pt-1" style={{ borderTop: '1px solid #EDE5D8' }}>
            {rows?.map(([l, v]) => <Row key={l} label={l} value={v} />)}
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="flex justify-between items-baseline gap-3 py-[7px]">
      <span className="text-[11px] flex-shrink-0" style={{ color: '#78716C', fontWeight: 500 }}>{label}</span>
      <span
        className={`text-[13px] text-right ${empty ? 'italic' : ''}`}
        style={{ color: empty ? '#A8A29E' : '#1C1917', fontWeight: empty ? 400 : 500, maxWidth: '60%', wordBreak: 'break-word' }}
      >
        {empty ? '—' : String(value)}
      </span>
    </div>
  );
}

function EditableRow(props: {
  label: string;
  value: any;
  canEdit: boolean;
  type: InlineFieldType;
  options?: Array<{ label: string; value: string } | string>;
  validate?: (v: any) => string | null;
  onSave: (v: any) => Promise<any>;
  display?: (v: any) => React.ReactNode;
  mono?: boolean;
}) {
  return <InlineEditableField {...props} />;
}