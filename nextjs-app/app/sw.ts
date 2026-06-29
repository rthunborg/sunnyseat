/// <reference lib="webworker" />
//
// Serwist service worker source (Story 7.3 Task 2.1). Bundled by
// `@serwist/turbopack` (esbuild) and served from `app/serwist/[path]/route.ts`
// at `/serwist/sw.js`; it is NOT compiled into the app bundle (referenced by
// string path, not imported), so it is excluded from the main `tsconfig.json`.
//
// App-shell precaching ONLY: the precache manifest (`self.__SW_MANIFEST`,
// injected by Serwist at build time) carries the Next build output — HTML,
// CSS, JS, fonts — plus the `/` shell document added via
// `additionalPrecacheEntries`. There is deliberately NO `runtimeCaching`:
// venue data and sun predictions are real-time and must never be served from
// a stale cache (AC2/AC3, architecture.md §PWA). Cache invalidation on new
// deployments is handled by the precache revision keyed to the build (see the
// route handler).

import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
});

serwist.addEventListeners();
