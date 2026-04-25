export type RelationshipType =
  | 'parent_child'
  | 'child_parent'
  | 'spouse'
  | 'sibling'
  | 'grandparent_grandchild'
  | 'grandchild_grandparent'
  | 'aunt_uncle_niece_nephew'
  | 'niece_nephew_aunt_uncle'
  | 'guardian_ward'
  | 'ward_guardian'
  | 'other_family';

export const HOUSEHOLD_RELATIONSHIP_TYPES: RelationshipType[] = [
  'parent_child',
  'child_parent',
  'spouse',
  'sibling',
  'grandparent_grandchild',
  'grandchild_grandparent',
  'guardian_ward',
  'ward_guardian',
];

export function isHouseholdRelationship(type: string): boolean {
  return HOUSEHOLD_RELATIONSHIP_TYPES.includes(type as RelationshipType);
}

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  parent_child: 'Parent of',
  child_parent: 'Child of',
  spouse: 'Spouse of',
  sibling: 'Sibling of',
  grandparent_grandchild: 'Grandparent of',
  grandchild_grandparent: 'Grandchild of',
  aunt_uncle_niece_nephew: 'Aunt/Uncle of',
  niece_nephew_aunt_uncle: 'Niece/Nephew of',
  guardian_ward: 'Guardian of',
  ward_guardian: 'Ward of',
  other_family: 'Family member of',
};

export const INVERSE_RELATIONSHIPS: Record<RelationshipType, RelationshipType> = {
  parent_child: 'child_parent',
  child_parent: 'parent_child',
  spouse: 'spouse',
  sibling: 'sibling',
  grandparent_grandchild: 'grandchild_grandparent',
  grandchild_grandparent: 'grandparent_grandchild',
  aunt_uncle_niece_nephew: 'niece_nephew_aunt_uncle',
  niece_nephew_aunt_uncle: 'aunt_uncle_niece_nephew',
  guardian_ward: 'ward_guardian',
  ward_guardian: 'guardian_ward',
  other_family: 'other_family',
};

export interface RelationshipChoice {
  type: RelationshipType;
  label: string;
}

// Visual button grid (3 rows). Maps the user-facing label to an A→B relationship type.
export const RELATIONSHIP_PICKER: RelationshipChoice[] = [
  { type: 'parent_child', label: 'Parent' },
  { type: 'child_parent', label: 'Child' },
  { type: 'spouse', label: 'Spouse' },
  { type: 'sibling', label: 'Sibling' },
  { type: 'grandparent_grandchild', label: 'Grandparent' },
  { type: 'grandchild_grandparent', label: 'Grandchild' },
  { type: 'guardian_ward', label: 'Guardian' },
  { type: 'ward_guardian', label: 'Ward' },
  { type: 'aunt_uncle_niece_nephew', label: 'Aunt/Uncle' },
  { type: 'niece_nephew_aunt_uncle', label: 'Niece/Nephew' },
  { type: 'other_family', label: 'Other family' },
];

export function suggestHouseholdName(lastName?: string | null, county?: string | null): string {
  if (lastName && lastName.trim()) return `${lastName.trim()} Family`;
  if (county && county.trim()) return `${county.trim()} Household`;
  return 'New household';
}