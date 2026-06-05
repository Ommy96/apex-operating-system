import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ActivityTimeline } from './ActivityTimeline';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { formatDisplayDate } from '@/lib/dateUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import type { FieldVisibility } from '@/hooks/useFieldVisibility';

interface OverviewProps {
  beneficiary: any;
  guardians: any[];
  donors: any[];
  visibility: FieldVisibility;
  canLogVisit?: boolean;
  onLogVisit?: () => void;
}

export function BeneficiaryOverviewTab({ beneficiary, guardians, donors, visibility, canLogVisit, onLogVisit }: OverviewProps) {
  const isMobile = useIsMobile();
  const age = visibility.age;
  const isMinorAge = visibility.isMinor;
  const vulnerabilityTags: string[] = beneficiary.vulnerability_tags || [];

  const personalRows: Array<[string, any]> = [
    ['Full name', beneficiary.display_name],
    ['Date of birth', beneficiary.date_of_birth ? `${formatDisplayDate(beneficiary.date_of_birth)} · ${age ?? '?'} yrs` : null],
    ['Gender', beneficiary.gender],
    ['Religion', beneficiary.religion],
    ...(!isMinorAge ? [['Marital status', beneficiary.marital_status] as [string, any]] : []),
  ];

  const contactRows: Array<[string, any]> = [
    ['Phone', beneficiary.phone],
    ...(visibility.showNationalId ? [['National ID', beneficiary.national_id] as [string, any]] : []),
    ['County', beneficiary.county],
    ['Sub-county', beneficiary.sub_county],
    ['Village / Estate', beneficiary.estate_village],
    ['Address', beneficiary.address],
  ];

  const householdRows: Array<[string, any]> = [
    ['Household size', beneficiary.household_size],
    ['Household ID', beneficiary.household_id],
  ];

  const vulnerabilityRows: Array<[string, any]> = [
    ['Vulnerability level', beneficiary.vulnerability_level],
    ['Primary need', beneficiary.primary_need],
  ];

  const consentRows: Array<[string, any]> = [
    ['Consent given', beneficiary.consent_given ? 'Yes' : 'No'],
    ['Consent date', beneficiary.consent_date ? formatDisplayDate(beneficiary.consent_date) : null],
    ['Registration source', beneficiary.registration_source],
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 lg:gap-10">
      {/* Timeline column */}
      <div className="min-w-0">
        <ActivityTimeline
          beneficiaryId={beneficiary.id}
          beneficiary={beneficiary}
          donors={donors}
          canLogVisit={canLogVisit}
          onLogVisit={onLogVisit}
        />
      </div>

      {/* Details side panel */}
      <aside className="space-y-3">
        <DetailsSection title="Personal" rows={personalRows} defaultOpen={!isMobile} />
        <DetailsSection title="Contact" rows={contactRows} defaultOpen={!isMobile} />
        <DetailsSection title="Family" defaultOpen={!isMobile}>
          <Row label="Family status" value={beneficiary.family_status} />
          {guardians.length === 0 && (
            <p className="text-[12px] italic mt-1" style={{ color: '#A8A29E' }}>No guardians recorded</p>
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
        </DetailsSection>
        <DetailsSection title="Household" rows={householdRows} defaultOpen={!isMobile} />
        <DetailsSection title="Vulnerability" defaultOpen={!isMobile}>
          {vulnerabilityRows.map(([l, v]) => <Row key={l} label={l} value={v} />)}
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
        </DetailsSection>
        <DetailsSection title="Consent" rows={consentRows} defaultOpen={!isMobile} />
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