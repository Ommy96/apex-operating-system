// Academic Level → Grade/Class/Year dynamic mapping

export interface AcademicLevelConfig {
  label: string;
  grades: string[];
  isFreeText?: boolean;
}

export const ACADEMIC_LEVEL_GRADE_MAP: Record<string, AcademicLevelConfig> = {
  'Pre Primary': {
    label: 'Pre Primary',
    grades: ['Play Group', 'PP1', 'PP2'],
  },
  'Lower Primary': {
    label: 'Lower Primary',
    grades: ['Grade 1', 'Grade 2', 'Grade 3'],
  },
  'Upper Primary': {
    label: 'Upper Primary',
    grades: ['Grade 4', 'Grade 5', 'Grade 6'],
  },
  'Junior Secondary School': {
    label: 'Junior Secondary School',
    grades: ['Grade 7', 'Grade 8', 'Grade 9'],
  },
  'Senior School': {
    label: 'Senior School',
    grades: ['Grade 10', 'Grade 11', 'Grade 12'],
  },
  'Secondary School': {
    label: 'Secondary School',
    grades: ['Form 3', 'Form 4'],
  },
  'Tertiary': {
    label: 'Tertiary',
    grades: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
  },
  'Special School': {
    label: 'Special School',
    grades: [],
    isFreeText: true,
  },
};

export const ACADEMIC_LEVELS = Object.keys(ACADEMIC_LEVEL_GRADE_MAP);

// Progression mapping: current grade → { nextGrade, nextLevel }
export const GRADE_PROGRESSION_MAP: Record<string, { nextGrade: string; nextLevel: string } | 'graduated'> = {
  // Pre Primary
  'Play Group': { nextGrade: 'PP1', nextLevel: 'Pre Primary' },
  'PP1': { nextGrade: 'PP2', nextLevel: 'Pre Primary' },
  'PP2': { nextGrade: 'Grade 1', nextLevel: 'Lower Primary' },
  // Lower Primary
  'Grade 1': { nextGrade: 'Grade 2', nextLevel: 'Lower Primary' },
  'Grade 2': { nextGrade: 'Grade 3', nextLevel: 'Lower Primary' },
  'Grade 3': { nextGrade: 'Grade 4', nextLevel: 'Upper Primary' },
  // Upper Primary
  'Grade 4': { nextGrade: 'Grade 5', nextLevel: 'Upper Primary' },
  'Grade 5': { nextGrade: 'Grade 6', nextLevel: 'Upper Primary' },
  'Grade 6': { nextGrade: 'Grade 7', nextLevel: 'Junior Secondary School' },
  // Junior Secondary
  'Grade 7': { nextGrade: 'Grade 8', nextLevel: 'Junior Secondary School' },
  'Grade 8': { nextGrade: 'Grade 9', nextLevel: 'Junior Secondary School' },
  'Grade 9': { nextGrade: 'Grade 10', nextLevel: 'Senior School' },
  // Senior School
  'Grade 10': { nextGrade: 'Grade 11', nextLevel: 'Senior School' },
  'Grade 11': { nextGrade: 'Grade 12', nextLevel: 'Senior School' },
  'Grade 12': { nextGrade: '1st Year', nextLevel: 'Tertiary' },
  // Secondary School
  'Form 3': { nextGrade: 'Form 4', nextLevel: 'Secondary School' },
  'Form 4': { nextGrade: '1st Year', nextLevel: 'Tertiary' },
  // Tertiary
  '1st Year': { nextGrade: '2nd Year', nextLevel: 'Tertiary' },
  '2nd Year': { nextGrade: '3rd Year', nextLevel: 'Tertiary' },
  '3rd Year': { nextGrade: '4th Year', nextLevel: 'Tertiary' },
  '4th Year': 'graduated',
};

// Get the academic level that a grade belongs to
export function getLevelForGrade(grade: string): string | null {
  for (const [level, config] of Object.entries(ACADEMIC_LEVEL_GRADE_MAP)) {
    if (config.grades.includes(grade)) return level;
  }
  return null;
}

// Get next grade info for a beneficiary
export function getNextGradeInfo(currentGrade: string | null): { nextGrade: string; nextLevel: string } | 'graduated' | null {
  if (!currentGrade) return null;
  return GRADE_PROGRESSION_MAP[currentGrade] || null;
}

// Calculate years remaining until graduation
export function getYearsToGraduation(currentGrade: string | null): number | null {
  if (!currentGrade) return null;
  let grade = currentGrade;
  let years = 0;
  const maxIterations = 20;
  
  while (years < maxIterations) {
    const next = GRADE_PROGRESSION_MAP[grade];
    if (!next) return null;
    if (next === 'graduated') return years;
    years++;
    grade = next.nextGrade;
  }
  return null;
}

// Get all grades in order for timeline display
export function getAllGradesInOrder(): string[] {
  const ordered: string[] = [];
  // Pre Primary through Senior School (CBC pathway)
  const cbcLevels = ['Pre Primary', 'Lower Primary', 'Upper Primary', 'Junior Secondary School', 'Senior School', 'Tertiary'];
  for (const level of cbcLevels) {
    ordered.push(...(ACADEMIC_LEVEL_GRADE_MAP[level]?.grades || []));
  }
  return ordered;
}
