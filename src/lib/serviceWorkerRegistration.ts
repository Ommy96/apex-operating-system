/**
 * Service Worker registration and background sync utilities.
 * Integrates with vite-plugin-pwa's auto-update strategy.
 */

export async function registerBackgroundSync(tag: string = 'offline-sync'): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;

    // Use Background Sync API if available
    if ('sync' in registration) {
      await (registration as any).sync.register(tag);
      console.log(`[SW] Background sync registered: ${tag}`);
      return true;
    }
  } catch (err) {
    console.warn('[SW] Background sync registration failed:', err);
  }
  return false;
}

export async function registerPeriodicSync(
  tag: string = 'periodic-sync',
  minIntervalMs: number = 60 * 60 * 1000 // 1 hour
): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;

    if ('periodicSync' in registration) {
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync' as any,
      });
      if (status.state === 'granted') {
        await (registration as any).periodicSync.register(tag, {
          minInterval: minIntervalMs,
        });
        console.log(`[SW] Periodic sync registered: ${tag}`);
        return true;
      }
    }
  } catch (err) {
    console.warn('[SW] Periodic sync registration failed:', err);
  }
  return false;
}

/** Check if the app can work offline (SW is active and content is cached) */
export async function isOfflineReady(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  return !!registration?.active;
}

/** Request persistent storage so the browser won't evict IndexedDB data */
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    const granted = await navigator.storage.persist();
    console.log(`[Storage] Persistent storage ${granted ? 'granted' : 'denied'}`);
    return granted;
  }
  return false;
}

/** Get storage usage estimate */
export async function getStorageEstimate(): Promise<{ used: number; quota: number } | null> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
    };
  }
  return null;
}
