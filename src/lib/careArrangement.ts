/**
 * Single source of truth for beneficiary care arrangements.
 * Every selector, render condition, save path and display must use these
 * constants — never raw string literals.
 */
export const CARE_ARRANGEMENT = {
  UNKNOWN: 'unknown',
  INDEPENDENT: 'independent',
  UNDER_GUARDIAN_CARE: 'under_guardian_care',
  HEAD_OF_HOUSEHOLD: 'head_of_household_with_dependents',
  INSTITUTIONAL: 'institutional_care',
} as const;

export type CareArrangement = (typeof CARE_ARRANGEMENT)[keyof typeof CARE_ARRANGEMENT];

export const CARE_ARRANGEMENT_LABELS: Record<CareArrangement, string> = {
  unknown: 'Not set',
  independent: 'Independent',
  under_guardian_care: 'Under parental / guardian care',
  head_of_household_with_dependents: 'Head of household with dependents',
  institutional_care: 'Institutional care',
};

const ALIASES: Record<string, CareArrangement> = {
  independent: 'independent',
  under_guardian_care: 'under_guardian_care',
  under_parental_care: 'under_guardian_care',
  under_parental_guardian_care: 'under_guardian_care',
  guardian_care: 'under_guardian_care',
  head_of_household_with_dependents: 'head_of_household_with_dependents',
  head_of_household: 'head_of_household_with_dependents',
  institutional_care: 'institutional_care',
  institutional: 'institutional_care',
  unknown: 'unknown',
};

/** Normalises any stored / legacy value (casing, spaces, slashes) to the canonical set. */
export const normaliseCareArrangement = (v: string | null | undefined): CareArrangement => {
  const key = (v ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[\s/-]+/g, '_')
    .replace(/_+/g, '_');
  return ALIASES[key] ?? CARE_ARRANGEMENT.UNKNOWN;
};

export const isUnderGuardianCare = (v: string | null | undefined) =>
  normaliseCareArrangement(v) === CARE_ARRANGEMENT.UNDER_GUARDIAN_CARE;
export const isHeadOfHousehold = (v: string | null | undefined) =>
  normaliseCareArrangement(v) === CARE_ARRANGEMENT.HEAD_OF_HOUSEHOLD;
export const isInstitutionalCare = (v: string | null | undefined) =>
  normaliseCareArrangement(v) === CARE_ARRANGEMENT.INSTITUTIONAL;
export const isIndependentCare = (v: string | null | undefined) =>
  normaliseCareArrangement(v) === CARE_ARRANGEMENT.INDEPENDENT;

export const careArrangementLabel = (v: string | null | undefined) =>
  CARE_ARRANGEMENT_LABELS[normaliseCareArrangement(v)];
