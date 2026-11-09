export const DEFAULT_CELL_SIZE = 5;
export function validatedCellSize(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 5 && value <= 100 ? value : DEFAULT_CELL_SIZE;
}
export function cellIsUnsafe(n: number | null | undefined, total: number | null | undefined, minimum = DEFAULT_CELL_SIZE): boolean {
  if (n == null || !Number.isFinite(n)) return true;
  return n > 0 && (n < minimum || (total != null && total > n && total - n < minimum));
}
export function distinctPeople<T extends { beneficiary_id?: string | null; id?: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter(r => { const key = r.beneficiary_id ?? r.id; if (!key || seen.has(key)) return false; seen.add(key); return true; });
}
/** Suppress whole partitions when a cell is unsafe, preventing subtraction from totals. */
export function protectPartition<T extends { value: number | null; n?: number | null; note?: string }>(rows: T[], total: number | null, minimum: number): T[] {
  const hide = rows.some(r => cellIsUnsafe(r.n, total, minimum));
  return rows.map(r => hide ? { ...r, value: null, n: null, note: `Suppressed: minimum cell size ${minimum}; complementary cells hidden to prevent inference.` } : r);
}