/**
 * ATDD SCAFFOLD — Story 9.5 AC4
 * (a) Locate-button pending/denied feedback + (b) SW controllerchange→single reload.
 *
 * STORY 9.6 UPDATE: Story 9.5 originally wired the (a) locate-reliability feedback
 * on the FLOATING `MapControls` locate button. Story 9.6 removed that duplicate
 * floating button and RELOCATED the feedback onto the single surviving mobile
 * locate control — the top-bar `Navigation` button in `VenueSearchShell`
 * (`data-testid="search-shell-my-location"`). Part (a) below now asserts the
 * SAME reliability contract against that surviving surface, so 9.5's behaviour is
 * preserved after the consolidation rather than silently dropped.
 *
 * STATUS: describe.skip — part (b) still targets a SW-update reload handler module
 * loaded via a runtime dynamic specifier; the block stays skipped so CI is not
 * gated on it. Part (a) is now GREEN against the relocated surface and could be
 * un-skipped independently, but is kept in this cohesive 9.5-AC4 file.
 *
 * What part (a) proves (deterministic — attribute branching, no timing):
 *  - status === 'pending'  → the surviving locate button reflects a pending state
 *        (aria-busy="true" and/or data-locate-state="pending").
 *  - status === 'fallback' → the locate button stays available to RETRY
 *        (not disabled) and reflects a denied/fallback state — instead of silently
 *        sitting on the fallback with no affordance.
 *
 * The SW handler's expected shape part (b) assumes:
 *   registerServiceWorkerUpdateReload(): () => void   // returns a cleanup fn
 * It listens for `navigator.serviceWorker` 'controllerchange' and reloads once.
 */
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { render } from '@testing-library/react';
import { useRef, type ReactNode } from 'react';
import type maplibregl from 'maplibre-gl';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MapInstanceContext } from '@/lib/contexts/MapInstanceContext';
import { VenueSearchShell } from '@/components/custom/search/VenueSearchShell';

const messages = {
  common: {
    nav: {
      myLocation: 'Min plats',
    },
  },
  venue: {
    search: {
      label: 'Sök plats',
      placeholder: 'Sök plats eller område i Göteborg...',
      clear: 'Rensa sökning',
      loading: 'Söker platser',
      error: 'Sökningen kunde inte genomföras',
      noResults: 'Inga resultat för "{query}"',
      resultCount: '{count, plural, one {# resultat} other {# resultat}}',
      settings: 'Inställningar',
      closedAtSelectedTime: 'Stängt vid vald tid',
    },
  },
};

vi.mock('@/lib/contexts/SettingsContext', () => ({
  useSettings: () => ({
    activeView: null,
    openSettings: vi.fn(),
    openFeedback: vi.fn(),
    close: vi.fn(),
  }),
}));

vi.mock('@/hooks/queries/useVenueSearch', () => ({
  useVenueSearch: () => ({
    data: { venues: [] },
    isFetching: false,
    isError: false,
    dataUpdatedAt: 1,
  }),
}));

vi.mock('@/lib/contexts/MapSelectionContext', () => ({
  useMapSelection: () => ({
    selectedVenueId: null,
    selectVenue: vi.fn(),
    toggleVenue: vi.fn(),
  }),
}));

vi.mock('@/lib/contexts/TimeContext', () => ({
  useTimeContext: () => ({
    currentTime: new Date('2026-05-20T10:15:00.000Z'),
    selectedDate: '2026-05-20',
    selectedTime: '12:15',
    selectedMinutes: 735,
    isLiveNow: true,
    plannerQuery: undefined,
  }),
}));

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

// Mockable geolocation status so the locate-feedback branch is driven directly.
const geoState = vi.hoisted(() => ({ status: 'idle' as string }));
vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    status: geoState.status,
    coords: { lat: 57.7089, lng: 11.9746 },
    requestLocation: vi.fn(),
    useCentrum: vi.fn(),
  }),
}));

type MapInstanceContextValue = React.ComponentProps<
  typeof MapInstanceContext.Provider
>['value'];

function SearchShellWrapper({ children }: { children: ReactNode }) {
  const stubMap = {
    easeTo: vi.fn(),
    flyTo: vi.fn(),
  } as unknown as maplibregl.Map;
  const mapRef = useRef<maplibregl.Map | null>(stubMap);
  const value: MapInstanceContextValue = {
    mapRef,
    mapInstance: stubMap,
    setMapInstance: () => {},
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="sv" messages={messages}>
        <MapInstanceContext.Provider value={value}>{children}</MapInstanceContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe('Story 9.5 AC4(a) — locate-button pending/denied feedback (relocated to VenueSearchShell by 9.6)', () => {
  afterEach(() => {
    geoState.status = 'idle';
  });

  it('reflects a PENDING state on the surviving locate button while status === "pending"', () => {
    geoState.status = 'pending';
    const { getByTestId } = render(<VenueSearchShell variant="mobile" />, {
      wrapper: SearchShellWrapper,
    });
    const btn = getByTestId('search-shell-my-location');
    // Honest in-flight signal — both are wired.
    expect(
      btn.getAttribute('aria-busy') === 'true' ||
        btn.getAttribute('data-locate-state') === 'pending',
    ).toBe(true);
  });

  it('keeps the locate button available to RETRY on status === "fallback" (denied/unavailable)', () => {
    geoState.status = 'fallback';
    const { getByTestId } = render(<VenueSearchShell variant="mobile" />, {
      wrapper: SearchShellWrapper,
    });
    const btn = getByTestId('search-shell-my-location') as HTMLButtonElement;
    // The whole point of AC4: NOT silently sitting on the fallback — the button
    // must stay clickable so the user can re-request.
    expect(btn.disabled).toBe(false);
    expect(btn.getAttribute('data-locate-state')).toBe('fallback');
  });
});

/**
 * (b) SW controllerchange → single reload (no loop).
 */
type RegisterSwUpdateReload = () => () => void;

async function loadRegisterSwUpdateReload(): Promise<RegisterSwUpdateReload> {
  const mod = await import('@/hooks/useServiceWorkerUpdate');
  return mod.registerServiceWorkerUpdateReload;
}

describe('Story 9.5 AC4(b) — SW controllerchange forces ONE reload, no loop (RED)', () => {
  let listeners: Array<() => void>;
  let reloadSpy: Mock;
  let originalSW: PropertyDescriptor | undefined;
  let originalLocation: PropertyDescriptor | undefined;

  beforeEach(() => {
    listeners = [];
    reloadSpy = vi.fn();

    originalSW = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        controller: {},
        addEventListener: (event: string, cb: () => void) => {
          if (event === 'controllerchange') listeners.push(cb);
        },
        removeEventListener: (event: string, cb: () => void) => {
          if (event === 'controllerchange') {
            const i = listeners.indexOf(cb);
            if (i >= 0) listeners.splice(i, 1);
          }
        },
      },
    });

    // jsdom marks `window.location.reload` non-configurable, so swap the whole
    // `window.location` object for a stub whose `reload` is the spy.
    originalLocation = Object.getOwnPropertyDescriptor(window, 'location');
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });
  });

  afterEach(() => {
    if (originalSW) Object.defineProperty(navigator, 'serviceWorker', originalSW);
    else delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    if (originalLocation) Object.defineProperty(window, 'location', originalLocation);
  });

  it('reloads exactly ONCE on a controllerchange event', async () => {
    const register = await loadRegisterSwUpdateReload();
    register();

    expect(listeners.length).toBeGreaterThan(0);
    listeners.forEach((cb) => cb());

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('does NOT reload a second time on a repeat controllerchange (refreshing guard — no loop)', async () => {
    const register = await loadRegisterSwUpdateReload();
    register();

    listeners.forEach((cb) => cb()); // first activation → reload
    listeners.forEach((cb) => cb()); // repeat → guarded, no second reload

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });

  it('cleanup detaches the controllerchange listener', async () => {
    const register = await loadRegisterSwUpdateReload();
    const cleanup = register();
    cleanup();

    expect(listeners.length).toBe(0);
  });
});
