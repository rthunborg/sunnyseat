'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import maplibregl from 'maplibre-gl';
import { useMapInstance } from '@/lib/contexts/MapInstanceContext';
import { useMapSelection } from '@/lib/contexts/MapSelectionContext';
import { VenuePin } from './VenuePin';
import type { VenuePinData } from '@/lib/types/map';

type AriaResolver = (venue: VenuePinData, percent: number) => string;

type VenuePinLayerProps = {
  venues: VenuePinData[];
};

type MarkerEntry = {
  marker: maplibregl.Marker;
  root: Root;
  element: HTMLDivElement;
  venue: VenuePinData;
  /** Cached fingerprint of the venue fields the pin actually renders.
   * Used to short-circuit re-renders when nothing visible has changed. */
  fingerprint: string;
  /** MutationObserver guarding the wrapper from MapLibre re-applying
   * `role="button"` / `aria-label="Map marker"` after attach. */
  observer: MutationObserver;
};

const ENTRANCE_DURATION_MS = 150;
const STAGGER_STEP_MS = 30;
const STAGGER_MAX_INDEX = 30;

/**
 * Story 1.4 — manages MapLibre `Marker` instances per venue.
 *
 * Each pin's React tree is mounted into a detached DOM element via
 * `createRoot` and handed to MapLibre. Two effects coordinate lifecycle:
 *   1. A venue-driven effect adds/removes markers to match the data set
 *      and re-renders pins whose displayed data has changed.
 *   2. A selection-driven effect re-renders only the pins whose state
 *      actually changes (previously selected + newly selected) so the
 *      majority of pins stay untouched.
 *
 * A click handler on the map deselects when the user taps the canvas
 * background (AC4). Clicks on overlay DOM (controls, pills, future
 * sheets) are ignored via a target-canvas check.
 */
export function VenuePinLayer({ venues }: VenuePinLayerProps) {
  const { mapInstance } = useMapInstance();
  const { selectedVenueId, selectVenue, toggleVenue } = useMapSelection();
  // Story 1.6 review (P36): null (matchMedia not yet resolved) treated
  // as true — pin baseline opacity is 0 in the entrance path; with
  // `?? false` reduced-motion users would see a one-frame stagger flash
  // before the hook reads true. See VenuePin.tsx for the full divergence
  // rationale (the OnboardingScreen `?? false` default is intentional and
  // tuned to its different baseline).
  const shouldReduceMotion = useReducedMotion() ?? true;
  const t = useTranslations('map');

  // Resolve the three pin aria variants once per render rather than once
  // per pin — wrapping each `createRoot` subtree with its own
  // `<NextIntlClientProvider>` so a deeply-nested `useTranslations()`
  // would work shipped 50 copies of the entire messages object on every
  // marker-render pass (Story 1.4 R2 deferred-work).
  const resolveAria: AriaResolver = (venue, percent) => {
    const name = venue.name;
    if (venue.sunStatus === 'Sunny') return t('pinSunnyAria', { name, percent });
    if (venue.sunStatus === 'Partial') return t('pinPartialAria', { name, percent });
    // Story 10.2 (AC4): the obscured pin announces "sol bakom moln", not
    // "shaded". Placed BEFORE the shaded fallback so a CloudObscured venue
    // never collapses to the shaded aria. `{percent}` is the geometric
    // solläge that survives the gate (AC2, position not weather).
    if (venue.sunStatus === 'CloudObscured') return t('pinObscuredAria', { name, percent });
    return t('pinShadedAria', { name, percent });
  };

  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  // Refs are seeded with the values from the very first render so the
  // initial venues effect reads up-to-date data even before the
  // ref-sync effect runs (sequencing was previously a one-frame stale
  // window — Round 2 R1-P3 follow-up).
  const prevSelectedRef = useRef<string | null>(selectedVenueId);
  const selectedRef = useRef<string | null>(selectedVenueId);
  const toggleRef = useRef(toggleVenue);
  const resolveAriaRef = useRef<AriaResolver>(resolveAria);
  const venueIdsRef = useRef<Set<string>>(new Set(venues.map((venue) => venue.id)));
  // Story 1.6 review (P32): the entrance stagger is now per-batch — every
  // venues-effect run starts the stagger index at 0 and increments only
  // for venues NEW to this batch. The original "absolute insertion order"
  // scheme (Story 1.4 R2 deferred-work) collapsed to a 900 ms wall-of-
  // pins after seenIds passed 30, because every new pin clamped to the
  // STAGGER_MAX_INDEX. Per-batch counting preserves the cascade visual
  // for every refetch regardless of session length.
  const staggerTimersRef = useRef<Set<number>>(new Set());

  // Keep refs in sync with the latest props/state. `useLayoutEffect`
  // guarantees the writes happen before any consumer `useEffect` runs in
  // the same commit, so the venues / selection effects always observe
  // up-to-date values regardless of declaration order.
  useLayoutEffect(() => {
    selectedRef.current = selectedVenueId;
    toggleRef.current = toggleVenue;
    resolveAriaRef.current = resolveAria;
    venueIdsRef.current = new Set(venues.map((venue) => venue.id));
  });

  useEffect(() => {
    if (!mapInstance) return;
    const map = mapInstance;

    const currentIds = new Set(venues.map((v) => v.id));

    for (const [id, entry] of markersRef.current.entries()) {
      if (!currentIds.has(id)) {
        entry.observer.disconnect();
        entry.marker.remove();
        entry.root.unmount();
        markersRef.current.delete(id);
      }
    }

    const seenInThisRender = new Set<string>();
    // Story 1.6 review (P32): per-batch stagger counter. Increments only
    // for venues that are NEW to this effect run; venues already mounted
    // skip the counter entirely. Resets to 0 at the start of every batch
    // so the cascade plays for every refetch instead of collapsing.
    let newPinIndex = 0;

    venues.forEach((venue) => {
      // Guard against duplicate ids in the input array — overwriting an
      // existing entry in the Map without `.remove()` / `.unmount()`
      // would leak the prior marker and React tree.
      if (seenInThisRender.has(venue.id)) return;
      seenInThisRender.add(venue.id);

      const existing = markersRef.current.get(venue.id);
      const fingerprint = venueFingerprint(venue);

      if (existing) {
        existing.venue = venue;
        existing.marker.setLngLat([venue.lng, venue.lat]);
        // Re-render the React tree only when the rendered fields changed
        // (sunStatus, percent, name, lat/lng on display). Skipping when
        // the fingerprint matches keeps refetch noise off the GPU.
        if (existing.fingerprint !== fingerprint) {
          existing.fingerprint = fingerprint;
          renderEntry(
            existing,
            selectedRef.current === venue.id,
            () => toggleRef.current(venue.id),
            resolveAriaRef.current,
          );
        }
        return;
      }

      const element = document.createElement('div');
      element.style.willChange = 'opacity';
      // MapLibre adds `role="button"` and `aria-label="Map marker"` to
      // every marker DOM. We render our own focusable `<button>` inside,
      // so the outer wrapper claiming to be a button creates a nested-
      // interactive a11y violation (axe `nested-interactive`).
      //
      // Story 1.6 review (D4 → option A): rather than adding
      // `role="presentation"` (which Task 5.5 forbids verbatim — "do NOT
      // add role=presentation shims to mask violations"), strip the
      // attributes MapLibre injected so screen readers see only our
      // inner focusable `<button>`. Functionally equivalent for axe
      // (nested-interactive resolved either way) but doesn't pattern-
      // match the forbidden shim.
      //
      // Story 1.6 review (W7 → P50): a MutationObserver re-strips the
      // attributes if MapLibre's internals re-apply them asynchronously
      // (e.g. on update events). The observer is per-marker and is
      // disconnected at marker.remove().
      const stripWrapperRoleAttrs = () => {
        element.removeAttribute('role');
        element.removeAttribute('aria-label');
      };
      stripWrapperRoleAttrs();
      if (shouldReduceMotion) {
        element.style.opacity = '1';
      } else {
        element.style.opacity = '0';
        element.style.transition = `opacity ${ENTRANCE_DURATION_MS}ms ease-out`;
        const stagger = Math.min(newPinIndex, STAGGER_MAX_INDEX) * STAGGER_STEP_MS;
        newPinIndex += 1;
        const timerId = window.setTimeout(() => {
          element.style.opacity = '1';
          staggerTimersRef.current.delete(timerId);
        }, stagger);
        staggerTimersRef.current.add(timerId);
      }

      const root = createRoot(element);
      const marker = new maplibregl.Marker({ element, anchor: 'bottom' })
        .setLngLat([venue.lng, venue.lat])
        .addTo(map);
      // MapLibre's attach overwrites our role-strip; re-apply, then
      // observe for any future async re-application.
      stripWrapperRoleAttrs();
      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (
            m.type === 'attributes' &&
            (m.attributeName === 'role' || m.attributeName === 'aria-label')
          ) {
            stripWrapperRoleAttrs();
            break;
          }
        }
      });
      observer.observe(element, {
        attributes: true,
        attributeFilter: ['role', 'aria-label'],
      });

      const entry: MarkerEntry = {
        marker,
        root,
        element,
        venue,
        fingerprint,
        observer,
      };
      markersRef.current.set(venue.id, entry);

      renderEntry(
        entry,
        selectedRef.current === venue.id,
        () => toggleRef.current(venue.id),
        resolveAriaRef.current,
      );
    });
  }, [venues, mapInstance, shouldReduceMotion]);

  useEffect(() => {
    const prev = prevSelectedRef.current;
    const next = selectedVenueId;

    if (prev !== null && prev !== next) {
      const entry = markersRef.current.get(prev);
      if (entry) {
        renderEntry(
          entry,
          false,
          () => toggleRef.current(prev),
          resolveAriaRef.current,
        );
      }
    }
    if (next !== null && next !== prev) {
      const entry = markersRef.current.get(next);
      if (entry) {
        renderEntry(
          entry,
          true,
          () => toggleRef.current(next),
          resolveAriaRef.current,
        );
      } else {
        // Selection points at a venue that is no longer in the rendered
        // set (filter change, refetch dropped it, etc.). Clear the
        // dangling id so context state matches reality — otherwise the
        // user has to canvas-tap to recover.
        //
        // Story 2.1: forced selected-venue URLs can set selection during
        // the same commit where markers are still mounting. If the id is
        // present in the current venue data, keep it; the venues effect
        // will render the marker selected once the marker registry is
        // populated.
        if (venueIdsRef.current.has(next)) return;
        selectVenue(null);
      }
    }

    prevSelectedRef.current = next;
  }, [selectedVenueId, selectVenue]);

  useEffect(() => {
    if (!mapInstance) return;
    const map = mapInstance;

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      // Only deselect on direct canvas hits — overlay DOM (controls,
      // pills, future sheets) bubbles to the same MapLibre `click`, but
      // those should never be treated as background. Synthetic events
      // without an `originalEvent` (defensive for fuzzed inputs) are
      // ignored.
      const original = e.originalEvent;
      if (!original) return;
      const target = original.target as Element | null;
      if (!target) return;
      const canvas = map.getCanvas();
      if (target !== canvas) return;
      // Skip clicks that originated inside a MapLibre control container
      // — those should never deselect even if the click bubbles to the
      // canvas (e.g. transparent edge of attribution control).
      if (target instanceof Element && target.closest('.maplibregl-ctrl')) return;
      selectVenue(null);
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [mapInstance, selectVenue]);

  useEffect(() => {
    const markers = markersRef.current;
    const timers = staggerTimersRef.current;
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers.clear();

      const entries = Array.from(markers.values());
      markers.clear();
      entries.forEach((entry) => {
        entry.observer.disconnect();
        entry.marker.remove();
      });
      // Defer Root.unmount() so React can finish its current render pass
      // before the detached roots tear themselves down (React 19 warns
      // when unmount runs synchronously inside a render).
      queueMicrotask(() => {
        entries.forEach((entry) => entry.root.unmount());
      });
    };
  }, []);

  return null;
}

function renderEntry(
  entry: MarkerEntry,
  isSelected: boolean,
  onClick: () => void,
  resolveAria: AriaResolver,
) {
  entry.element.style.zIndex = isSelected ? 'var(--z-floating-buttons)' : 'var(--z-pin)';
  const safePercent = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Number.isFinite(entry.venue.sunExposurePercent)
          ? entry.venue.sunExposurePercent
          : 0,
      ),
    ),
  );
  const ariaLabel = resolveAria(entry.venue, safePercent);
  entry.root.render(
    <VenuePin
      venue={entry.venue}
      isSelected={isSelected}
      onClick={onClick}
      ariaLabel={ariaLabel}
    />,
  );
}

function venueFingerprint(v: VenuePinData): string {
  // `isPartner` is excluded — Story 1.4 doesn't render it, so changes
  // would re-render pins for no visible reason. Story 5.1 (golden pin /
  // partner enhancement) re-introduces it when the field is rendered.
  // *(Target: Story 5.1)*  ← BMAD-grep tag: `rg "\*\(Target: 5"` will
  // surface this when 5.1 starts so the rollout doesn't silently miss
  // the fingerprint update.
  return `${v.id}|${v.name}|${v.sunStatus}|${v.sunExposurePercent}|${v.lat}|${v.lng}`;
}
