'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { GOTHENBURG_CENTRE } from '@/lib/constants/geography';
import { ONBOARDED_FLAG_KEY } from '@/lib/constants/onboarding';

export type GeolocationStatus = 'idle' | 'pending' | 'success' | 'fallback';
export type GeolocationCoords = { lat: number; lng: number };

export type UseGeolocationResult = {
  status: GeolocationStatus;
  coords: GeolocationCoords;
  requestLocation: () => void;
  useCentrum: () => void;
};

const POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8_000,
  maximumAge: 60_000,
};

const isDev = process.env.NODE_ENV !== 'production';

const fallbackCoords: GeolocationCoords = {
  lat: GOTHENBURG_CENTRE.lat,
  lng: GOTHENBURG_CENTRE.lng,
};

function hasGeolocation(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'geolocation' in navigator &&
    navigator.geolocation != null
  );
}

const GeolocationContext = createContext<UseGeolocationResult | null>(null);

/**
 * Browser-geolocation hook with privacy-aware fallback to Gothenburg centrum.
 *
 * Status transitions: `idle` → `pending` → (`success` | `fallback`). Never
 * reverts to `idle`. `coords` is always defined; before any user action it
 * equals `GOTHENBURG_CENTRE` (so consumers like `useVenueSearch` can run
 * immediately without waiting for permission).
 *
 * Returning users (localStorage flag set + `permissions.query` returns
 * `granted`) get a silent re-acquire on mount — no permission dialog,
 * matching the "Platsen sparas aldrig" privacy promise (no cached coords).
 */
export function GeolocationProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [coords, setCoords] = useState<GeolocationCoords>(fallbackCoords);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetStatus = useCallback((next: GeolocationStatus) => {
    if (isMountedRef.current) setStatus(next);
  }, []);
  const safeSetCoords = useCallback((next: GeolocationCoords) => {
    if (isMountedRef.current) setCoords(next);
  }, []);

  // Internally named `selectCentrum` so ESLint's `react-hooks/rules-of-hooks`
  // doesn't flag invocations as illegal hook calls. Exposed publicly as
  // `useCentrum` to match the documented hook API.
  const selectCentrum = useCallback(() => {
    requestIdRef.current += 1;
    safeSetCoords(fallbackCoords);
    safeSetStatus('fallback');
  }, [safeSetCoords, safeSetStatus]);

  const requestLocation = useCallback(() => {
    if (!hasGeolocation()) {
      selectCentrum();
      return;
    }
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    safeSetStatus('pending');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (requestIdRef.current !== requestId) return;
        safeSetCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        safeSetStatus('success');
      },
      (error) => {
        if (requestIdRef.current !== requestId) return;
        if (isDev) {
          // eslint-disable-next-line no-console
          console.warn(
            '[useGeolocation] falling back to Gothenburg centrum:',
            error.code,
            error.message,
          );
        }
        selectCentrum();
      },
      POSITION_OPTIONS,
    );
  }, [safeSetCoords, safeSetStatus, selectCentrum]);

  // Returning-user auto-request: localStorage flag + granted permission →
  // silent re-acquire. Anything else → centrum fallback without prompting.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    // Safari private mode and partitioned-storage contexts raise
    // `SecurityError` on `getItem`. Treat any throw as "not onboarded"
    // so the auto-acquire path bails silently rather than crashing the
    // hook on first paint.
    let flagSet = false;
    try {
      flagSet = localStorage.getItem(ONBOARDED_FLAG_KEY) === '1';
    } catch {
      flagSet = false;
    }
    if (!flagSet) return;

    let cancelled = false;

    let permissionStatus: PermissionStatus | null = null;
    const handlePermissionChange = () => {
      if (!permissionStatus) return;
      if (permissionStatus.state === 'granted') {
        requestLocation();
      } else if (permissionStatus.state === 'denied') {
        selectCentrum();
      }
    };

    (async () => {
      try {
        if (typeof navigator === 'undefined' || !navigator.permissions) {
          selectCentrum();
          return;
        }
        const result = await navigator.permissions.query({ name: 'geolocation' });
        if (cancelled) return;
        permissionStatus = result;
        permissionStatus.addEventListener?.('change', handlePermissionChange);
        if (result.state === 'granted') {
          requestLocation();
        } else {
          selectCentrum();
        }
      } catch {
        if (!cancelled) selectCentrum();
      }
    })();

    return () => {
      cancelled = true;
      permissionStatus?.removeEventListener?.('change', handlePermissionChange);
    };
  }, [requestLocation, selectCentrum]);

  const value = useMemo<UseGeolocationResult>(
    () => ({ status, coords, requestLocation, useCentrum: selectCentrum }),
    [status, coords, requestLocation, selectCentrum],
  );

  return <GeolocationContext.Provider value={value}>{children}</GeolocationContext.Provider>;
}

export function useGeolocation(): UseGeolocationResult {
  const ctx = useContext(GeolocationContext);
  if (!ctx) {
    throw new Error('useGeolocation must be used within <GeolocationProvider>');
  }
  return ctx;
}
