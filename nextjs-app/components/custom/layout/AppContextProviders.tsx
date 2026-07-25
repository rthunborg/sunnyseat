'use client';

import {
  Suspense,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { MapInstanceProvider } from '@/lib/contexts/MapInstanceContext';
import { MapSelectionProvider } from '@/lib/contexts/MapSelectionContext';
import { TimeProvider } from '@/lib/contexts/TimeContext';
import { FavouritesProvider } from '@/lib/contexts/FavouritesContext';
import { GeolocationProvider } from '@/hooks/useGeolocation';
import { SettingsProvider } from '@/lib/contexts/SettingsContext';
import { TagFilterProvider } from '@/lib/contexts/TagFilterContext';
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
 *   Query → Language → Geolocation → TagFilter → MapInstance → MapSelection → Time → children
 *
 * `TagFilterProvider` (Story 9.7) is an order-independent sibling — it wraps the
 * whole tree so BOTH the chip UI (the `DesktopNavBar` subtree, a `ResponsiveLayout`
 * sibling of `children`) AND the venue surfaces (`MapView`, which is `children`)
 * resolve the SAME provider instance. The chip row writes `toggleTag`; the venue
 * list + pins read `activeTags`. The two live in separate subtrees joined only
 * here, so this is the only mount point that reaches both (Dev Notes §"the split").
 */
export function AppContextProviders({ children }: { children: ReactNode }) {
  return (
    <GeolocationProvider>
      <TagFilterProvider>
        <MapInstanceProvider>
          <MapSelectionProvider>
            <SettingsProvider>
              <SearchParamTimeProviders>{children}</SearchParamTimeProviders>
              {/* One mount point for the settings + app-feedback modals, openable
                  from the desktop nav and the mobile map controls. */}
              <SettingsModalRoot />
            </SettingsProvider>
          </MapSelectionProvider>
        </MapInstanceProvider>
      </TagFilterProvider>
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

type ForcedPlannerParams = {
  forcedDate?: string;
  forcedTime?: string;
};

function DevSearchParamTimeProviders({ children }: { children: ReactNode }) {
  const [forcedPlanner, setForcedPlanner] = useState<ForcedPlannerParams>({});

  // Keep `children` mounted exactly once. The URL-reader can suspend behind its
  // own null fallback, but the app shell and any body portals no longer exist in
  // both the Suspense fallback and resolved branches at the same time.
  return (
    <TimeProvider
      forcedDate={forcedPlanner.forcedDate}
      forcedTime={forcedPlanner.forcedTime}
    >
      <FavouritesProvider>{children}</FavouritesProvider>
      <Suspense fallback={null}>
        <DevSearchParamTimeSync onChange={setForcedPlanner} />
      </Suspense>
    </TimeProvider>
  );
}

function DevSearchParamTimeSync({
  onChange,
}: {
  onChange: Dispatch<SetStateAction<ForcedPlannerParams>>;
}) {
  const searchParams = useSearchParams();
  const forcedDate = searchParams.get('_date') ?? undefined;
  const forcedTime = searchParams.get('_time') ?? undefined;

  useEffect(() => {
    onChange((previous) => {
      if (
        previous.forcedDate === forcedDate &&
        previous.forcedTime === forcedTime
      ) {
        return previous;
      }
      return { forcedDate, forcedTime };
    });
  }, [forcedDate, forcedTime, onChange]);

  return null;
}

function DefaultTimeProviders({ children }: { children: ReactNode }) {
  return (
    <TimeProvider>
      <FavouritesProvider>{children}</FavouritesProvider>
    </TimeProvider>
  );
}
