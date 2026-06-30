'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { LocateFixed, Minus, Plus, Settings } from 'lucide-react';
import { useMapInstance } from '@/lib/contexts/MapInstanceContext';
import { GOTHENBURG_CENTRE } from '@/lib/constants/geography';
import { DURATION_FLY_MS } from '@/lib/constants/animation';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useSettings } from '@/lib/contexts/SettingsContext';

const ZOOM_DURATION_MS = 200;
const DRAG_FADE_OPACITY = '0.6';

/**
 * Floating glass map control stack (zoom +/-, my location).
 *
 * Mounted to the right edge: high enough on mobile to stay clear of
 * QuickInfo cards and just below the desktop navbar (top offset derived
 * from `--size-desktop-nav-h` plus 28 px breathing room). Each button is
 * a 48×48 GlassButton matching the `Floating Glass Button` token in DESIGN.md.
 *
 * The drag-fade behaviour is wired with direct DOM mutation rather than
 * React state because dragstart/dragend can fire many times during a
 * fast drag and we don't want a re-render storm at 60 fps.
 *
 * Convention: handlers and effects read from the reactive `mapInstance`
 * (from context), NOT `mapRef.current`. The two are kept in sync, but
 * `mapInstance` flows through React's dependency graph, so consumers
 * automatically observe creation/teardown without race conditions. Reach
 * for `mapRef` only when an inner closure must read the latest map after
 * a long-lived listener registers (e.g. third-party callbacks that bind
 * once).
 *
 * Buttons render `disabled` until `mapInstance` is bound — silent no-ops
 * confused both keyboard users and the test harness when clicks before
 * the canvas was ready had no effect.
 *
 * The my-location button consumes `useGeolocation`: requesting permission
 * on click and flying to the resolved coordinates on success. On fallback
 * (denial / unavailable) we keep the current map centre — the user-visible
 * feedback is the absence of a fly animation; the venue search will
 * refetch around the Gothenburg centrum coords already in `coords`.
 *
 * History:
 *   • Story 1.4 — original glass-control stack and drag-fade behaviour.
 *   • Story 1.5 — wired my-location to `useGeolocation`.
 *   • Story 1.6 review — token-driven desktop offset (P14), `aria-disabled`
 *     dropped in favour of native `disabled` (P37), comment refresh (P38).
 *   • Desktop de-duplication — locate + settings are `lg:hidden`; the desktop
 *     top nav owns those actions, so the map stack keeps only zoom +/- there.
 *   • Settings now opens the settings modal (mobile entry point) via
 *     `useSettings()`; it is always enabled (not gated on `mapInstance`).
 */
export function MapControls() {
  const t = useTranslations('map');
  const { mapInstance } = useMapInstance();
  const geolocation = useGeolocation();
  const { openSettings } = useSettings();
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const isMapReady = mapInstance !== null;

  useEffect(() => {
    const node = controlsRef.current;
    if (!mapInstance || !node) return;

    const handleDragStart = () => {
      node.style.opacity = DRAG_FADE_OPACITY;
    };
    const handleDragEnd = () => {
      node.style.opacity = '1';
    };

    mapInstance.on('dragstart', handleDragStart);
    mapInstance.on('dragend', handleDragEnd);

    return () => {
      mapInstance.off('dragstart', handleDragStart);
      mapInstance.off('dragend', handleDragEnd);
    };
  }, [mapInstance]);

  const handleZoomIn = () => {
    mapInstance?.zoomIn({ duration: ZOOM_DURATION_MS });
  };

  const handleZoomOut = () => {
    mapInstance?.zoomOut({ duration: ZOOM_DURATION_MS });
  };

  const handleMyLocation = () => {
    geolocation.requestLocation();
  };

  // Fly to the user's location once the geolocation request resolves to
  // success. On fallback (denial / unavailable) we silently keep the
  // current map centre. For returning users with granted permission, the
  // hook auto-runs on mount and this effect re-centres the map on their
  // current location — the desired returning-user behaviour.
  useEffect(() => {
    if (!mapInstance) return;
    if (geolocation.status !== 'success') return;
    mapInstance.flyTo({
      center: [geolocation.coords.lng, geolocation.coords.lat],
      zoom: GOTHENBURG_CENTRE.zoom,
      duration: DURATION_FLY_MS,
    });
  }, [geolocation.status, geolocation.coords, mapInstance]);

  // Story 1.6 review P14: lg:top-[calc(var(--size-desktop-nav-h)+28px)]
  // derives the desktop top offset from the nav-height token plus 28 px
  // breathing room rather than hard-coding 112 px.
  return (
    <div
      ref={controlsRef}
      data-testid="map-controls"
      className="absolute right-4 top-[calc(env(safe-area-inset-top)+var(--spacing)*50)] z-floating-buttons flex flex-col gap-3 opacity-100 transition-opacity duration-200 ease-default motion-reduce:transition-none lg:top-[calc(var(--size-desktop-nav-h)+var(--spacing)*7)]"
    >
      {/* Locate + settings are `lg:hidden`: on desktop the top nav owns these
          actions, so duplicating them over the map is redundant chrome. They
          remain on mobile, where the bottom nav has no locate/settings and the
          map stack is the only access point. Zoom +/- stay at every breakpoint. */}
      {/* Story 9.5 AC4(a): surface the locate request state. `pending` drives
          an in-flight signal (`aria-busy` + a pulsing icon); `fallback`
          (denied / timeout / unavailable) keeps the button CLICKABLE so the
          user can re-request instead of silently sitting on the centrum
          fallback. The button is only disabled while the map is not yet ready,
          never because the request resolved to the fallback. */}
      <GlassButton
        ariaLabel={t('myLocation')}
        onClick={handleMyLocation}
        disabled={!isMapReady}
        busy={geolocation.status === 'pending'}
        testId="map-control-my-location"
        dataLocateState={geolocation.status}
        className="lg:hidden"
      >
        <LocateFixed
          aria-hidden="true"
          style={{ width: 20, height: 20 }}
          className={
            geolocation.status === 'pending'
              ? 'motion-safe:animate-pulse'
              : undefined
          }
        />
      </GlassButton>
      <GlassButton
        ariaLabel={t('settings')}
        onClick={openSettings}
        testId="map-control-settings"
        className="lg:hidden"
      >
        <Settings aria-hidden="true" style={{ width: 20, height: 20 }} />
      </GlassButton>
      <GlassButton
        ariaLabel={t('zoomIn')}
        onClick={handleZoomIn}
        disabled={!isMapReady}
        testId="map-control-zoom-in"
      >
        <Plus aria-hidden="true" style={{ width: 20, height: 20 }} />
      </GlassButton>
      <GlassButton
        ariaLabel={t('zoomOut')}
        onClick={handleZoomOut}
        disabled={!isMapReady}
        testId="map-control-zoom-out"
      >
        <Minus aria-hidden="true" style={{ width: 20, height: 20 }} />
      </GlassButton>
    </div>
  );
}

type GlassButtonProps = {
  ariaLabel: string;
  onClick: () => void;
  disabled?: boolean;
  /** Story 9.5 AC4(a): in-flight signal → sets `aria-busy="true"`. */
  busy?: boolean;
  /** Story 9.5 AC4(a): exposes the locate request state on the button DOM so
   * tests + assistive styling can branch on idle/pending/success/fallback. */
  dataLocateState?: string;
  testId: string;
  className?: string;
  children: React.ReactNode;
};

function GlassButton({
  ariaLabel,
  onClick,
  disabled = false,
  busy = false,
  dataLocateState,
  testId,
  className,
  children,
}: GlassButtonProps) {
  // Story 1.6 review (P37): native `disabled` already removes the button
  // from the tab order and exposes the disabled state to assistive tech;
  // adding `aria-disabled` on top either is ignored or causes double
  // announcements depending on the AT. Keep only the native attribute.
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-busy={busy || undefined}
      data-locate-state={dataLocateState}
      data-testid={testId}
      className={`size-12 rounded-pill bg-glass-standard backdrop-blur-standard shadow-button-float flex items-center justify-center text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:rounded-pill disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ''}`}
    >
      {children}
    </button>
  );
}
