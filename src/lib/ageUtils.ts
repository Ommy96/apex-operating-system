export function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age < 0 ? 0 : age;
}

export type AgeGroup =
  | 'infant'
  | 'toddler'
  | 'child'
  | 'adolescent'
  | 'young_adult'
  | 'adult'
  | 'elder'
  | 'unknown';

export function getAgeGroup(age: number | null): AgeGroup {
  if (age === null) return 'unknown';
  if (age <= 2) return 'infant';
  if (age <= 5) return 'toddler';
  if (age <= 12) return 'child';
  if (age <= 17) return 'adolescent';
  if (age <= 24) return 'young_adult';
  if (age <= 59) return 'adult';
  return 'elder';
}

export function isMinor(age: number | null): boolean {
  return age !== null && age < 18;
}

export function isChild(age: number | null): boolean {
  return age !== null && age < 13;
}

export function isSchoolAge(age: number | null): boolean {
  return age !== null && age >= 3 && age <= 24;
}

export interface EducationLabels {
  levelLabel: string;
  schoolLabel: string;
  gradeLabel: string;
}

export function getEducationLabels(age: number | null): EducationLabels | null {
  if (age === null || age < 3) return null;
  if (age <= 5) return { levelLabel: 'ECD / Pre-school', schoolLabel: 'ECD centre', gradeLabel: 'Age group' };
  if (age <= 12) return { levelLabel: 'Primary school', schoolLabel: 'School name', gradeLabel: 'Class / Standard' };
  if (age <= 17) return { levelLabel: 'Secondary school', schoolLabel: 'School name', gradeLabel: 'Form' };
  if (age <= 24) return { levelLabel: 'Tertiary / Vocational', schoolLabel: 'Institution', gradeLabel: 'Year / Course' };
  return { levelLabel: 'Highest education level', schoolLabel: 'Institution attended', gradeLabel: 'Year completed' };
}