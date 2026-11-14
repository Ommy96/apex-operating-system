import { act, renderHook, waitFor, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({
  org: { organization_id: 'h2ho' },
  user: { id: 'staff-1' },
  all: vi.fn(), byStatus: vi.fn(), update: vi.fn(), insert: vi.fn(), conflicts: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/hooks/useOrganization', () => ({ useOrganization: () => ({ currentOrganization: mocks.org }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => ({ insert: mocks.insert }) } }));
vi.mock('@/lib/serviceWorkerRegistration', () => ({ requestPersistentStorage: vi.fn(), registerBackgroundSync: vi.fn() }));
vi.mock('@/lib/offlineStorage', () => ({
  getAllRecords: mocks.all, getRecordsByStatus: mocks.byStatus, updateRecordStatus: mocks.update,
  getConflicts: mocks.conflicts, saveOfflineRecord: vi.fn(), deleteRecord: vi.fn(),
  setRecordRetry: vi.fn(), logConflict: vi.fn(), resolveConflict: vi.fn(),
}));
import { OfflineSyncProvider, useOfflineSync } from '../useOfflineSync';

const record = { id: 'capture-1', type: 'beneficiary', organizationId: 'h2ho', userId: 'staff-1', status: 'failed', retryCount: 0, data: {} };
const wrapper = ({ children }: { children: ReactNode }) => <OfflineSyncProvider>{children}</OfflineSyncProvider>;

afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.org.organization_id = 'h2ho'; });

describe('shared offline sync ownership', () => {
  it('shares one state and prevents simultaneous consumers uploading the same record twice', async () => {
    mocks.all.mockResolvedValue([record]); mocks.conflicts.mockResolvedValue([]);
    mocks.byStatus.mockImplementation(async status => status === 'failed' ? [record] : []);
    let release: (() => void) | undefined;
    mocks.insert.mockImplementation(() => new Promise(resolve => { release = () => resolve({ error: null }); }));
    const { result } = renderHook(() => [useOfflineSync(), useOfflineSync()], { wrapper });
    await waitFor(() => expect(result.current[0].stats.failed).toBe(1));
    expect(result.current[0]).toBe(result.current[1]);
    let upload: Promise<void> | undefined;
    act(() => { upload = result.current[0].syncAll(); void result.current[1].syncAll(); });
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(1));
    expect(result.current[1].isSyncing).toBe(true);
    await act(async () => { release?.(); await upload; });
    expect(mocks.insert).toHaveBeenCalledTimes(1);
  });

  it('excludes another organisation and another member from counts and uploads', async () => {
    const others = [{ ...record, id: 'umazi', organizationId: 'umazi' }, { ...record, id: 'other-user', userId: 'staff-2' }];
    mocks.all.mockResolvedValue([record, ...others]); mocks.conflicts.mockResolvedValue([]);
    mocks.byStatus.mockImplementation(async status => status === 'failed' ? [record, ...others] : []);
    mocks.insert.mockResolvedValue({ error: null });
    const { result, rerender } = renderHook(() => useOfflineSync(), { wrapper });
    await waitFor(() => expect(result.current.records.map(r => r.id)).toEqual(['capture-1']));
    await act(async () => { await result.current.syncAll(); });
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    mocks.org.organization_id = 'umazi'; rerender();
    await waitFor(() => expect(result.current.records.map(r => r.id)).toEqual(['umazi']));
  });
});