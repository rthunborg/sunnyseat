'use client';

import { Suspense, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapInstanceProvider } from '@/lib/contexts/MapInstanceContext';
import { MapSelectionProvider } from '@/lib/contexts/MapSelectionContext';
import { TimeProvider } from '@/lib/contexts/TimeContext';
import { FavouritesProvider } from '@/lib/contexts/FavouritesContext';
import { GeolocationProvider } from '@/hooks/useGeolocation';
import { SettingsProvider } from '@/lib/contexts/SettingsContext';
import { SettingsModalRoot } from '@/components/custom/settings/SettingsModalRoot';

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
          <SettingsProvider>
            <Suspense fallback={<DefaultTimeProviders>{children}</DefaultTimeProviders>}>
              <SearchParamTimeProviders>{children}</SearchParamTimeProviders>
            </Suspense>
            {/* One mount point for the settings + app-feedback modals, openable
                from the desktop nav and the mobile map controls. */}
            <SettingsModalRoot />
          </SettingsProvider>
        </MapSelectionProvider>
      </MapInstanceProvider>
    </GeolocationProvider>
  );
}

/**
 * Reads `?_time=`/`?_date=` planner-forcing parameters from the URL — but only
 * outside production. The literal `process.env.NODE_ENV === 'production'` check
 * lets the Next.js bundler dead-code-eliminate the entire dev branch (and its
 * `useSearchParams` call) from production bundles, so no production URL can pin
 * the planner and disable the live clock. This mirrors the sibling `?_state=`
 * gate in `lib/dev/use-forced-state.ts`; see `docs/dev/state-forcing.md`.
 *
 * The branch is on a build-time constant, so selecting a different child
 * component per build does NOT violate the rules of hooks: in any given build
 * exactly one branch is reachable. The production path renders
 * `DefaultTimeProviders` (no `forcedDate`/`forcedTime`), which restores the
 * live-clock interval and normal time/date selection in `TimeProvider`.
 */
function SearchParamTimeProviders({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    return <DefaultTimeProviders>{children}</DefaultTimeProviders>;
  }
  return <DevSearchParamTimeProviders>{children}</DevSearchParamTimeProviders>;
}

function DevSearchParamTimeProviders({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const forcedDate = searchParams.get('_date') ?? undefined;
  const forcedTime = searchParams.get('_time') ?? undefined;

  return (
    <TimeProvider forcedDate={forcedDate} forcedTime={forcedTime}>
      <FavouritesProvider>{children}</FavouritesProvider>
    </TimeProvider>
  );
}

function DefaultTimeProviders({ children }: { children: ReactNode }) {
  return (
    <TimeProvider>
      <FavouritesProvider>{children}</FavouritesProvider>
    </TimeProvider>
  );
}
