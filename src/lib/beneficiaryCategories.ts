/**
 * Registration category engine.
 *
 * A beneficiary's *person category* decides which sections of the
 * registration form (and of the profile) are relevant. This is data, not
 * hardcoded forms — sector templates layer their own fields on top via
 * org_beneficiary_config.custom_fields.
 */

export type PersonCategory =
  | 'minor_student'
  | 'adult_student'
  | 'adult'
  | 'group'
  | 'household'
  | 'organisation';

export type SectionKey =
  | 'personal'
  | 'own_contact'      // the person's own phone / residence
  | 'national_id'
  | 'education'
  | 'guardians'        // parent / guardian records
  | 'guardian_contact' // separate guardian phone + location block
  | 'care_arrangement'
  | 'interests'
  | 'medical'
  | 'family_status'
  | 'economic'
  | 'household'
  | 'group_details'
  | 'vulnerability'
  | 'needs'
  | 'bio';

export interface CategoryDefinition {
  value: PersonCategory;
  label: string;
  description: string;
  /** Legacy beneficiary_category kept for backward compatibility. */
  legacyCategory: 'individual' | 'household' | 'group' | 'organisation';
  minAge?: number;
  maxAge?: number;
  /** Guardian details must be present before the record can be saved. */
  guardiansRequired: boolean;
  sections: SectionKey[];
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    value: 'minor_student',
    label: 'Student — under 18',
    description:
      'A child in school. Contact goes through a parent or guardian; no own phone or national ID.',
    legacyCategory: 'individual',
    maxAge: 17,
    guardiansRequired: true,
    sections: [
      'personal',
      'education',
      'guardians',
      'guardian_contact',
      'care_arrangement',
      'interests',
      'medical',
      'vulnerability',
      'needs',
      'bio',
    ],
  },
  {
    value: 'adult_student',
    label: 'Student — 18 and over',
    description:
      'An adult in school, college or university. Captures their own contact AND their parents/guardians separately.',
    legacyCategory: 'individual',
    minAge: 18,
    guardiansRequired: false,
    sections: [
      'personal',
      'own_contact',
      'national_id',
      'education',
      'guardians',
      'guardian_contact',
      'care_arrangement',
      'interests',
      'medical',
      'vulnerability',
      'needs',
      'bio',
    ],
  },
  {
    value: 'adult',
    label: 'Adult — not a student',
    description:
      'An adult supported directly. Captures residence, family, economic details and source of income.',
    legacyCategory: 'individual',
    minAge: 18,
    guardiansRequired: false,
    sections: [
      'personal',
      'own_contact',
      'national_id',
      'care_arrangement',
      'family_status',
      'household',
      'economic',
      'medical',
      'vulnerability',
      'needs',
      'bio',
    ],
  },
  {
    value: 'group',
    label: 'Group',
    description: 'A self-help group, cooperative or community group with members.',
    legacyCategory: 'group',
    guardiansRequired: false,
    sections: ['group_details', 'own_contact', 'vulnerability', 'needs', 'bio'],
  },
  {
    value: 'household',
    label: 'Household',
    description: 'A family unit registered as one record.',
    legacyCategory: 'household',
    guardiansRequired: false,
    sections: [
      'personal',
      'own_contact',
      'household',
      'economic',
      'medical',
      'vulnerability',
      'needs',
      'bio',
    ],
  },
  {
    value: 'organisation',
    label: 'Organisation',
    description: 'A partner institution or service provider.',
    legacyCategory: 'organisation',
    guardiansRequired: false,
    sections: ['group_details', 'own_contact', 'bio'],
  },
];

export const getCategoryDefinition = (
  category: PersonCategory | '' | null | undefined,
): CategoryDefinition =>
  CATEGORY_DEFINITIONS.find((c) => c.value === category) ?? CATEGORY_DEFINITIONS[0];

export const hasSection = (
  category: PersonCategory | '' | null | undefined,
  section: SectionKey,
): boolean => getCategoryDefinition(category).sections.includes(section);

export const isStudentCategory = (category?: string | null) =>
  category === 'minor_student' || category === 'adult_student';

export const isPersonCategory = (category?: string | null) =>
  category === 'minor_student' ||
  category === 'adult_student' ||
  category === 'adult' ||
  category === 'household';

/**
 * Returns a human-readable mismatch message when the entered date of birth
 * contradicts the selected category, otherwise null.
 */
export const categoryAgeMismatch = (
  category: PersonCategory | '' | null | undefined,
  age: number | null,
): string | null => {
  if (age === null || !category) return null;
  const def = getCategoryDefinition(category);
  if (def.legacyCategory !== 'individual') return null;
  if (def.maxAge !== undefined && age > def.maxAge) {
    return `The date of birth gives an age of ${age}, but "${def.label}" is for people ${def.maxAge} and under. Change the category or correct the date of birth.`;
  }
  if (def.minAge !== undefined && age < def.minAge) {
    return `The date of birth gives an age of ${age}, but "${def.label}" is for people ${def.minAge} and over. Change the category or correct the date of birth.`;
  }
  return null;
};

/** Infers a category for legacy records that predate person_category. */
export const inferPersonCategory = (beneficiary: any): PersonCategory => {
  if (!beneficiary) return 'adult';
  if (beneficiary.person_category) return beneficiary.person_category as PersonCategory;
  const legacy = beneficiary.beneficiary_category;
  if (legacy === 'group' || beneficiary.beneficiary_type === 'group') return 'group';
  if (legacy === 'organisation') return 'organisation';
  if (legacy === 'household') return 'household';

  let age: number | null = null;
  if (beneficiary.date_of_birth) {
    const dob = new Date(beneficiary.date_of_birth);
    if (!Number.isNaN(dob.getTime())) {
      const diff = Date.now() - dob.getTime();
      age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    }
  }
  const looksStudent =
    beneficiary.beneficiary_type === 'student' || !!beneficiary.academic_level;
  if (age !== null && age < 18) return 'minor_student';
  if (looksStudent) return 'adult_student';
  return 'adult';
};

export const categoryLabel = (category?: string | null) =>
  CATEGORY_DEFINITIONS.find((c) => c.value === category)?.label ?? 'Beneficiary';
