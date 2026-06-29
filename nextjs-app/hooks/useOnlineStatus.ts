'use client';

import { useEffect, useState } from 'react';

/**
 * Reports the browser's connectivity using `navigator.onLine` plus the
 * `online`/`offline` window events (Story 7.3 Task 4.1).
 *
 * SSR-safe: a lazy initializer reads `navigator.onLine` on the first client
 * commit, so a device that is already offline at mount renders the offline
 * shell immediately — with no one-frame flash of the online tree. On the
 * server (no `navigator`) it falls back to `true`; the sole consumer
 * (`MapView`) is `ssr:false`, and the `typeof` guard keeps the hook safe for
 * any future server-rendered caller. The effect still re-syncs once on mount
 * (covering any change between render and commit) and subscribes to the
 * `online`/`offline` events.
 *
 * `navigator.onLine` is a coarse signal (it only proves the browser has *a*
 * network interface, not reachability), which is exactly what the offline
 * shell needs: it gates whether to attempt the venue/sun fetch at all. Real
 * reachability is still validated by the TanStack Query layer, which pauses
 * its fetches while offline and resumes them when the `online` event fires.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    () => (typeof navigator !== 'undefined' ? navigator.onLine : true),
  );

  useEffect(() => {
    const sync = () => setIsOnline(navigator.onLine);
    // Re-sync once on mount in case connectivity changed between the lazy
    // initializer and this effect, before any `online`/`offline` event fired.
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  return isOnline;
}
