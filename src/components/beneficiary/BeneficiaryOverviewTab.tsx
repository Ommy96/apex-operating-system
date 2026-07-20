import { useState, useMemo } from 'react';
import { ChevronDown, User, Phone, Users, Home as HomeIcon, ShieldAlert, FileCheck } from 'lucide-react';
import { ActivityTimeline } from './ActivityTimeline';
import { formatDisplayDate } from '@/lib/dateUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { FieldVisibility } from '@/hooks/useFieldVisibility';
import { InlineEditableField, type InlineFieldType } from './InlineEditableField';
import { saveBeneficiaryField } from '@/lib/saveBeneficiaryField';
import { COUNTY_NAMES, getSubCounties } from '@/lib/kenyaCounties';

interface OverviewProps {
  beneficiary: any;
  guardians: any[];
  guardiansError?: boolean;
  onRetryGuardians?: () => void;
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
  guardiansError = false, onRetryGuardians,
}: OverviewProps) {
  const isMobile = useIsMobile();
  const SECTION_KEYS = ['personal', 'contact', 'family', 'household', 'vulnerability', 'consent'] as const;
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const toggleSection = (k: string) =>
    setOpenSections(s => ({ ...s, [k]: !s[k] }));
  const allOpen = SECTION_KEYS.every(k => !!openSections[k]);
  const setAll = (v: boolean) =>
    setOpenSections(Object.fromEntries(SECTION_KEYS.map(k => [k, v])));
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
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] uppercase tracking-[0.6px]" style={{ color: '#78716C', fontWeight: 600 }}>Details</span>
          <button
            type="button"
            onClick={() => setAll(!allOpen)}
            className="text-[12px]"
            style={{ color: '#78716C', fontWeight: 500, fontFamily: 'DM Sans, sans-serif' }}
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
        <PanelSection title="Personal" icon={User} first open={!!openSections.personal} onToggle={() => toggleSection('personal')}>
          <EditableRow label="Full name" value={beneficiary.display_name} canEdit={canSave} type="text"
            onSave={makeSaver('display_name', 'Full name')}
            validate={(v) => !v ? 'Name is required' : null} />
          <EditableRow label="Date of birth" value={beneficiary.date_of_birth} canEdit={canSave} type="date"
            display={(v) => v ? `${formatDisplayDate(v)} · ${age ?? '?'} yrs` : 'Not recorded'}
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

        <PanelSection title="Contact" icon={Phone} open={!!openSections.contact} onToggle={() => toggleSection('contact')}>
          {visibility.showPhone && (
            <EditableRow label="Phone" value={beneficiary.phone} canEdit={canSave} type="phone" mono
              validate={(v) => v && !/^[+\d\s\-()]{7,20}$/.test(String(v)) ? 'Invalid phone number' : null}
              onSave={makeSaver('phone', 'Phone')} />
          )}
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
        </PanelSection>
        <PanelSection title="Family" icon={Users} open={!!openSections.family} onToggle={() => toggleSection('family')}>
          <EditableRow label="Family status" value={beneficiary.family_status} canEdit={canSave}
            type="select" options={FAMILY_STATUS_OPTIONS}
            onSave={makeSaver('family_status', 'Family status')} />

          {/* Parents / guardians */}
          <div className="mt-3 mb-1 text-[11px]" style={{ color: '#78716C', fontWeight: 500 }}>Parents / guardians</div>
          {guardiansError && (
            <div className="rounded-md p-2 text-[12px] flex items-center justify-between gap-2" style={{ background: '#FEE2E2', color: '#991B1B' }}>
              <span>Couldn't load guardians</span>
              {onRetryGuardians && (
                <button type="button" onClick={onRetryGuardians} className="text-[12px] font-medium underline">Retry</button>
              )}
            </div>
          )}
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
          {[...guardians]
            .sort((a: any, b: any) => {
              const ap = a.is_primary ? 1 : 0;
              const bp = b.is_primary ? 1 : 0;
              if (ap !== bp) return bp - ap;
              const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
              const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
              return bd - ad;
            })
            .map((g: any) => {
              const relLabel = g.relationship || (g.guardian_type === 'father' ? 'Father' : g.guardian_type === 'mother' ? 'Mother' : 'Guardian');
              return (
                <div key={g.id} className="mt-2 pt-2" style={{ borderTop: '1px solid #F5F0E8' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-[5px]"
                      style={{ background: '#F5F0E8', color: '#57534E', fontWeight: 500 }}
                    >
                      {relLabel}
                    </span>
                    <span className="text-[13px] flex-1 min-w-0 truncate" style={{ color: '#1C1917', fontWeight: 600 }}>{g.full_name}</span>
                    {g.is_alive === false && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#991B1B' }}>Deceased</span>
                    )}
                  </div>
                  {(g.phone || g.national_id) && (
                    <div className="text-[11px] mt-1 bp-mono" style={{ color: '#78716C', fontFamily: 'DM Mono, monospace' }}>
                      {[g.phone, g.national_id].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              );
            })}
        </PanelSection>
        <PanelSection title="Household" icon={HomeIcon} open={!!openSections.household} onToggle={() => toggleSection('household')}>
          <EditableRow label="Household size" value={beneficiary.household_size} canEdit={canSave} type="number"
            validate={(v) => v != null && Number(v) < 0 ? 'Must be ≥ 0' : null}
            onSave={numSaver('household_size', 'Household size')} />
        </PanelSection>
        <PanelSection title="Vulnerability" icon={ShieldAlert} open={!!openSections.vulnerability} onToggle={() => toggleSection('vulnerability')}>
          <EditableRow label="Vulnerability level" value={beneficiary.vulnerability_level} canEdit={canSave}
            type="select" options={VULNERABILITY_OPTIONS}
            display={(v) => v ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : 'No risk recorded'}
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
        <PanelSection title="Consent" icon={FileCheck} open={!!openSections.consent} onToggle={() => toggleSection('consent')}>
          <EditableRow label="Consent given" value={beneficiary.consent_given === null || beneficiary.consent_given === undefined ? null : String(!!beneficiary.consent_given)}
            canEdit={canSave} type="select" options={YES_NO}
            display={(v) => v === null || v === '' ? 'Not recorded' : v === 'true' || v === true ? 'Yes' : 'No'}
            onSave={boolSaver('consent_given', 'Consent given')} />
          <EditableRow label="Consent date" value={beneficiary.consent_date} canEdit={canSave} type="date"
            display={(v) => v ? formatDisplayDate(v) : 'Not recorded'}
            onSave={makeSaver('consent_date', 'Consent date')} />
          <EditableRow label="Registration source" value={beneficiary.registration_source} canEdit={canSave} type="text"
            onSave={makeSaver('registration_source', 'Registration source')} />
        </PanelSection>
      </aside>
    </div>
  );
}

function PanelSection({
  title, children, open, onToggle, first = false, icon: Icon,
}: {
  title: string;
  children?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  first?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className={`relative rounded-lg transition-all duration-200 ${first ? '' : 'mt-2'} ${
        open ? 'bg-primary/[0.04] dark:bg-primary/10' : 'bg-transparent'
      }`}
    >
      {open && (
        <span
          aria-hidden
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary transition-opacity duration-200"
        />
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`w-full flex items-center gap-2 py-2 px-2.5 rounded-lg group transition-colors duration-150 ${
          open ? '' : 'hover:bg-muted/40'
        }`}
      >
        {Icon && (
          <span
            className={`inline-flex items-center justify-center h-6 w-6 rounded-md transition-colors duration-200 ${
              open ? 'bg-primary/15 text-primary' : 'bg-muted/60 text-muted-foreground group-hover:text-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        <span
          className={`text-[11px] uppercase tracking-[0.6px] flex-1 text-left transition-colors duration-150 ${
            open ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
          }`}
          style={{ fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}
        >
          {title}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180 text-primary' : ''}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-2.5 pb-3 pt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="flex justify-between items-baseline gap-3 py-[6px]">
      <span className="text-[12px] flex-shrink-0" style={{ color: '#78716C', fontWeight: 500 }}>{label}</span>
      <span
        className="text-[14px] text-right"
        style={{ color: empty ? '#A8A29E' : '#1C1917', fontWeight: empty ? 400 : 500, maxWidth: '60%', wordBreak: 'break-word' }}
      >
        {empty ? 'Not recorded' : String(value)}
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