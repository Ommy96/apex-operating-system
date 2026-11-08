import { describe, expect, it } from 'vitest';
import { achievementPercentage, distinctBeneficiaryCount } from '../resultsFramework';
describe('Results framework rules', () => {
  it('inverts achievement for lower-is-better indicators', () => expect(achievementPercentage(20, 10, 'down_is_good')).toBe(50));
  it('keeps higher-is-better achievement', () => expect(achievementPercentage(40, 50)).toBe(80));
  it('suppresses zero targets', () => expect(achievementPercentage(20, 0)).toBeNull());
  it('suppresses unavailable denominators', () => expect(achievementPercentage(80, 100, 'up_is_good', null)).toBeNull());
  it('suppresses zero denominators', () => expect(achievementPercentage(80, 100, 'up_is_good', 0)).toBeNull());
  it('does not divide by zero for lower-is-better', () => expect(achievementPercentage(0, 10, 'down_is_good')).toBeNull());
  it('counts a beneficiary enrolled in two programmes once', () => expect(distinctBeneficiaryCount([{ beneficiary_id: 'a' }, { beneficiary_id: 'a' }, { beneficiary_id: 'b' }])).toBe(2));
});