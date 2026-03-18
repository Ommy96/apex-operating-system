import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import {
  getAllRecords,
  getRecordsByStatus,
  updateRecordStatus,
  saveOfflineRecord,
  clearSyncedRecords,
  OfflineRecord,
  SyncStatus,
} from "@/lib/offlineStorage";
import {
  registerBackgroundSync,
  requestPersistentStorage,
} from "@/lib/serviceWorkerRegistration";
import { toast } from "sonner";

export interface SyncStats {
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  total: number;
}

export function useOfflineSync() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [records, setRecords] = useState<OfflineRecord[]>([]);
  const [stats, setStats] = useState<SyncStats>({ pending: 0, syncing: 0, synced: 0, failed: 0, total: 0 });
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshRecords = useCallback(async () => {
    try {
      const all = await getAllRecords();
      setRecords(all);
      const pending = all.filter(r => r.status === 'pending').length;
      const syncing = all.filter(r => r.status === 'syncing').length;
      const synced = all.filter(r => r.status === 'synced').length;
      const failed = all.filter(r => r.status === 'failed').length;
      setStats({ pending, syncing, synced, failed, total: all.length });
    } catch {
      // IndexedDB may not be available
    }
  }, []);

  // Initial load + request persistent storage
  useEffect(() => {
    refreshRecords();
    requestPersistentStorage();
  }, [refreshRecords]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); toast.success("You're back online!"); };
    const handleOffline = () => { setIsOnline(false); toast.info("You're offline. Data will be saved locally."); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when online
  useEffect(() => {
    if (isOnline && !isSyncing) {
      syncIntervalRef.current = setInterval(() => {
        syncAll();
      }, 30000); // every 30s
    }
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [isOnline, isSyncing]);

  // Trigger sync when coming back online
  useEffect(() => {
    if (isOnline && stats.pending > 0) {
      syncAll();
    }
  }, [isOnline]);

  const syncRecord = async (record: OfflineRecord): Promise<boolean> => {
    try {
      await updateRecordStatus(record.id, 'syncing');

      if (record.type === 'beneficiary') {
        const { error } = await supabase.from('beneficiaries').insert({
          ...record.data,
          organization_id: record.organizationId,
          created_by: record.userId,
        });
        if (error) throw error;
      } else if (record.type === 'observation') {
        // Extract visitation-specific fields prefixed with _
        const { _visit_type, _reason_for_visit, _challenges_identified, _location, ...observationData } = record.data;

        // Save to program_observations (displayed in Program Dashboard & Beneficiary Profile)
        const { error: obsError } = await supabase.from('program_observations').insert({
          beneficiary_id: observationData.beneficiary_id || null,
          program_id: observationData.program_id || null,
          observation_date: observationData.observation_date,
          observation_category: observationData.observation_category || 'progress',
          narrative_notes: observationData.narrative_notes || '',
          recommended_action: observationData.recommended_action || null,
          status: observationData.status || 'open',
          organization_id: record.organizationId,
          created_by: record.userId,
        });
        if (obsError) throw obsError;

        // Also save a beneficiary visitation record if there's a beneficiary
        if (observationData.beneficiary_id) {
          try {
            await supabase.from('beneficiary_visitations').insert({
              beneficiary_id: observationData.beneficiary_id,
              visit_type: _visit_type || 'field_visit',
              visit_date: observationData.observation_date,
              observation_findings: observationData.narrative_notes || null,
              challenges_identified: _challenges_identified || null,
              recommendations: observationData.recommended_action || null,
              reason_for_visit: _reason_for_visit || null,
              location: _location || null,
              organization_id: record.organizationId,
              created_by: record.userId,
            });
          } catch {
            // Non-fatal if visitation insert fails
          }
        }
      } else if (record.type === 'attachment') {
        // Upload file blob to storage
        const { fileData, fileName, bucket, path } = record.data;
        const blob = new Blob([Uint8Array.from(atob(fileData), c => c.charCodeAt(0))]);
        const { error } = await supabase.storage.from(bucket || 'child-photos').upload(path || `field/${Date.now()}_${fileName}`, blob);
        if (error) throw error;
      }

      await updateRecordStatus(record.id, 'synced');
      return true;
    } catch (err: any) {
      await updateRecordStatus(record.id, 'failed', err.message);
      return false;
    }
  };

  const syncAll = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    try {
      const pending = await getRecordsByStatus('pending');
      const failed = await getRecordsByStatus('failed');
      const toSync = [...pending, ...failed.filter(r => r.retryCount < 3)];

      if (toSync.length === 0) { setIsSyncing(false); return; }

      let successCount = 0;
      let failCount = 0;

      for (const record of toSync) {
        const success = await syncRecord(record);
        if (success) successCount++;
        else failCount++;
      }

      if (successCount > 0) toast.success(`Synced ${successCount} record(s)`);
      if (failCount > 0) toast.error(`${failCount} record(s) failed to sync`);
    } finally {
      setIsSyncing(false);
      refreshRecords();
    }
  };

  const retryFailed = async () => {
    const failed = await getRecordsByStatus('failed');
    for (const r of failed) {
      await updateRecordStatus(r.id, 'pending');
    }
    await refreshRecords();
    if (isOnline) syncAll();
  };

  const addRecord = async (type: OfflineRecord['type'], data: any) => {
    if (!user?.id || !orgId) return;
    const record: OfflineRecord = {
      id: crypto.randomUUID(),
      type,
      data,
      status: 'pending',
      createdAt: new Date().toISOString(),
      retryCount: 0,
      organizationId: orgId,
      userId: user.id,
    };
    await saveOfflineRecord(record);
    await refreshRecords();

    // If online, sync immediately; otherwise register background sync
    if (isOnline) {
      syncAll();
    } else {
      registerBackgroundSync('offline-sync');
    }
  };

  const cleanSynced = async () => {
    await clearSyncedRecords();
    await refreshRecords();
    toast.success("Cleared synced records");
  };

  return {
    isOnline,
    isSyncing,
    records,
    stats,
    addRecord,
    syncAll,
    retryFailed,
    cleanSynced,
    refreshRecords,
  };
}
