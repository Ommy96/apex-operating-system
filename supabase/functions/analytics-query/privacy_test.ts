import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { cellIsUnsafe, distinctPeople, protectPartition, validatedCellSize } from '../_shared/analyticsPrivacy.ts';
Deno.test('n=3 percentage and complement are suppressed', () => {
  const result = protectPartition([{ value: 30, n: 3 }, { value: 70, n: 7 }], 10, 5);
  assertEquals(result.map(r => r.value), [null, null]);
  assertEquals(result.map(r => r.n), [null, null]);
});
Deno.test('minimum defaults to five and cannot be weakened', () => { assertEquals(validatedCellSize(undefined),5); assertEquals(validatedCellSize(3),5); });
Deno.test('participation deduplication counts two unique beneficiaries', () => assertEquals(distinctPeople([{ beneficiary_id:'a' },{ beneficiary_id:'a' },{ beneficiary_id:'b' }]).length,2));
Deno.test('unknown denominators fail closed', () => assertEquals(cellIsUnsafe(null,10),true));