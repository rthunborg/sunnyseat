/**
 * ATDD RED-PHASE SCAFFOLD — Story 9.5 AC2
 * Amber user-location UserPin via a dedicated MapLibre marker layer.
 *
 * STATUS: describe.skip — `UserLocationLayer` does not exist yet. The block is
 * skipped so CI stays green, AND the target module is loaded via a runtime
 * dynamic import inside the (skipped) test bodies so neither `tsc --noEmit` nor
 * Vitest's import-analysis trips on the not-yet-existing path. The dev creates
 * `components/custom/map/UserLocationLayer.tsx` + `UserPin.tsx` (Task 2), then
 * (a) un-skips this block and (b) converts the dynamic specifier to a normal
 * top-level `import { UserLocationLayer } from '@/components/custom/map/UserLocationLayer'`.
 *
 * What this proves (deterministic — marker call-counts + setLngLat args, no timing):
 *  - status === 'success' → exactly ONE marker mounted at [coords.lng, coords.lat].
 *  - A coords change re-positions the SAME marker via setLngLat (no tear-down/recreate,
 *    so the dot "appears without jarring jump").
 *  - status === 'fallback' | 'idle' | 'pending' → NO marker (AC2: dot not shown on
 *    the Gothenburg fallback).
 *  - Symmetric cleanup: marker.remove() on unmount + on success→fallback.
 *
 * Mocking approach mirrors `VenuePinLayer.test.tsx`: stub maplibregl.Marker so
 * `setLngLat` / `addTo` / `remove` are spies, and stub the map instance via
 * MapInstanceContext. The single difference vs VenuePinLayer is ONE marker, not a set.
 *
 * NOTE on the expected `UserLocationLayer` prop contract this scaffold assumes
 * (the dev may instead consume useGeolocation() internally — if so, swap these
 * `status`/`coords` props for a mocked useGeolocation and keep the assertions):
 *   <UserLocationLayer status={GeolocationStatus} coords={{ lat, lng }} />
 */
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { render } from '@testing-library/react';
import { createElement, useRef, type ComponentType, type ReactNode } from 'react';
import maplibregl from 'maplibre-gl';
import { MapInstanceContext } from '@/lib/contexts/MapInstanceContext';

// Runtime-only specifier so static analysis (tsc + vite import-analysis) never
// resolves a not-yet-existing module. Only the un-skipped (post-impl) run touches it.
const USER_LOCATION_LAYER_MODULE = '@/components/custom/map/UserLocationLayer';

type UserLocationLayerProps = {
  status: 'idle' | 'pending' | 'success' | 'fallback';
  coords: { lat: number; lng: number };
};

async function loadUserLocationLayer(): Promise<ComponentType<UserLocationLayerProps>> {
  const mod = (await import(/* @vite-ignore */ USER_LOCATION_LAYER_MODULE)) as {
    UserLocationLayer: ComponentType<UserLocationLayerProps>;
  };
  return mod.UserLocationLayer;
}

type MapInstanceContextValue = React.ComponentProps<
  typeof MapInstanceContext.Provider
>['value'];

type StubMarker = {
  setLngLat: Mock;
  addTo: Mock;
  remove: Mock;
  getElement: () => HTMLElement;
  __element: HTMLElement;
  __lngLat: [number, number] | null;
};

const allMarkers: StubMarker[] = [];

vi.mock('maplibre-gl', () => {
  class Marker {
    private element: HTMLElement;
    constructor(opts: { element?: HTMLElement; anchor?: string } = {}) {
      this.element = opts.element ?? document.createElement('div');
      const stub: StubMarker = {
        setLngLat: vi.fn((coord: [number, number]) => {
          stub.__lngLat = coord;
          return stub;
        }),
        addTo: vi.fn(() => stub),
        remove: vi.fn(),
        getElement: () => this.element,
        __element: this.element,
        __lngLat: null,
      };
      allMarkers.push(stub);
      return stub as unknown as Marker;
    }
  }
  class Map {}
  return { default: { Marker, Map } };
});

function makeWrapper() {
  const stubMap = {} as maplibregl.Map;
  return function Wrapper({ children }: { children: ReactNode }) {
    const mapRef = useRef<maplibregl.Map | null>(stubMap);
    const value: MapInstanceContextValue = {
      mapRef,
      mapInstance: stubMap,
      setMapInstance: () => {},
    };
    return createElement(MapInstanceContext.Provider, { value }, children);
  };
}

const SUCCESS_COORDS = { lat: 57.705, lng: 11.93 };

describe.skip('Story 9.5 AC2 — UserLocationLayer amber UserPin (RED)', () => {
  beforeEach(() => {
    allMarkers.length = 0;
  });

  it('mounts exactly ONE marker at the resolved coords when status === "success"', async () => {
    const UserLocationLayer = await loadUserLocationLayer();
    const Wrapper = makeWrapper();
    render(createElement(UserLocationLayer, { status: 'success', coords: SUCCESS_COORDS }), {
      wrapper: Wrapper,
    });

    expect(allMarkers).toHaveLength(1);
    expect(allMarkers[0].addTo).toHaveBeenCalled();
    // MapLibre takes [lng, lat] order.
    expect(allMarkers[0].setLngLat).toHaveBeenCalledWith([SUCCESS_COORDS.lng, SUCCESS_COORDS.lat]);
  });

  it('re-positions the SAME marker via setLngLat on a coords change (no recreate)', async () => {
    const UserLocationLayer = await loadUserLocationLayer();
    const Wrapper = makeWrapper();
    const { rerender } = render(
      createElement(UserLocationLayer, { status: 'success', coords: SUCCESS_COORDS }),
      { wrapper: Wrapper },
    );
    expect(allMarkers).toHaveLength(1);

    const moved = { lat: 57.72, lng: 11.99 };
    rerender(createElement(UserLocationLayer, { status: 'success', coords: moved }));

    // Still ONE marker — the dot moved, it was not torn down and re-created.
    expect(allMarkers).toHaveLength(1);
    expect(allMarkers[0].setLngLat).toHaveBeenLastCalledWith([moved.lng, moved.lat]);
    expect(allMarkers[0].remove).not.toHaveBeenCalled();
  });

  it.each(['fallback', 'idle', 'pending'] as const)(
    'renders NO marker when status === "%s" (dot hidden on the Gothenburg fallback)',
    async (status) => {
      const UserLocationLayer = await loadUserLocationLayer();
      const Wrapper = makeWrapper();
      render(
        createElement(UserLocationLayer, { status, coords: { lat: 57.7089, lng: 11.9746 } }),
        { wrapper: Wrapper },
      );
      expect(allMarkers).toHaveLength(0);
    },
  );

  it('removes the marker symmetrically on unmount', async () => {
    const UserLocationLayer = await loadUserLocationLayer();
    const Wrapper = makeWrapper();
    const { unmount } = render(
      createElement(UserLocationLayer, { status: 'success', coords: SUCCESS_COORDS }),
      { wrapper: Wrapper },
    );
    expect(allMarkers).toHaveLength(1);

    unmount();
    expect(allMarkers[0].remove).toHaveBeenCalled();
  });

  it('removes the marker when status transitions success → fallback (re-acquire lost)', async () => {
    const UserLocationLayer = await loadUserLocationLayer();
    const Wrapper = makeWrapper();
    const { rerender } = render(
      createElement(UserLocationLayer, { status: 'success', coords: SUCCESS_COORDS }),
      { wrapper: Wrapper },
    );
    expect(allMarkers).toHaveLength(1);

    rerender(
      createElement(UserLocationLayer, { status: 'fallback', coords: { lat: 57.7089, lng: 11.9746 } }),
    );
    expect(allMarkers[0].remove).toHaveBeenCalled();
  });
});
