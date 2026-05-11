import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { useRef, useState, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import type maplibregl from 'maplibre-gl';
import { MapInstanceContext } from '@/lib/contexts/MapInstanceContext';

const messages = {
  map: {
    tileLoadFailed: 'Kunde inte ladda kartan.',
    zoomIn: 'Zooma in',
    zoomOut: 'Zooma ut',
    myLocation: 'Min plats',
  },
};

type Listeners = {
  load: Array<() => void>;
  error: Array<(e: maplibregl.ErrorEvent) => void>;
  sourcedata: Array<(e: maplibregl.MapSourceDataEvent) => void>;
};

function makeListeners(): Listeners {
  return { load: [], error: [], sourcedata: [] };
}

let activeListeners: Listeners = makeListeners();

vi.mock('maplibre-gl', () => {
  class MockMap {
    constructor() {
      activeListeners = makeListeners();
    }
    on(event: keyof Listeners, handler: () => void) {
      activeListeners[event].push(handler as never);
    }
    off() {}
    remove() {}
    getCanvas() {
      return document.createElement('canvas');
    }
    // Story 1.6 review P21: real maplibregl.Map exposes `areTilesLoaded()`;
    // any code path that checks "do we already have tiles?" before binding
    // a load listener (MapView.tsx) needs the method present on the mock.
    areTilesLoaded() {
      return false;
    }
  }
  return {
    default: { Map: MockMap },
  };
});

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

import { MapContainer } from '@/components/custom/map/MapContainer';

function makeWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    const mapRef = useRef<maplibregl.Map | null>(null);
    const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
    return (
      <NextIntlClientProvider locale="sv" messages={messages}>
        <MapInstanceContext.Provider value={{ mapRef, mapInstance, setMapInstance }}>
          {children}
        </MapInstanceContext.Provider>
      </NextIntlClientProvider>
    );
  };
}

function fireTileError(): void {
  const errorEvent = {
    tile: {},
    error: { message: 'tile load failed' },
  } as unknown as maplibregl.ErrorEvent;
  activeListeners.error.forEach((h) => h(errorEvent));
}

// Story 1.6 review P30: MapContainer scopes `sourcedata` recovery to
// real tile sources only (sourceId in {openmaptiles, osm, tiles}) so
// successful style-source events don't zero the tile-failure counter.
// Tests must include the sourceId to exercise the recovery branch.
function fireSourceLoaded(sourceId: string = 'openmaptiles'): void {
  const event = {
    isSourceLoaded: true,
    sourceDataType: 'content',
    sourceId,
  } as unknown as maplibregl.MapSourceDataEvent;
  activeListeners.sourcedata.forEach((h) => h(event));
}

// Story 1.6 review P22: real MapLibre fires `sourcedata` with
// `sourceDataType: 'metadata'` first; the production handler skips that
// branch. Helper here exercises the metadata-skip path so a regression
// (e.g. metadata events accidentally clearing the failure count) gets
// caught.
function fireSourceMetadata(): void {
  const event = {
    isSourceLoaded: true,
    sourceDataType: 'metadata',
    sourceId: 'openmaptiles',
  } as unknown as maplibregl.MapSourceDataEvent;
  activeListeners.sourcedata.forEach((h) => h(event));
}

// Story 1.6 review P30: helper for "non-tile" source events (style /
// sprite / glyphs) — these MUST NOT clear the failure latch.
function fireStyleSourceLoaded(): void {
  const event = {
    isSourceLoaded: true,
    sourceDataType: 'content',
    sourceId: 'composite',
  } as unknown as maplibregl.MapSourceDataEvent;
  activeListeners.sourcedata.forEach((h) => h(event));
}

describe('<MapContainer />', () => {
  beforeEach(() => {
    activeListeners = makeListeners();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not render the live-region status fallback while tiles are loading', () => {
    const { queryByRole } = render(<MapContainer />, { wrapper: makeWrapper() });
    expect(queryByRole('status')).toBeNull();
  });

  it('shows the live-region fallback after 4 tile errors', () => {
    const { queryByRole } = render(<MapContainer />, { wrapper: makeWrapper() });

    act(() => {
      // Need 4 tile errors to cross the failure threshold.
      for (let i = 0; i < 4; i += 1) fireTileError();
    });

    const status = queryByRole('status');
    expect(status).not.toBeNull();
    expect(status?.textContent).toContain('Kunde inte ladda kartan.');
  });

  it('does NOT clear the live-region fallback when only a metadata source event fires', () => {
    const { queryByRole } = render(<MapContainer />, { wrapper: makeWrapper() });

    act(() => {
      for (let i = 0; i < 4; i += 1) fireTileError();
    });
    expect(queryByRole('status')).not.toBeNull();

    // A metadata-only source event must not be mistaken for tile success;
    // the failure latch should stay set.
    act(() => {
      fireSourceMetadata();
    });
    expect(queryByRole('status')).not.toBeNull();
  });

  it('does NOT clear the live-region fallback when a non-tile (style / sprite / glyph) source loads', () => {
    // Story 1.6 review (P30): the failure-counter recovery is scoped to
    // tile-source IDs only. Successful loads of unrelated style or sprite
    // sources must NOT zero the counter; otherwise transient tile errors
    // never reach the threshold of 4.
    const { queryByRole } = render(<MapContainer />, { wrapper: makeWrapper() });

    act(() => {
      for (let i = 0; i < 4; i += 1) fireTileError();
    });
    expect(queryByRole('status')).not.toBeNull();

    act(() => {
      fireStyleSourceLoaded();
    });
    expect(queryByRole('status')).not.toBeNull();
  });

  it('remounts the live region on a second failure so SR re-announces', () => {
    const { queryByRole } = render(<MapContainer />, { wrapper: makeWrapper() });

    // First failure cycle.
    act(() => {
      for (let i = 0; i < 4; i += 1) fireTileError();
    });
    const firstStatus = queryByRole('status') as HTMLElement | null;
    expect(firstStatus).not.toBeNull();

    // Auto-recover, then fail again — the live region must remount,
    // not just stay mounted with the same DOM identity.
    act(() => {
      fireSourceLoaded();
    });
    expect(queryByRole('status')).toBeNull();

    act(() => {
      for (let i = 0; i < 4; i += 1) fireTileError();
    });
    const secondStatus = queryByRole('status') as HTMLElement | null;
    expect(secondStatus).not.toBeNull();
    // Different React key forces a fresh DOM node — the SR re-announces.
    expect(secondStatus).not.toBe(firstStatus);
  });
});
