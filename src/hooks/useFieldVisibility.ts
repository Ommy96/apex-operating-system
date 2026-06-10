import { calculateAge, getAgeGroup, getEducationLabels, isChild, isMinor, type AgeGroup, type EducationLabels } from '@/lib/ageUtils';
import type { OrgBeneficiaryConfig } from '@/hooks/useOrgBeneficiaryConfig';

export interface FieldVisibility {
  // Personal / identity
  showPhone: boolean;
  showNationalId: boolean;
  showMaritalStatus: boolean;
  showOccupation: boolean;
  showIncomeLevel: boolean;

  // Education
  showEducation: boolean;
  showEducationLevel: boolean;
  showSchoolName: boolean;
  showGrade: boolean;
  showOutOfSchoolReason: boolean;
  showTransitionSupport: boolean;

  // Family / guardian
  showGuardianFields: boolean;
  showFamilyStatus: boolean;
  showNumberOfChildren: boolean;

  // Health
  showHealth: boolean;
  showAllergies: boolean;
  showChronicConditions: boolean;
  showBloodGroup: boolean;
  showNutritionalStatus: boolean;
  showHivStatus: boolean;
  showPregnancyStatus: boolean;
  showReproductiveHealth: boolean;

  // Economic
  showEconomic: boolean;
  showEmploymentType: boolean;
  showPrimaryIncomeSource: boolean;

  // Disability / vulnerability
  showDisability: boolean;
  showVulnerabilityAssessment: boolean;

  // Care arrangement-driven sections
  showGuardianSection: boolean;
  showDependantsSection: boolean;
  showInstitutionSection: boolean;
  guardianSectionRequired: boolean;

  // Meta
  age: number | null;
  ageGroup: AgeGroup;
  isMinor: boolean;
  isChild: boolean;
  ageUnknown: boolean;
  educationLabels: EducationLabels | null;
}

export function useFieldVisibility(
  dateOfBirth: string | null | undefined,
  orgConfig: OrgBeneficiaryConfig | null | undefined,
  careArrangement?: string | null,
): FieldVisibility {
  const age = calculateAge(dateOfBirth);
  const ageGroup = getAgeGroup(age);
  const minor = isMinor(age);
  const child = isChild(age);
  const ageUnknown = age === null;

  const educationOn = orgConfig?.collect_education_data ?? true;
  const healthOn = orgConfig?.collect_health_data ?? true;
  const economicOn = orgConfig?.collect_economic_data ?? false;

  const care = careArrangement ?? '';

  return {
    // Personal / identity
    showPhone: !child,
    showNationalId: !minor,
    showMaritalStatus: !minor,
    showOccupation: !minor && economicOn,
    showIncomeLevel: !minor && economicOn,

    // Education
    showEducation: educationOn,
    showEducationLevel: educationOn,
    showSchoolName: educationOn && (ageUnknown || (age !== null && age >= 3)),
    showGrade: educationOn && (ageUnknown || (age !== null && age >= 3)),
    showOutOfSchoolReason: educationOn,
    showTransitionSupport: educationOn && (ageUnknown || (age !== null && age >= 13 && age <= 20)),

    // Family / guardian
    showGuardianFields: minor || ageUnknown,
    showFamilyStatus: true,
    showNumberOfChildren: !minor,

    // Health
    showHealth: healthOn,
    showAllergies: healthOn,
    showChronicConditions: healthOn,
    showBloodGroup: healthOn,
    showNutritionalStatus: healthOn && (orgConfig?.collect_nutritional_status ?? false),
    showHivStatus: healthOn && (orgConfig?.collect_hiv_status ?? false),
    showPregnancyStatus: healthOn && !minor && ageGroup !== 'elder',
    showReproductiveHealth: healthOn && !minor,

    // Economic
    showEconomic: !minor && economicOn,
    showEmploymentType: !minor && economicOn,
    showPrimaryIncomeSource: !minor && economicOn,

    // Disability / vulnerability
    showDisability: orgConfig?.collect_disability_details ?? false,
    showVulnerabilityAssessment: true,

    // Care arrangement-driven sections
    showGuardianSection: care === 'under_guardian_care',
    showDependantsSection: care === 'head_of_household_with_dependents',
    showInstitutionSection: care === 'institutional_care',
    guardianSectionRequired: care === 'under_guardian_care',

    // Meta
    age,
    ageGroup,
    isMinor: minor,
    isChild: child,
    ageUnknown,
    educationLabels: getEducationLabels(age),
  };
}