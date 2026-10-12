import { describe, it, expect } from 'vitest';
import { normaliseCareArrangement, isUnderGuardianCare } from '../careArrangement';

describe('care arrangement normalisation', () => {
  it('maps legacy / mis-cased guardian values to under_guardian_care', () => {
    expect(normaliseCareArrangement('Under guardian care')).toBe('under_guardian_care');
    expect(normaliseCareArrangement('under_parental_guardian_care')).toBe('under_guardian_care');
    expect(normaliseCareArrangement('Under Parental / Guardian Care')).toBe('under_guardian_care');
  });
  it('treats empty or unknown values as unknown, not guardian care', () => {
    expect(normaliseCareArrangement(null)).toBe('unknown');
    expect(isUnderGuardianCare('independent')).toBe(false);
  });
});
