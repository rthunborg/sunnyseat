'use client';

import { useEffect } from 'react';

/**
 * Story 9.5 AC4(c) — recover from the service-worker stale-shell window.
 *
 * The Serwist SW (`app/sw.ts`, Story 7.3) uses `skipWaiting()` + `clientsClaim()`,
 * so a freshly-deployed SW takes control of an already-open tab the moment it
 * activates — firing `navigator.serviceWorker`'s `controllerchange` event. Until
 * the page reloads, that tab is still running the OLD precached shell (and old
 * JS chunks), which can surface a `ChunkLoadError` when it lazily imports a chunk
 * the new deploy renamed. This handler reloads the page ONCE on the first
 * `controllerchange` so the fresh shell + chunks are served.
 *
 * Reload-loop guard: a module-level `refreshing` latch ensures only the FIRST
 * controllerchange triggers a reload. A second activation in the same document
 * lifetime is ignored (without the guard, a SW that re-claims could ping-pong
 * reloads). The handler is a no-op when there is no controller yet (the very
 * first install, where nothing stale is being served) and when
 * `navigator.serviceWorker` is unavailable (SSR / unsupported browsers / dev,
 * where the SW is disabled).
 *
 * Returns a cleanup function that detaches the listener.
 */
export function registerServiceWorkerUpdateReload(): () => void {
  if (
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !navigator.serviceWorker
  ) {
    return () => {};
  }

  // Only arm the reload once a controller is already in charge — on the very
  // first install there is no stale shell to replace, so the initial
  // controllerchange (no prior controller) must NOT reload.
  const hadControllerAtArm = Boolean(navigator.serviceWorker.controller);

  let refreshing = false;
  const onControllerChange = () => {
    // First install (no prior controller): nothing stale to swap; skip.
    if (!hadControllerAtArm) return;
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
  return () => {
    navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  };
}

/**
 * React-effect wrapper so the SW-update reload handler is registered for the
 * lifetime of a mounted client component (e.g. inside `ServiceWorkerProvider`).
 */
export function useServiceWorkerUpdateReload(): void {
  useEffect(() => {
    return registerServiceWorkerUpdateReload();
  }, []);
}
