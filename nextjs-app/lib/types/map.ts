import type { VenueSunStatus, WeatherGateState } from '@/lib/types/api';

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
  weatherGateState: WeatherGateState;
  isPartner: boolean;
};

/**
 * Discrete pin data variants. Story 12.6 collapses public pins to exactly two
 * semantic shapes: amber sunny, or grey not-sunny. Selection/hover/focus can
 * emphasize either shape but must not introduce a third data state.
 */
export type VenuePinSelection = 'sunny' | 'shaded';

// `GOTHENBURG_CENTRE` moved to `nextjs-app/lib/constants/geography.ts`
// in Round 2 — runtime constants don't belong in a types module.
// Re-exported below for backward compatibility with existing imports.
export { GOTHENBURG_CENTRE } from '@/lib/constants/geography';
