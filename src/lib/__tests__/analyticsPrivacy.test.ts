import { describe, expect, it } from 'vitest';
import { cellIsUnsafe, distinctPeople, protectPartition, validatedCellSize } from '../../../supabase/functions/_shared/analyticsPrivacy';

describe('analytics disclosure protection', () => {
  it('defaults to five and rejects weakening the threshold', () => { expect(validatedCellSize(undefined)).toBe(5); expect(validatedCellSize(3)).toBe(5); expect(validatedCellSize(10)).toBe(10); });
  it('hides a cell with n=3 including its percentage', () => {
    const cells = protectPartition([{ value: 30, n: 3 }, { value: 70, n: 7 }], 10, 5);
    expect(cells[0].value).toBeNull(); expect(cells[0].n).toBeNull(); expect(cells[0].note).toContain('minimum cell size 5');
    expect(cells[1].value).toBeNull();
  });
  it('prevents complementary disclosure', () => expect(cellIsUnsafe(8, 10, 5)).toBe(true));
  it('permits cells where both groups have at least five', () => expect(protectPartition([{ value: 50, n: 5 }, { value: 50, n: 5 }], 10, 5)[0].value).toBe(50));
  it('counts people once despite multiple participation records', () => expect(distinctPeople([{ id: '1', beneficiary_id: 'a' }, { id: '2', beneficiary_id: 'a' }, { id: '3', beneficiary_id: 'b' }])).toHaveLength(2));
  it('fails closed when cell denominators are unavailable', () => expect(protectPartition([{ value: 99 }], 100, 5)[0].value).toBeNull());
});