'use client';

import type { ReactNode } from 'react';
import { MapInstanceProvider } from '@/lib/contexts/MapInstanceContext';
import { MapSelectionProvider } from '@/lib/contexts/MapSelectionContext';
import { TimeProvider } from '@/lib/contexts/TimeContext';
import { GeolocationProvider } from '@/hooks/useGeolocation';

/**
 * Mounts the cross-cutting client contexts in the order prescribed by
 * `_bmad-output/planning-artifacts/architecture.md` §"Context Provider
 * Nesting Order": Geolocation > MapInstance > MapSelection > Time.
 *
 * `MapInstance` wraps `MapSelection` so visual children (pin layer,
 * controls) can read the map ref while pin selection updates are scoped
 * to the inner provider's consumers.
 *
 * Lives in its own shim because these providers must sit INSIDE
 * `NextIntlClientProvider` (mounted in `app/[locale]/layout.tsx`) —
 * they cannot be folded into `app/providers.tsx`, which hosts
 * `QueryClientProvider` at the root outside the `[locale]` segment.
 *
 * Resolved provider tree:
 *   Query → Language → Geolocation → MapInstance → MapSelection → Time → children
 */
export function AppContextProviders({ children }: { children: ReactNode }) {
  return (
    <GeolocationProvider>
      <MapInstanceProvider>
        <MapSelectionProvider>
          <TimeProvider>{children}</TimeProvider>
        </MapSelectionProvider>
      </MapInstanceProvider>
    </GeolocationProvider>
  );
}
