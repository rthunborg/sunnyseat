'use client';

import { useEffect, useState } from 'react';

/**
 * Reports the browser's connectivity using `navigator.onLine` plus the
 * `online`/`offline` window events (Story 7.3 Task 4.1).
 *
 * SSR-safe: the initial value is `true` so a connected user never sees the
 * offline shell flash before hydration. The first client effect immediately
 * re-syncs from `navigator.onLine`, so a device that was already offline at
 * mount resolves to `false` within the first commit.
 *
 * `navigator.onLine` is a coarse signal (it only proves the browser has *a*
 * network interface, not reachability), which is exactly what the offline
 * shell needs: it gates whether to attempt the venue/sun fetch at all. Real
 * reachability is still validated by the TanStack Query layer, which pauses
 * its fetches while offline and resumes them when the `online` event fires.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const sync = () => setIsOnline(navigator.onLine);
    // Re-sync immediately in case the browser was offline at mount, before
    // any `online`/`offline` event has fired.
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
