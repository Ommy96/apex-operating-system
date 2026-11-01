import { describe, expect, it } from 'vitest';
import { FAMILY_STATUS, FAMILY_DETAIL_FIELDS, familyStatusOptions, normaliseFamilyStatus, hasHiddenFamilyDetails } from '../familyStatus';
import { useFieldVisibility } from '@/hooks/useFieldVisibility';
import { CARE_ARRANGEMENT } from '../careArrangement';

describe('separate family composition and care responsibility', () => {
  it('has the seven requested composition options', () => {
    expect(familyStatusOptions()).toEqual(['Single parent', 'Both parents present', 'Both parents absent', 'Extended family guardian', 'Child-headed household', 'Institutional care', 'Independent adult']);
  });
  it('migrates legacy labels without changing responsibility', () => {
    expect(normaliseFamilyStatus('Single orphan')).toBe(FAMILY_STATUS.SINGLE_PARENT);
    expect(normaliseFamilyStatus('Double orphan')).toBe(FAMILY_STATUS.BOTH_ABSENT);
    expect(normaliseFamilyStatus('Single mother')).toBe(FAMILY_STATUS.SINGLE_PARENT);
  });
  it('keeps organisation extensions separate', () => {
    expect(familyStatusOptions(['Kinship arrangement'])).toContain('Kinship arrangement');
    expect(familyStatusOptions()).not.toContain('Kinship arrangement');
  });
  it('preserves hidden absence notes and detects the warning condition', () => {
    const details = { parent_absence_context: 'Parent works away' };
    expect(hasHiddenFamilyDetails(details, FAMILY_STATUS.BOTH_PRESENT)).toBe(true);
    expect(hasHiddenFamilyDetails(details, FAMILY_STATUS.SINGLE_PARENT)).toBe(false);
    expect(details.parent_absence_context).toBe('Parent works away');
  });
  it('gives a 20-year-old guardian capture plus own phone and ID', () => {
    const dob = new Date(); dob.setFullYear(dob.getFullYear() - 20);
    const v = useFieldVisibility(dob.toISOString(), null, CARE_ARRANGEMENT.UNDER_GUARDIAN_CARE);
    expect(v.showGuardianSection).toBe(true); expect(v.showPhone).toBe(true); expect(v.showNationalId).toBe(true);
  });
  it('gives a 14-year-old guardian capture without own phone or ID', () => {
    const dob = new Date(); dob.setFullYear(dob.getFullYear() - 14);
    const v = useFieldVisibility(dob.toISOString(), null, CARE_ARRANGEMENT.UNDER_GUARDIAN_CARE);
    expect(v.showGuardianSection).toBe(true); expect(v.showPhone).toBe(false); expect(v.showNationalId).toBe(false);
  });
  it('keeps absence and household details optional by exposing field definitions only', () => {
    expect(FAMILY_DETAIL_FIELDS[FAMILY_STATUS.BOTH_ABSENT].map(f => f.key)).toContain('parent_absence_context');
    expect(FAMILY_DETAIL_FIELDS[FAMILY_STATUS.CHILD_HEADED].map(f => f.key)).toContain('dependent_details');
  });
});