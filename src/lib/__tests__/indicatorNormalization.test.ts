import { describe, it, expect } from 'vitest';
import { normalizeValue, aggregateNormalized } from '../indicatorNormalization';

describe('normalizeValue', () => {
  it('handles grade letters → percentage', () => {
    const map = { A: 95, B: 85, C: 75, D: 65, E: 50, F: 35 };
    expect(normalizeValue('A', 'grade_letter', map, 'percentage_0_100')).toBe(95);
    expect(normalizeValue('c', 'grade_letter', map, 'percentage_0_100')).toBe(75);
    expect(normalizeValue('Z', 'grade_letter', map, 'percentage_0_100')).toBeNull();
  });

  it('handles linear numeric mapping', () => {
    const m = { type: 'linear', from: [0, 100], to: [0, 100] } as const;
    expect(normalizeValue(50, 'numeric', m, 'percentage_0_100')).toBe(50);
    const m2 = { type: 'linear', from: [0, 50], to: [0, 100] } as const;
    expect(normalizeValue(25, 'numeric', m2, 'percentage_0_100')).toBe(50);
  });

  it('handles scale_5 dict and default', () => {
    expect(normalizeValue(3, 'scale_5', null, 'percentage_0_100')).toBe(50);
    expect(normalizeValue(5, 'scale_5', { '1': 20, '2': 40, '3': 60, '4': 80, '5': 100 }, 'percentage_0_100')).toBe(100);
  });

  it('handles percentage passthrough and clamping', () => {
    expect(normalizeValue(80, 'percentage', null, 'percentage_0_100')).toBe(80);
    expect(normalizeValue(140, 'percentage', null, 'percentage_0_100')).toBe(100);
  });

  it('handles binary input strings', () => {
    expect(normalizeValue('yes', 'binary', null, 'percentage_0_100')).toBe(100);
    expect(normalizeValue('no', 'binary', null, 'percentage_0_100')).toBe(0);
    expect(normalizeValue('', 'binary', null, 'percentage_0_100')).toBeNull();
  });

  it('returns null for missing / invalid', () => {
    expect(normalizeValue(null, 'numeric', null, 'percentage_0_100')).toBeNull();
    expect(normalizeValue('abc', 'numeric', null, 'percentage_0_100')).toBeNull();
  });

  it('converts to scale_5 normalized', () => {
    expect(normalizeValue(100, 'percentage', null, 'scale_5')).toBe(5);
    expect(normalizeValue(0, 'percentage', null, 'scale_5')).toBe(1);
  });
});

describe('aggregateNormalized', () => {
  it('weighted average ignores nulls', () => {
    const v = aggregateNormalized([
      { value: 82, weight: 60 },
      { value: 64, weight: 40 },
      { value: null, weight: 100 },
    ]);
    expect(v).toBeCloseTo(82 * 0.6 + 64 * 0.4, 5);
  });

  it('returns null when no valid values', () => {
    expect(aggregateNormalized([{ value: null }])).toBeNull();
  });
});