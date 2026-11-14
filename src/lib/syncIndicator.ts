export const FIELD_MODE_TAB = { DASHBOARD: 'dashboard', COLLECT: 'collect', SYNC: 'sync' } as const;
export const FIELD_MODE_SYNC_URL = `/field-mode?tab=${FIELD_MODE_TAB.SYNC}`;
export const SYNC_CONFLICT_RESOLUTION = { PENDING: 'pending' } as const;

export interface SyncIndicatorState {
  isOnline: boolean;
  isSyncing: boolean;
  pending: number;
  failed: number;
  conflicts?: number;
}

export function shouldShowSyncIndicator({ isOnline, isSyncing, pending, failed, conflicts = 0 }: SyncIndicatorState) {
  return !isOnline || isSyncing || pending > 0 || failed > 0 || conflicts > 0;
}