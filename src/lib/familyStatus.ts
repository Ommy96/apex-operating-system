export const FAMILY_STATUS = {
  SINGLE_PARENT: 'Single parent', BOTH_PRESENT: 'Both parents present', BOTH_ABSENT: 'Both parents absent',
  EXTENDED: 'Extended family guardian', CHILD_HEADED: 'Child-headed household', INSTITUTIONAL: 'Institutional care', INDEPENDENT: 'Independent adult',
} as const;
export const DEFAULT_FAMILY_STATUSES = Object.values(FAMILY_STATUS);
const aliases: Record<string, string> = {
  'single orphan': FAMILY_STATUS.SINGLE_PARENT, 'single mother': FAMILY_STATUS.SINGLE_PARENT, 'single father': FAMILY_STATUS.SINGLE_PARENT,
  'double orphan': FAMILY_STATUS.BOTH_ABSENT, orphan: FAMILY_STATUS.BOTH_ABSENT, 'guardian-led': FAMILY_STATUS.EXTENDED, 'child-headed': FAMILY_STATUS.CHILD_HEADED,
};
export function normaliseFamilyStatus(value?: string | null) {
  const trimmed = value?.trim() || '';
  return aliases[trimmed.toLowerCase()] || DEFAULT_FAMILY_STATUSES.find(v => v.toLowerCase() === trimmed.toLowerCase()) || trimmed;
}
export function familyStatusOptions(custom: string[] = [], current?: string | null) {
  return [...new Set([...DEFAULT_FAMILY_STATUSES, ...custom, ...(current ? [normaliseFamilyStatus(current)] : [])].map(normaliseFamilyStatus).filter(Boolean))];
}
export const FAMILY_DETAIL_FIELDS: Record<string, Array<{ key: string; label: string }>> = {
  [FAMILY_STATUS.SINGLE_PARENT]: [{ key: 'parent_absence_context', label: 'Reason for parent’s absence (optional)' }],
  [FAMILY_STATUS.BOTH_PRESENT]: [],
  [FAMILY_STATUS.BOTH_ABSENT]: [{ key: 'parent_absence_context', label: 'Reason for parents’ absence (optional)' }, { key: 'support_network', label: 'Available family support (optional)' }],
  [FAMILY_STATUS.EXTENDED]: [{ key: 'support_network', label: 'Family support arrangements (optional)' }],
  [FAMILY_STATUS.CHILD_HEADED]: [{ key: 'dependent_details', label: 'Children / dependants in the household (optional)' }, { key: 'support_network', label: 'Trusted adult or support network (optional)' }],
  [FAMILY_STATUS.INSTITUTIONAL]: [{ key: 'placement_context', label: 'Living / placement arrangements (optional)' }],
  [FAMILY_STATUS.INDEPENDENT]: [],
};
export function hasHiddenFamilyDetails(details: Record<string, unknown>, status: string) {
  const visible = new Set((FAMILY_DETAIL_FIELDS[normaliseFamilyStatus(status)] || []).map(f => f.key));
  return Object.entries(details).some(([key, value]) => key !== 'legacy_family_status' && !visible.has(key) && !!value);
}