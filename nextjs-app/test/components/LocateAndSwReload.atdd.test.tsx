/**
 * ATDD RED-PHASE SCAFFOLD — Story 9.5 AC4
 * (a) Locate-button pending/denied feedback + (b) SW controllerchange→single reload.
 *
 * STATUS: describe.skip — both surfaces assert POST-implementation behaviour:
 *  - (a) MapControls' locate button exposes no pending/denied state today, so the
 *    `aria-busy` / `data-locate-state` assertions are RED.
 *  - (b) the SW-update reload handler module does not exist yet; it is loaded via a
 *    runtime dynamic specifier so neither tsc nor vite import-analysis trips on the
 *    not-yet-existing path. Skipped so CI stays green. The dev (Task 4) wires the
 *    feedback + adds the controllerchange→reload hook, then un-skips this block.
 *
 * What this proves (deterministic — attribute branching + mocked SW event, no timing):
 *  - (a) status === 'pending'  → the locate button reflects a pending state
 *        (aria-busy="true" and/or data-locate-state="pending").
 *  - (a) status === 'fallback' → the locate button stays available to RETRY
 *        (not disabled) and reflects a denied/fallback state — instead of silently
 *        sitting on the fallback with no affordance.
 *  - (b) a single `controllerchange` event triggers exactly ONE reload
 *        (location.reload called once) — and a SECOND controllerchange does NOT
 *        reload again (the `refreshing` guard: no reload loop).
 *
 * The locate-state attribute name is the dev's call; this scaffold asserts the two
 * most likely honest signals (aria-busy + data-locate-state). The dev keeps whichever
 * they implement and deletes the other assertion when un-skipping.
 *
 * The SW handler's expected shape this scaffold assumes (the dev may name it
 * differently — adjust the import + call site, keep the assertions):
 *   registerServiceWorkerUpdateReload(): () => void   // returns a cleanup fn
 * It listens for `navigator.serviceWorker` 'controllerchange' and reloads once.
 */
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { render } from '@testing-library/react';
import { useRef, type ReactNode } from 'react';
import type maplibregl from 'maplibre-gl';
import { NextIntlClientProvider } from 'next-intl';
import { MapInstanceContext } from '@/lib/contexts/MapInstanceContext';
import { MapControls } from '@/components/custom/map/MapControls';

const messages = {
  map: {
    zoomIn: 'Zooma in',
    zoomOut: 'Zooma ut',
    myLocation: 'Min plats',
    settings: 'Inställningar',
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

function ControlsWrapper({ children }: { children: ReactNode }) {
  const stubMap = {
    flyTo: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  } as unknown as maplibregl.Map;
  const mapRef = useRef<maplibregl.Map | null>(stubMap);
  const value: MapInstanceContextValue = {
    mapRef,
    mapInstance: stubMap,
    setMapInstance: () => {},
  };
  return (
    <NextIntlClientProvider locale="sv" messages={messages}>
      <MapInstanceContext.Provider value={value}>{children}</MapInstanceContext.Provider>
    </NextIntlClientProvider>
  );
}

describe('Story 9.5 AC4(a) — locate-button pending/denied feedback (RED)', () => {
  afterEach(() => {
    geoState.status = 'idle';
  });

  it('reflects a PENDING state on the locate button while status === "pending"', () => {
    geoState.status = 'pending';
    const { getByTestId } = render(<MapControls />, { wrapper: ControlsWrapper });
    const btn = getByTestId('map-control-my-location');
    // Honest in-flight signal — either is acceptable; dev keeps one.
    expect(
      btn.getAttribute('aria-busy') === 'true' ||
        btn.getAttribute('data-locate-state') === 'pending',
    ).toBe(true);
  });

  it('keeps the locate button available to RETRY on status === "fallback" (denied/unavailable)', () => {
    geoState.status = 'fallback';
    const { getByTestId } = render(<MapControls />, { wrapper: ControlsWrapper });
    const btn = getByTestId('map-control-my-location') as HTMLButtonElement;
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
