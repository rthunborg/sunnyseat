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

function getSnapshot(): boolean {
  return getMediaQuery()?.matches ?? true;
}

function getFallbackSnapshot(): true {
  return true;
}

/**
 * Reactive platform reduced-motion preference. The SSR/unavailable fallback is
 * fail-closed so reduced-motion users never receive hydration-time animations
 * before matchMedia resolves.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getFallbackSnapshot);
}
