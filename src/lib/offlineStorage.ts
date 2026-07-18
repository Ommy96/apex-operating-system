/**
 * IndexedDB-based offline storage for field data collection.
 * Stores beneficiary registrations, observations, and attachments
 * when the device is offline, and provides them for sync when online.
 */

// Keep the IndexedDB name stable to preserve existing offline data on user devices.
const DB_NAME = 'apexos_offline';
// v2 adds: conflicts store, cached_scope store, attendance/form/gps/visit types
const DB_VERSION = 2;

export type OfflineRecordType =
  | 'beneficiary'
  | 'observation'
  | 'attachment'
  | 'attendance'
  | 'form_submission'
  | 'gps_point'
  | 'visit'
  | 'home_visit'
  | 'school_visit'
  | 'field_log';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export interface OfflineRecord {
  id: string;
  type: OfflineRecordType;
  data: any;
  status: SyncStatus;
  createdAt: string;
  syncedAt?: string;
  errorMessage?: string;
  retryCount: number;
  nextRetryAt?: string;
  organizationId: string;
  userId: string;
}

export interface ConflictEntry {
  id: string;
  recordId: string;
  type: OfflineRecordType;
  detectedAt: string;
  localData: any;
  serverData?: any;
  resolution: 'pending' | 'local_wins' | 'server_wins';
  notes?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('records')) {
        const store = db.createObjectStore('records', { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains('conflicts')) {
        const c = db.createObjectStore('conflicts', { keyPath: 'id' });
        c.createIndex('recordId', 'recordId', { unique: false });
        c.createIndex('resolution', 'resolution', { unique: false });
      }
      if (!db.objectStoreNames.contains('cached_scope')) {
        // keyPath = scope key (e.g. `beneficiaries:<orgId>`)
        db.createObjectStore('cached_scope', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineRecord(record: OfflineRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readwrite');
    tx.objectStore('records').put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllRecords(): Promise<OfflineRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readonly');
    const request = tx.objectStore('records').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getRecordsByStatus(status: SyncStatus): Promise<OfflineRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readonly');
    const index = tx.objectStore('records').index('status');
    const request = index.getAll(status);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function updateRecordStatus(
  id: string,
  status: SyncStatus,
  errorMessage?: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readwrite');
    const store = tx.objectStore('records');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result as OfflineRecord;
      if (record) {
        record.status = status;
        if (status === 'synced') record.syncedAt = new Date().toISOString();
        if (errorMessage) record.errorMessage = errorMessage;
        if (status === 'failed') record.retryCount += 1;
        store.put(record);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readwrite');
    tx.objectStore('records').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearSyncedRecords(): Promise<void> {
  const synced = await getRecordsByStatus('synced');
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readwrite');
    const store = tx.objectStore('records');
    synced.forEach(r => store.delete(r.id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─────────────────────────── Backoff helpers ───────────────────────────

/**
 * Exponential backoff with jitter. retryCount 0 → ~10s, 1 → ~30s, 2 → ~90s, 3 → ~4.5m, capped at 30m.
 */
export function computeNextRetry(retryCount: number): string {
  const base = 10_000 * Math.pow(3, retryCount);
  const capped = Math.min(base, 30 * 60_000);
  const jitter = Math.random() * 5_000;
  return new Date(Date.now() + capped + jitter).toISOString();
}

export async function setRecordRetry(
  id: string,
  retryCount: number,
  errorMessage?: string,
  status: SyncStatus = 'failed',
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readwrite');
    const store = tx.objectStore('records');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const r = getReq.result as OfflineRecord | undefined;
      if (r) {
        r.status = status;
        r.retryCount = retryCount;
        r.nextRetryAt = computeNextRetry(retryCount);
        if (errorMessage) r.errorMessage = errorMessage;
        store.put(r);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─────────────────────────── Conflict log ───────────────────────────

export async function logConflict(entry: ConflictEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('conflicts', 'readwrite');
    tx.objectStore('conflicts').put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getConflicts(): Promise<ConflictEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('conflicts', 'readonly');
    const req = tx.objectStore('conflicts').getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function resolveConflict(id: string, resolution: 'local_wins' | 'server_wins', notes?: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('conflicts', 'readwrite');
    const store = tx.objectStore('conflicts');
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const c = getReq.result as ConflictEntry | undefined;
      if (c) { c.resolution = resolution; if (notes) c.notes = notes; store.put(c); }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─────────────────────────── Cached scope (offline lists) ───────────────────────────

export interface CachedScopeEntry {
  key: string;
  data: any;
  cachedAt: string;
}

export async function putCachedScope(key: string, data: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cached_scope', 'readwrite');
    tx.objectStore('cached_scope').put({ key, data, cachedAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedScope<T = any>(key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('cached_scope', 'readonly');
    const req = tx.objectStore('cached_scope').get(key);
    req.onsuccess = () => resolve(req.result ? (req.result.data as T) : null);
    req.onerror = () => reject(req.error);
  });
}

/** Compress an image file to a max dimension and quality */
export function compressImage(file: File, maxDim = 1200, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = (height / width) * maxDim; width = maxDim; }
          else { width = (width / height) * maxDim; height = maxDim; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Get current GPS coordinates */
export function captureGPS(): Promise<{ latitude: number; longitude: number; timestamp: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        timestamp: pos.timestamp,
      }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}
