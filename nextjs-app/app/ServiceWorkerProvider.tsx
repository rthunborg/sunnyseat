'use client';

import type { ReactNode } from 'react';
import { SerwistProvider } from '@serwist/turbopack/react';

/**
 * Client boundary for Serwist's service-worker registration (Story 7.3 AC2).
 *
 * `@serwist/turbopack/react` calls `createContext` at module scope but does
 * NOT ship a `'use client'` directive, so importing it straight into the
 * server-component root layout crashes with "createContext is not a function".
 * This module carries the directive so the provider is only ever evaluated in
 * a client module.
 *
 * Registration is disabled in development so Turbopack HMR is never
 * intercepted by a stale service worker; `swUrl` matches the
 * `app/serwist/[path]` route, whose `Service-Worker-Allowed: /` header lets
 * the SW claim the root scope even though it is served from a sub-path.
 */
export function ServiceWorkerProvider({ children }: { children: ReactNode }) {
  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={process.env.NODE_ENV === 'development'}
    >
      {children}
    </SerwistProvider>
  );
}
