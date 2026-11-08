import { describe, expect, it } from 'vitest';
import { isCareUnset, minorWithoutGuardian, qualityConfigSchema, qualityIssueIdentity, qualityTemplateSchema } from '../dataQuality';

describe('data quality rules', () => {
  it('keeps the same rule/record identity across scans', () => {
    expect(qualityIssueIdentity('rule-a', 'record-a')).toBe('rule-a:record-a');
    expect(qualityIssueIdentity('rule-a', 'record-b')).not.toBe(qualityIssueIdentity('rule-a', 'record-a'));
  });
  it('rejects arbitrary rule code', () => expect(qualityTemplateSchema.safeParse('select * from beneficiaries').success).toBe(false));
  it('rejects unrestricted queries in configurations', () => expect(qualityConfigSchema.safeParse({ query: 'select * from beneficiaries' }).success).toBe(false));
  it('validates project scopes', () => {
    expect(qualityConfigSchema.safeParse({ project_id: 'not-a-uuid' }).success).toBe(false);
    expect(qualityConfigSchema.parse({ project_id: '00000000-0000-4000-8000-000000000001' }).project_id).toBe('00000000-0000-4000-8000-000000000001');
  });
  it('flags unset care using shared normalization', () => { expect(isCareUnset(null)).toBe(true); expect(isCareUnset(' UNDER GUARDIAN CARE ')).toBe(false); });
  it('flags minors missing guardians, not adults or unknown ages', () => {
    const today = new Date('2026-11-08T20:40:00Z');
    expect(minorWithoutGuardian('2008-11-09', 0, today)).toBe(true);
    expect(minorWithoutGuardian('2008-11-08', 0, today)).toBe(false);
    expect(minorWithoutGuardian('2016-01-01', 1, today)).toBe(false);
    expect(minorWithoutGuardian(null, 0, today)).toBe(false);
  });
});