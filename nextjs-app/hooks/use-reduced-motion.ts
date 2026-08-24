'use client';

import { useSyncExternalStore } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY);
}

function subscribe(onChange: () => void): () => void {
  const mediaQuery = getMediaQuery();
  if (!mediaQuery) return () => undefined;

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }

  mediaQuery.addListener(onChange);
  return () => mediaQuery.removeListener(onChange);
}

function getSnapshot(): boolean | null {
  return getMediaQuery()?.matches ?? null;
}

function getServerSnapshot(): null {
  return null;
}

/**
 * Reactive platform reduced-motion preference with a hydration-safe unknown
 * state. Callers retain their existing `??` fallback for first paint.
 */
export function useReducedMotion(): boolean | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
