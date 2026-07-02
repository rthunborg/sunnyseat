'use client';

import { useEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import { useMapInstance } from '@/lib/contexts/MapInstanceContext';
import type { GeolocationStatus, GeolocationCoords } from '@/hooks/useGeolocation';
import { UserPin } from './UserPin';

type UserLocationLayerProps = {
  /** Geolocation status from `useGeolocation`. The dot renders ONLY on
   * `'success'` (a real GPS fix); on `'fallback'` (Gothenburg centrum),
   * `'idle'`, or `'pending'` no marker is drawn (AC2). */
  status: GeolocationStatus;
  /** The resolved coordinates. Only consulted while `status === 'success'`. */
  coords: GeolocationCoords;
};

type MarkerEntry = {
  marker: maplibregl.Marker;
  root: Root;
  element: HTMLDivElement;
};

/**
 * Story 9.5 AC2 — draws the amber "you-are-here" `UserPin` via a dedicated
 * MapLibre `Marker`, modelled on `VenuePinLayer` but with a SINGLE marker
 * rather than a keyed set.
 *
 * Lifecycle (one effect):
 *   - `status === 'success'` → ensure exactly one marker exists at
 *     `[coords.lng, coords.lat]`; on a later coords change, re-position the
 *     SAME marker via `setLngLat` (no tear-down/recreate, so the dot "appears
 *     without jarring jump" — Design Gate → Animation).
 *   - any other status (`'fallback'` / `'idle'` / `'pending'`) → remove the
 *     marker if one exists and draw nothing ("not shown while status is the
 *     Gothenburg fallback").
 *   - unmount → remove the marker and unmount its React root symmetrically.
 *
 * The dot is `pointer-events: none` (see `UserPin`), so it never intercepts a
 * map drag or a venue-pin tap. This layer adds ONLY the dot; the fly-to-user
 * recenter already lives in `OnboardingGate` (grant) and `MapControls`
 * (`status === 'success'`) and is intentionally NOT duplicated here.
 */
export function UserLocationLayer({ status, coords }: UserLocationLayerProps) {
  const { mapInstance } = useMapInstance();
  const entryRef = useRef<MarkerEntry | null>(null);

  useEffect(() => {
    if (!mapInstance) return;

    const removeMarker = () => {
      const entry = entryRef.current;
      if (!entry) return;
      entryRef.current = null;
      entry.marker.remove();
      // Defer Root.unmount() so React can finish the current render pass
      // before the detached root tears down (React 19 warns when unmount
      // runs synchronously inside a render) — same guard as VenuePinLayer.
      queueMicrotask(() => entry.root.unmount());
    };

    if (status !== 'success') {
      removeMarker();
      return;
    }

    const lngLat: [number, number] = [coords.lng, coords.lat];

    if (entryRef.current) {
      // Re-position the existing marker in place — no flicker.
      entryRef.current.marker.setLngLat(lngLat);
      return;
    }

    const element = document.createElement('div');
    const root = createRoot(element);
    const marker = new maplibregl.Marker({ element, anchor: 'center' })
      .setLngLat(lngLat)
      .addTo(mapInstance);
    entryRef.current = { marker, root, element };
    root.render(<UserPin />);
  }, [status, coords.lat, coords.lng, mapInstance]);

  // Symmetric cleanup on unmount.
  useEffect(() => {
    return () => {
      const entry = entryRef.current;
      if (!entry) return;
      entryRef.current = null;
      entry.marker.remove();
      queueMicrotask(() => entry.root.unmount());
    };
  }, []);

  return null;
}
