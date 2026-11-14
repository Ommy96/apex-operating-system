import { describe, expect, it } from 'vitest';
import { shouldShowSyncIndicator } from '../syncIndicator';

const quiet = { isOnline: true, isSyncing: false, pending: 0, failed: 0, conflicts: 0 };
describe('global sync visibility', () => {
  it('hides when online with no work, failures or conflicts', () => {
    expect(shouldShowSyncIndicator(quiet)).toBe(false);
  });
  it.each([
    { isOnline: false }, { isSyncing: true }, { pending: 1 }, { failed: 1 }, { conflicts: 1 },
  ])('shows immediately for %j', change => {
    expect(shouldShowSyncIndicator({ ...quiet, ...change })).toBe(true);
  });
});