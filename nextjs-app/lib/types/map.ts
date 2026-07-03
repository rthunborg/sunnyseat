import type { VenueSunStatus } from '@/lib/types/api';

/**
 * Map-related type definitions for Story 1.4 onwards.
 *
 * MapLibre's coordinate convention is `[lng, lat]` — match it on viewports
 * and marker positions, even though most UX/business code uses `{ lat, lng }`.
 */

export type MapViewport = {
  center: [lng: number, lat: number];
  zoom: number;
  bearing: number;
  pitch: number;
};

/**
 * Minimal fields a pin renders from. Mapped from `VenueDataDto` at the
 * MapView boundary (see `mapVenueDtoToPinData` in `MapView.tsx`) so the
 * client API DTO does not leak into render-only components.
 */
export type VenuePinData = {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  sunStatus: VenueSunStatus;
  sunExposurePercent: number;
  isPartner: boolean;
};

/**
 * Discrete pin visual variants. The selected variant applies only to sunny
 * pins per AC3 — shaded pins do not morph on selection, so they have a
 * single rendered state regardless of selection.
 *
 * Round 1 P26 dropped the originally-specified `shaded-selected` variant
 * because no render path actually consumed it (the shaded pill renders
 * identically regardless of selection state). Story 1.4 Task 1.1 wording
 * was updated in Round 2 to reflect this.
 *
 * Story 10.2 adds `'obscured'` — the weather-gated "Sol bakom moln" pill.
 * Like `'shaded'`, it has a single rendered state (no selected-morph
 * variant): a CloudObscured venue is not the amber-sunny cross-fade case,
 * so it mirrors the shaded pill's single-state treatment.
 */
export type VenuePinSelection = 'sunny' | 'shaded' | 'obscured' | 'sunny-selected';

// `GOTHENBURG_CENTRE` moved to `nextjs-app/lib/constants/geography.ts`
// in Round 2 — runtime constants don't belong in a types module.
// Re-exported below for backward compatibility with existing imports.
export { GOTHENBURG_CENTRE } from '@/lib/constants/geography';
