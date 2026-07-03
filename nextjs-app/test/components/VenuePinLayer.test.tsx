import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { act, render } from '@testing-library/react';
import { useRef, useState, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import maplibregl from 'maplibre-gl';
import { MapInstanceContext } from '@/lib/contexts/MapInstanceContext';
import { MapSelectionContext } from '@/lib/contexts/MapSelectionContext';
import { VenuePinLayer } from '@/components/custom/map/VenuePinLayer';
import type { VenuePinData } from '@/lib/types/map';

type MapInstanceContextValue = React.ComponentProps<
  typeof MapInstanceContext.Provider
>['value'];

const reducedMotion = vi.fn(() => false);

vi.mock('motion/react', async () => {
  const React = await import('react');
  type DivProps = React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>;
  const passthrough = (props: DivProps) => {
    const {
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      layout: _layout,
      ...rest
    } = props;
    return React.createElement('div', rest);
  };
  return {
    motion: { div: passthrough },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useReducedMotion: () => reducedMotion(),
  };
});

const createdRoots: Array<{ render: Mock; unmount: Mock; container: HTMLElement }> = [];

vi.mock('react-dom/client', async () => {
  const actual = await vi.importActual<typeof import('react-dom/client')>('react-dom/client');
  return {
    ...actual,
    // Story 1.6 review P16: pass options as the proper React-19
    // CreateRootOptions type rather than `as never`. The widened parameter
    // is unknown because callers (VenuePinLayer) only pass undefined; we
    // narrow at the call site without a type-lying cast.
    createRoot: (
      container: HTMLElement,
      options?: Parameters<typeof actual.createRoot>[1],
    ) => {
      const realRoot = actual.createRoot(container, options);
      const renderSpy = vi.fn((node: React.ReactNode) => realRoot.render(node));
      const unmountSpy = vi.fn(() => realRoot.unmount());
      const root = {
        render: renderSpy,
        unmount: unmountSpy,
        container,
      };
      createdRoots.push(root);
      return root;
    },
  };
});

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
    private lngLat: [number, number] | null = null;

    constructor(opts: { element: HTMLElement; anchor?: string }) {
      this.element = opts.element;
      const stub: StubMarker = {
        setLngLat: vi.fn((coord: [number, number]) => {
          this.lngLat = coord;
          stub.__lngLat = coord;
          return stub;
        }),
        addTo: vi.fn(() => stub),
        remove: vi.fn(),
        getElement: () => this.element,
        __element: this.element,
        __lngLat: this.lngLat,
      };
      allMarkers.push(stub);
      return stub as unknown as Marker;
    }
  }
  // `Map` is mocked even though `VenuePinLayer` itself does not call
  // `new maplibregl.Map(...)`. Future tests in this file (or others
  // that share the mock graph) might import `MapContainer`, which does;
  // having a stub class prevents "Map is not a constructor" trips when
  // that happens (Round 2 — formerly R1-Dismiss #2).
  class Map {}
  return { default: { Marker, Map } };
});

type MapClickHandler = (e: { originalEvent: { target: EventTarget | null } }) => void;

type StubMap = {
  on: Mock;
  off: Mock;
  getCanvas: () => HTMLCanvasElement;
  __canvas: HTMLCanvasElement;
  __clickHandlers: MapClickHandler[];
};

function makeStubMap(): StubMap {
  const handlers: MapClickHandler[] = [];
  const canvas = document.createElement('canvas');
  const stub: StubMap = {
    on: vi.fn((event: string, handler: MapClickHandler) => {
      if (event === 'click') handlers.push(handler);
    }),
    off: vi.fn((event: string, handler: MapClickHandler) => {
      if (event === 'click') {
        const idx = handlers.indexOf(handler);
        if (idx >= 0) handlers.splice(idx, 1);
      }
    }),
    getCanvas: () => canvas,
    __canvas: canvas,
    __clickHandlers: handlers,
  };
  return stub;
}

const messages = {
  map: {
    pinSunnyAria: 'Solig plats — {percent} procent sol',
    // Story 1.6 review (P34): mock previously omitted `pinPartialAria`,
    // so any test that ran a `Partial` venue would resolve through
    // next-intl's missing-key fallback instead of the real translation.
    pinPartialAria: 'Delvis solig plats — {percent} procent sol',
    pinShadedAria: 'Skuggad plats — {percent} procent sol',
    pinObscuredAria: 'Sol bakom moln — {percent} procent solläge',
  },
};

type WrapperHandle = {
  setSelected: (id: string | null) => void;
  selectVenueSpy: Mock;
};

function makeWrapper(stubMap: StubMap, handleRef: { current: WrapperHandle | null }) {
  return function Wrapper({ children }: { children: ReactNode }) {
    const mapRef = useRef<maplibregl.Map | null>(stubMap as unknown as maplibregl.Map);
    const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
    const selectVenueSpy = useState(() => vi.fn((id: string | null) => setSelectedVenueId(id)))[0];
    handleRef.current = {
      setSelected: setSelectedVenueId,
      selectVenueSpy,
    };
    const mapInstanceValue: MapInstanceContextValue = {
      mapRef,
      mapInstance: stubMap as unknown as maplibregl.Map,
      setMapInstance: () => {},
    };
    return (
      <NextIntlClientProvider locale="sv" messages={messages}>
        <MapInstanceContext.Provider value={mapInstanceValue}>
          <MapSelectionContext.Provider
            value={{
              selectedVenueId,
              selectedVenuePreview: null,
              selectVenue: selectVenueSpy,
              toggleVenue: (id) =>
                setSelectedVenueId((current) => (current === id ? null : id)),
            }}
          >
            {children}
          </MapSelectionContext.Provider>
        </MapInstanceContext.Provider>
      </NextIntlClientProvider>
    );
  };
}

const baseVenues: VenuePinData[] = [
  {
    id: '1', slug: 'a', name: 'A', lat: 57.7, lng: 11.97,
    sunStatus: 'Sunny', sunExposurePercent: 95, isPartner: false,
  },
  {
    id: '2', slug: 'b', name: 'B', lat: 57.7, lng: 11.97,
    sunStatus: 'Sunny', sunExposurePercent: 80, isPartner: false,
  },
  {
    id: '3', slug: 'c', name: 'C', lat: 57.7, lng: 11.97,
    sunStatus: 'Shaded', sunExposurePercent: 20, isPartner: false,
  },
];

describe('<VenuePinLayer />', () => {
  beforeEach(() => {
    allMarkers.length = 0;
    createdRoots.length = 0;
    reducedMotion.mockReturnValue(false);
  });

  it('mounts one MapLibre Marker per venue and removes them on unmount', () => {
    const stubMap = makeStubMap();
    const handleRef: { current: WrapperHandle | null } = { current: null };
    const Wrapper = makeWrapper(stubMap, handleRef);

    const { unmount } = render(<VenuePinLayer venues={baseVenues} />, {
      wrapper: Wrapper,
    });

    expect(allMarkers).toHaveLength(3);
    allMarkers.forEach((m) => expect(m.addTo).toHaveBeenCalled());
    allMarkers.forEach((m) => expect(m.setLngLat).toHaveBeenCalled());

    unmount();

    allMarkers.forEach((m) => expect(m.remove).toHaveBeenCalled());
  });

  it('announces a CloudObscured pin as "sol bakom moln", not "shaded" (Story 10.2 AC4)', () => {
    const stubMap = makeStubMap();
    const handleRef: { current: WrapperHandle | null } = { current: null };
    const Wrapper = makeWrapper(stubMap, handleRef);

    const obscuredVenue: VenuePinData = {
      id: 'obscured', slug: 'o', name: 'Obscured', lat: 57.7, lng: 11.97,
      sunStatus: 'CloudObscured', sunExposurePercent: 88, isPartner: false,
    };

    render(<VenuePinLayer venues={[obscuredVenue]} />, { wrapper: Wrapper });

    const button = allMarkers[0].__element.querySelector('button');
    const ariaLabel = button?.getAttribute('aria-label') ?? '';
    // The obscured aria appears — and the shaded aria does not.
    expect(ariaLabel).toContain('Sol bakom moln');
    expect(ariaLabel).not.toContain('Skuggad plats');
    // The geometric solläge % survives the gate in the aria (AC2).
    expect(ariaLabel).toContain('88');
    // Obscured phrase present exactly once (AC4 de-dup discipline).
    expect(ariaLabel.match(/Sol bakom moln/g)).toHaveLength(1);
  });

  it('selectively re-renders the previously- and newly-selected pins on selection change', () => {
    const stubMap = makeStubMap();
    const handleRef: { current: WrapperHandle | null } = { current: null };
    const Wrapper = makeWrapper(stubMap, handleRef);

    render(<VenuePinLayer venues={baseVenues} />, { wrapper: Wrapper });

    expect(createdRoots).toHaveLength(3);
    const renderCallsBefore = createdRoots.map((r) => r.render.mock.calls.length);
    expect(renderCallsBefore).toEqual([1, 1, 1]);

    act(() => handleRef.current?.setSelected('2'));
    expect(createdRoots[0].render.mock.calls.length).toBe(1);
    expect(createdRoots[1].render.mock.calls.length).toBe(2);
    expect(createdRoots[2].render.mock.calls.length).toBe(1);

    act(() => handleRef.current?.setSelected('3'));
    expect(createdRoots[0].render.mock.calls.length).toBe(1);
    expect(createdRoots[1].render.mock.calls.length).toBe(3);
    expect(createdRoots[2].render.mock.calls.length).toBe(2);
  });

  it('calls selectVenue(null) only when the map canvas itself is clicked', () => {
    const stubMap = makeStubMap();
    const handleRef: { current: WrapperHandle | null } = { current: null };
    const Wrapper = makeWrapper(stubMap, handleRef);

    render(<VenuePinLayer venues={baseVenues} />, { wrapper: Wrapper });

    expect(stubMap.__clickHandlers.length).toBeGreaterThan(0);

    // A click whose target is overlay DOM (e.g. a control button) must NOT
    // deselect — only direct canvas hits are background.
    const overlay = document.createElement('div');
    act(() => {
      stubMap.__clickHandlers[0]({ originalEvent: { target: overlay } });
    });
    expect(handleRef.current?.selectVenueSpy).not.toHaveBeenCalled();

    act(() => {
      stubMap.__clickHandlers[0]({ originalEvent: { target: stubMap.__canvas } });
    });
    expect(handleRef.current?.selectVenueSpy).toHaveBeenCalledWith(null);
  });

  it('does not clear selection when the selected venue exists but its marker has not mounted yet', () => {
    const stubMap = makeStubMap();
    const handleRef: { current: WrapperHandle | null } = { current: null };
    const Wrapper = makeWrapper(stubMap, handleRef);

    render(<VenuePinLayer venues={[]} />, { wrapper: Wrapper });

    act(() => handleRef.current?.setSelected('late-venue'));
    expect(handleRef.current?.selectVenueSpy).toHaveBeenCalledWith(null);
    handleRef.current?.selectVenueSpy.mockClear();

    const lateVenue: VenuePinData = {
      ...baseVenues[0],
      id: 'late-venue',
      slug: 'late-venue',
      name: 'Late venue',
    };
    const { rerender } = render(<VenuePinLayer venues={[lateVenue]} />, {
      wrapper: Wrapper,
    });

    act(() => handleRef.current?.setSelected('late-venue'));
    rerender(<VenuePinLayer venues={[lateVenue]} />);

    expect(handleRef.current?.selectVenueSpy).not.toHaveBeenCalledWith(null);
  });

  it('skips opacity stagger when prefers-reduced-motion is set', () => {
    reducedMotion.mockReturnValue(true);
    const stubMap = makeStubMap();
    const handleRef: { current: WrapperHandle | null } = { current: null };
    const Wrapper = makeWrapper(stubMap, handleRef);

    render(<VenuePinLayer venues={baseVenues} />, { wrapper: Wrapper });

    allMarkers.forEach((m) => {
      expect(m.__element.style.opacity).toBe('1');
      expect(m.__element.style.transition).toBe('');
    });
  });

  it('stagger delays grow monotonically WITHIN a batch and reset between batches', () => {
    // Story 1.6 review (P32): per-batch stagger replaces the original
    // absolute-insertion-index scheme. The previous behaviour collapsed
    // to a 900 ms wall-of-pins after the seen-set passed 30, because
    // every new pin clamped to STAGGER_MAX_INDEX × STAGGER_STEP_MS.
    // Per-batch counting:
    //   • Within a single render, the Nth NEW pin gets stagger N × 30ms.
    //   • The next render restarts the counter — refetches that
    //     introduce K new pins always cascade 0, 30, …, (K-1)×30 ms.
    //
    // Story 1.6 review (P23): fake timers prevent scheduled callbacks
    // from firing during the test and racing the assertions.
    vi.useFakeTimers();
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    try {
      const stubMap = makeStubMap();
      const handleRef: { current: WrapperHandle | null } = { current: null };
      const Wrapper = makeWrapper(stubMap, handleRef);

      // Initial render with all 3 venues → cascade 0, 30, 60 ms.
      const { rerender } = render(<VenuePinLayer venues={baseVenues} />, {
        wrapper: Wrapper,
      });

      const stripCallback = (calls: typeof setTimeoutSpy.mock.calls): number[] =>
        calls.map((c) => Number(c[1] ?? 0)).filter((d) => Number.isFinite(d));

      const firstDelays = stripCallback(setTimeoutSpy.mock.calls);
      expect(firstDelays).toEqual([0, 30, 60]);

      // Second render: append no new pins (rerender with same set) →
      // no setTimeout calls at all because every venue is already mounted.
      setTimeoutSpy.mockClear();
      rerender(<VenuePinLayer venues={baseVenues} />);
      expect(stripCallback(setTimeoutSpy.mock.calls)).toEqual([]);

      // Third render: drop venues 0 and 1, add a new one → the single
      // new pin gets stagger 0 (per-batch counter reset).
      setTimeoutSpy.mockClear();
      const newVenue: VenuePinData = {
        ...baseVenues[0],
        id: 'venue-late-arrival',
        name: 'Late arrival',
        lat: 57.7000,
        lng: 11.9700,
      };
      rerender(<VenuePinLayer venues={[baseVenues[2], newVenue]} />);
      expect(stripCallback(setTimeoutSpy.mock.calls)).toEqual([0]);
    } finally {
      setTimeoutSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  // Story 1.6 review (R2-P2 → P50): MapLibre's marker creation injects
  // `role="button"` and `aria-label="Map marker"` on the wrapper element
  // we hand it. We render our own focusable `<button>` inside, so the
  // outer wrapper claiming to be a button creates a nested-interactive
  // a11y violation. P49 strips the attributes before/after addTo();
  // P50 adds a MutationObserver that re-strips them if MapLibre's
  // internals re-apply them asynchronously. The defense is regression-
  // fragile without these tests — any future refactor that drops the
  // observer setup, narrows the attributeFilter, or skips disconnect
  // would silently re-introduce the nested-interactive violation.
  describe('wrapper role/aria-label MutationObserver defense (P49 + P50)', () => {
    it('initial wrapper has no role and no aria-label after marker attach', () => {
      const stubMap = makeStubMap();
      const handleRef: { current: WrapperHandle | null } = { current: null };
      const Wrapper = makeWrapper(stubMap, handleRef);

      render(<VenuePinLayer venues={baseVenues} />, { wrapper: Wrapper });

      expect(allMarkers).toHaveLength(3);
      allMarkers.forEach((m) => {
        expect(m.__element.hasAttribute('role')).toBe(false);
        expect(m.__element.hasAttribute('aria-label')).toBe(false);
      });
    });

    it('re-strips role and aria-label if reapplied programmatically (microtask)', async () => {
      const stubMap = makeStubMap();
      const handleRef: { current: WrapperHandle | null } = { current: null };
      const Wrapper = makeWrapper(stubMap, handleRef);

      render(<VenuePinLayer venues={baseVenues.slice(0, 1)} />, { wrapper: Wrapper });

      const element = allMarkers[0].__element;
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', 'Map marker');
      // MutationObserver callbacks fire as microtasks. Awaiting any
      // resolved promise yields long enough for the observer's batched
      // mutation records to flush and the strip handler to run.
      await Promise.resolve();
      await Promise.resolve();

      expect(element.hasAttribute('role')).toBe(false);
      expect(element.hasAttribute('aria-label')).toBe(false);
    });

    it('disconnects the observer when the venue is removed from the layer', async () => {
      const stubMap = makeStubMap();
      const handleRef: { current: WrapperHandle | null } = { current: null };
      const Wrapper = makeWrapper(stubMap, handleRef);

      const { rerender } = render(<VenuePinLayer venues={baseVenues} />, {
        wrapper: Wrapper,
      });
      const removedElement = allMarkers[0].__element;

      // Drop venue id '1'. The layer's venues effect should remove its
      // marker, which calls observer.disconnect() before marker.remove().
      rerender(<VenuePinLayer venues={baseVenues.slice(1)} />);

      // Re-applying the role on the orphaned element must NOT be reverted —
      // a still-connected observer would catch the mutation and re-strip.
      removedElement.setAttribute('role', 'button');
      await Promise.resolve();
      await Promise.resolve();

      expect(removedElement.getAttribute('role')).toBe('button');
    });

    it('disconnects every observer on layer unmount', async () => {
      const stubMap = makeStubMap();
      const handleRef: { current: WrapperHandle | null } = { current: null };
      const Wrapper = makeWrapper(stubMap, handleRef);

      const { unmount } = render(<VenuePinLayer venues={baseVenues} />, {
        wrapper: Wrapper,
      });
      const elements = allMarkers.map((m) => m.__element);

      unmount();

      // After unmount, observers are disconnected — re-applying the role
      // on every detached wrapper must persist.
      elements.forEach((el) => el.setAttribute('role', 'button'));
      await Promise.resolve();
      await Promise.resolve();

      elements.forEach((el) => {
        expect(el.getAttribute('role')).toBe('button');
      });
    });
  });
});
