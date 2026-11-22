import type { SectorField } from '@/hooks/useOrgBeneficiaryConfig';

/** Compare names and labels consistently, including snake_case and camelCase keys. */
export function normaliseCustomField(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const CORE_FIELD_RULES = [
  { pattern: /\b(school|grade|class)\b|\binstitution name\b/, step: 'Education' },
  { pattern: /\battendance\b/, step: 'School visits' },
  { pattern: /\bsponsorship\b/, step: 'Sponsorship' },
  { pattern: /\bdate of birth\b|\bbirth date\b|\bdob\b|\bgender\b/, step: 'Demographics' },
  { pattern: /\bphone\b/, step: 'Identity' },
];

export function coreFieldStep(field: Pick<SectorField, 'name' | 'label'>): string | undefined {
  const values = [normaliseCustomField(field.name), normaliseCustomField(field.label)];
  // Attendance is visit history even when its label also contains “school”.
  if (values.some(value => /\battendance\b/.test(value))) return 'School visits';
  return CORE_FIELD_RULES.find(rule => values.some(value => rule.pattern.test(value)))?.step;
}

export function customFieldWarnings(fields: SectorField[]): string[] {
  return fields.flatMap(field => {
    const step = coreFieldStep(field);
    return step ? [`${field.label || field.name}: This is already captured in the ${step} step`] : [];
  });
}