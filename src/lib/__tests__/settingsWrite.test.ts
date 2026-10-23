import { describe, it, expect } from 'vitest';
import { ensureWritten } from '../settingsWrite';

describe('ensureWritten', () => {
  it('throws when RLS filtered the update to zero rows (no error returned)', () => {
    expect(() => ensureWritten({ data: [], error: null }, 'Branding')).toThrow(/Branding wasn't saved/);
  });

  it('throws the database error when one is returned', () => {
    expect(() => ensureWritten({ data: null, error: { message: 'boom' } }, 'X')).toThrow();
  });

  it('returns the written rows when at least one row changed', () => {
    expect(ensureWritten({ data: [{ id: 'a' }], error: null }, 'X')).toHaveLength(1);
  });
});
