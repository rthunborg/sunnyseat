import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMapShadowLayers, SHADOW_MIN_ZOOM } from '@/lib/hooks/useMapShadowLayers';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createMockMap(zoom = 16) {
  const listeners: Record<string, Function[]> = {};
  return {
    getCenter: vi.fn().mockReturnValue({ lat: 57.7, lng: 11.97 }),
    getZoom: vi.fn().mockReturnValue(zoom),
    getSource: vi.fn().mockReturnValue(undefined),
    getLayer: vi.fn().mockReturnValue(undefined),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    setLayoutProperty: vi.fn(),
    isStyleLoaded: vi.fn().mockReturnValue(true),
    on: vi.fn((event: string, fn: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    }),
    off: vi.fn((event: string, fn: Function) => {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter((f) => f !== fn);
      }
    }),
    once: vi.fn((event: string, fn: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
    }),
    _emit: (event: string) => {
      (listeners[event] || []).forEach((fn) => fn());
    },
    _listeners: listeners,
  };
}

describe('useMapShadowLayers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          shadows: { type: 'FeatureCollection', features: [] },
          meta: { venuesProcessed: 0, shadowFeaturesCount: 0, timestamp: '', radiusKm: 0.5 },
        }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports SHADOW_MIN_ZOOM constant', () => {
    expect(SHADOW_MIN_ZOOM).toBe(15);
  });

  it('does not fetch when map is null', () => {
    renderHook(() =>
      useMapShadowLayers({ map: null, enabled: true }),
    );
    vi.advanceTimersByTime(1000);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not fetch when disabled', () => {
    const map = createMockMap();
    renderHook(() =>
      useMapShadowLayers({ map: map as unknown as Parameters<typeof useMapShadowLayers>[0]['map'], enabled: false }),
    );
    vi.advanceTimersByTime(1000);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches shadows after debounce when enabled and map is loaded', async () => {
    const map = createMockMap(16);
    renderHook(() =>
      useMapShadowLayers({ map: map as unknown as Parameters<typeof useMapShadowLayers>[0]['map'], enabled: true }),
    );

    // Advance past debounce (800ms)
    vi.advanceTimersByTime(900);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/shadows?'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('includes lat, lng, and zoom in fetch URL', async () => {
    const map = createMockMap(16);
    renderHook(() =>
      useMapShadowLayers({ map: map as unknown as Parameters<typeof useMapShadowLayers>[0]['map'], enabled: true }),
    );

    vi.advanceTimersByTime(900);

    const fetchUrl = mockFetch.mock.calls[0][0] as string;
    expect(fetchUrl).toContain('lat=57.7');
    expect(fetchUrl).toContain('lng=11.97');
    expect(fetchUrl).toContain('zoom=16');
  });

  it('includes timestamp parameter when provided', async () => {
    const map = createMockMap(16);
    renderHook(() =>
      useMapShadowLayers({
        map: map as unknown as Parameters<typeof useMapShadowLayers>[0]['map'],
        enabled: true,
        timestamp: '2026-03-22T14:00:00Z',
      }),
    );

    vi.advanceTimersByTime(900);

    const fetchUrl = mockFetch.mock.calls[0][0] as string;
    expect(fetchUrl).toContain('timestamp=2026-03-22T14');
  });

  it('registers moveend handler on map', () => {
    const map = createMockMap(16);
    renderHook(() =>
      useMapShadowLayers({ map: map as unknown as Parameters<typeof useMapShadowLayers>[0]['map'], enabled: true }),
    );

    expect(map.on).toHaveBeenCalledWith('moveend', expect.any(Function));
  });

  it('removes moveend handler on unmount', () => {
    const map = createMockMap(16);
    const { unmount } = renderHook(() =>
      useMapShadowLayers({ map: map as unknown as Parameters<typeof useMapShadowLayers>[0]['map'], enabled: true }),
    );

    unmount();

    expect(map.off).toHaveBeenCalledWith('moveend', expect.any(Function));
  });
});
