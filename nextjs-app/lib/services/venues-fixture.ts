/**
 * STORY 1.4 FIXTURE — replace with Supabase + lib/solar query in Story 2.1
 * (or a dedicated /api/venues backend story). Components must NOT import
 * this file directly — only the API route at app/api/venues/route.ts.
 *
 * Fixture spans ~1 km around Gothenburg's centre (57.7089, 11.9746).
 * Lat/lng pinned to 4 decimal places so screenshot diffs stay deterministic.
 */
import type {
  PredictionUncertaintyDto,
  PredictionUncertaintyLevel,
  PredictionUncertaintyReason,
  VenueDataDto,
  VenueDaySeriesEntry,
  VenueThumbnailDto,
} from '@/lib/types/api';
import { normalizeWeatherGateState } from '@/lib/utils/public-sun';
import { normalizeVenueMediaRenditionUrl } from '@/lib/utils/venue-media';

const TIME_WINDOW_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_THUMBNAIL_ALT_LENGTH = 120;
const MAX_THUMBNAIL_INITIALS_LENGTH = 3;
const FIXTURE_GEOMETRY_INPUT_HASH =
  'g1:0000000000000000000000000000000000000000000000000000000000000000';

const PREDICTION_UNCERTAINTY_LEVELS: ReadonlySet<PredictionUncertaintyLevel> =
  new Set(['low', 'medium', 'high']);

const PREDICTION_UNCERTAINTY_REASONS: ReadonlySet<PredictionUncertaintyReason> =
  new Set([
    'building_shadow_coverage',
    'vegetation',
    'awning',
    'umbrella',
    'bridge',
    'temporary_structure',
    'seasonal_furniture',
    'weather',
    'other',
  ]);

export const VENUE_FIXTURE: VenueDataDto[] = [
  {
    id: '1',
    venueId: '1',
    venueName: 'Kafé Magasinet',
    venueSlug: 'test-venue-sunny',
    slug: 'test-venue-sunny',
    neighborhood: 'Inom Vallgraven',
    location: { lat: 57.7050, lng: 11.9700 },
    currentSunStatus: 'Sunny',
    weatherGateState: 'not_gated',
    skyCondition: 'clear',
    isPartner: true,
    confidence: 92,
    distanceMeters: 0,
    sunExposurePercent: 95,
    predictionEvidence: { geometryInputHash: FIXTURE_GEOMETRY_INPUT_HASH },
    tags: ['Innergård', 'Hund ok', 'Wifi', 'Bakverk'],
    sunWindow: { start: '13:00', end: '18:30' },
    // Story 11.4 (AC1) CI-determinism / 11.9 (AC2): the seed path returns raw
    // VENUE_FIXTURE (no VENUE_DETAIL_SEED merge), so opening hours must live on the
    // fixture itself to reach the list DTO on the flag-OFF path CI runs. Now the
    // per-weekday structure — every weekday closes 22:00 so the derived "Öppet till
    // 22:00" is byte-stable regardless of the CI run-day. Present-case for the
    // "renders opening hours" branch; other fixtures omit it to prove the absent →
    // renders-nothing branch. Mirrors VENUE_DETAIL_SEED['test-venue-sunny'].
    openingHours: {
      '1': { open: '11:00', close: '22:00' },
      '2': { open: '11:00', close: '22:00' },
      '3': { open: '11:00', close: '22:00' },
      '4': { open: '11:00', close: '22:00' },
      '5': { open: '11:00', close: '22:00' },
      '6': { open: '11:00', close: '22:00' },
      '7': { open: '11:00', close: '22:00' },
    },
    thumbnail: {
      alt: 'Uteservering hos Kafé Magasinet',
      initials: 'KM',
    },
  },
  {
    id: '2',
    venueId: '2',
    venueName: 'Bryggerietsoltak',
    venueSlug: 'bryggeriet-soltak',
    slug: 'bryggeriet-soltak',
    neighborhood: 'Linnéstaden',
    location: { lat: 57.7035, lng: 11.9520 },
    currentSunStatus: 'Sunny',
    weatherGateState: 'not_gated',
    skyCondition: 'clear',
    isPartner: false,
    confidence: 88,
    distanceMeters: 0,
    sunExposurePercent: 89,
    predictionEvidence: { geometryInputHash: FIXTURE_GEOMETRY_INPUT_HASH },
    tags: ['Morgonsol', 'Take-away', 'Surdeg'],
    sunWindow: { start: '12:45', end: '18:15' },
    // Story 11.4 (AC1) / 11.9 (AC2): second present-case fixture for the
    // opening-hours line on the seed path (per-weekday shape, closes 23:00 every
    // day). Mirrors VENUE_DETAIL_SEED['bryggeriet-soltak'].
    openingHours: {
      '1': { open: '11:00', close: '23:00' },
      '2': { open: '11:00', close: '23:00' },
      '3': { open: '11:00', close: '23:00' },
      '4': { open: '11:00', close: '23:00' },
      '5': { open: '11:00', close: '23:00' },
      '6': { open: '11:00', close: '23:00' },
      '7': { open: '11:00', close: '23:00' },
    },
    thumbnail: {
      alt: 'Uteservering hos Bryggerietsoltak',
      initials: 'BS',
    },
  },
  {
    id: '3',
    venueId: '3',
    venueName: 'Solplats Magasinsgatan',
    venueSlug: 'solplats-magasinsgatan',
    slug: 'solplats-magasinsgatan',
    neighborhood: 'Inom Vallgraven',
    location: { lat: 57.7080, lng: 11.9655 },
    currentSunStatus: 'Sunny',
    weatherGateState: 'not_gated',
    skyCondition: 'partly-cloudy',
    isPartner: false,
    confidence: 78,
    distanceMeters: 0,
    sunExposurePercent: 82,
    predictionEvidence: { geometryInputHash: FIXTURE_GEOMETRY_INPUT_HASH },
    tags: ['Kanal', 'Skaldjur'],
    sunWindow: { start: '14:00', end: '17:45' },
    thumbnail: {
      alt: 'Uteservering på Solplats Magasinsgatan',
      initials: 'SM',
    },
  },
  {
    id: '4',
    venueId: '4',
    venueName: 'Café Halvvägs',
    venueSlug: 'cafe-halvvags',
    slug: 'cafe-halvvags',
    neighborhood: 'Vasastaden',
    location: { lat: 57.7000, lng: 11.9710 },
    currentSunStatus: 'Partial',
    weatherGateState: 'not_gated',
    skyCondition: 'partly-cloudy',
    isPartner: false,
    confidence: 70,
    distanceMeters: 0,
    sunExposurePercent: 65,
    predictionEvidence: { geometryInputHash: FIXTURE_GEOMETRY_INPUT_HASH },
    tags: ['Parasoller', 'Specialkaffe'],
    predictionUncertainty: {
      level: 'medium',
      reasons: ['building_shadow_coverage'],
    },
    sunWindow: { start: '15:10', end: '17:20' },
    thumbnail: {
      alt: 'Uteservering hos Café Halvvägs',
      initials: 'CH',
    },
  },
  {
    id: '5',
    venueId: '5',
    venueName: 'Brygghuset Lerum',
    venueSlug: 'brygghuset-lerum',
    slug: 'brygghuset-lerum',
    neighborhood: 'Haga',
    location: { lat: 57.7115, lng: 11.9605 },
    currentSunStatus: 'Partial',
    weatherGateState: 'not_gated',
    skyCondition: 'partly-cloudy',
    isPartner: false,
    confidence: 66,
    distanceMeters: 0,
    sunExposurePercent: 58,
    predictionEvidence: { geometryInputHash: FIXTURE_GEOMETRY_INPUT_HASH },
    tags: ['Innergård', 'Hund ok'],
    predictionUncertainty: {
      level: 'medium',
      reasons: ['vegetation', 'awning', 'seasonal_furniture'],
    },
    sunWindow: { start: '13:35', end: '16:50' },
    thumbnail: {
      alt: 'Uteservering hos Brygghuset Lerum',
      initials: 'BL',
    },
  },
  {
    id: '6',
    venueId: '6',
    venueName: 'Skuggans Hus',
    venueSlug: 'skuggans-hus',
    slug: 'skuggans-hus',
    neighborhood: 'Inom Vallgraven',
    location: { lat: 57.7095, lng: 11.9785 },
    currentSunStatus: 'Shaded',
    weatherGateState: 'not_gated',
    skyCondition: 'overcast',
    isPartner: false,
    confidence: 80,
    distanceMeters: 0,
    sunExposurePercent: 22,
    predictionEvidence: { geometryInputHash: FIXTURE_GEOMETRY_INPUT_HASH },
    tags: ['Svalt', 'Lunch'],
    sunWindow: { start: '16:10', end: '16:45' },
    thumbnail: {
      alt: 'Uteservering hos Skuggans Hus',
      initials: 'SH',
    },
  },
  {
    id: '7',
    venueId: '7',
    venueName: 'Bistro Bakgården',
    venueSlug: 'bistro-bakgarden',
    slug: 'bistro-bakgarden',
    neighborhood: 'Vasastaden',
    location: { lat: 57.7060, lng: 11.9820 },
    currentSunStatus: 'Shaded',
    weatherGateState: 'not_gated',
    skyCondition: 'overcast',
    isPartner: false,
    confidence: 75,
    distanceMeters: 0,
    sunExposurePercent: 14,
    predictionEvidence: { geometryInputHash: FIXTURE_GEOMETRY_INPUT_HASH },
    tags: ['Bakgård', 'Kväll'],
    sunWindow: { start: '11:30', end: '12:20' },
    thumbnail: {
      alt: 'Uteservering hos Bistro Bakgården',
      initials: 'BB',
    },
  },
];

export function normalizeVenueForResponse(venue: VenueDataDto): VenueDataDto {
  const {
    predictionUncertainty: rawPredictionUncertainty,
    sunDaySeries: rawSunDaySeries,
    ...venueWithoutUncertainty
  } = venue as VenueDataDto & {
    predictionUncertainty?: unknown;
    sunDaySeries?: unknown;
  };
  const rawWindowGate = (venue.sunWindow as { weatherGateState?: unknown } | undefined)
    ?.weatherGateState;
  const sunWindow =
    venue.sunWindow &&
    TIME_WINDOW_PATTERN.test(venue.sunWindow.start) &&
    TIME_WINDOW_PATTERN.test(venue.sunWindow.end)
      ? {
          start: venue.sunWindow.start,
          end: venue.sunWindow.end,
          ...(rawWindowGate !== undefined
            ? { weatherGateState: normalizePublicPotentialGateState(rawWindowGate) }
            : {}),
        }
      : undefined;
  const rawThumbnail = venue.thumbnail as
    | (VenueThumbnailDto & { cardUrl?: unknown; heroUrl?: unknown; url?: unknown })
    | undefined;
  const alt = normalizeShortText(rawThumbnail?.alt, MAX_THUMBNAIL_ALT_LENGTH);
  const initials = normalizeInitials(rawThumbnail?.initials);
  const cardUrl = normalizeVenueMediaRenditionUrl(rawThumbnail?.cardUrl, {
    slug: venue.slug,
    rendition: 'card',
  });
  const heroUrl = normalizeVenueMediaRenditionUrl(rawThumbnail?.heroUrl, {
    slug: venue.slug,
    rendition: 'hero',
  });
  const url = normalizeThumbnailUrl(rawThumbnail?.url);
  const predictionUncertainty = normalizePredictionUncertainty(rawPredictionUncertainty);
  const sunDaySeries = normalizeSunDaySeries(rawSunDaySeries);

  return {
    ...venueWithoutUncertainty,
    weatherGateState: normalizeWeatherGateStateForStatus(
      venue.currentSunStatus,
      (venue as VenueDataDto & { weatherGateState?: unknown }).weatherGateState,
    ),
    sunWindow,
    ...(sunDaySeries ? { sunDaySeries } : {}),
    thumbnail:
      alt || initials || cardUrl || heroUrl || url
        ? {
            alt: alt ?? venue.venueName,
            initials: initials ?? venue.venueName.slice(0, 2).toUpperCase(),
            ...(cardUrl ? { cardUrl } : {}),
            ...(heroUrl ? { heroUrl } : {}),
            ...(url ? { url } : {}),
          }
        : undefined,
    ...(predictionUncertainty ? { predictionUncertainty } : {}),
  };
}

function normalizeWeatherGateStateForStatus(
  currentSunStatus: VenueDataDto['currentSunStatus'],
  value: unknown,
): VenueDataDto['weatherGateState'] {
  // CloudObscured is itself the output of the Epic 10 cloud/rain gate. A stale
  // producer must not pair it with a public-sunny gate value at the DTO boundary.
  // Normal producers still derive both fields directly from weather inputs.
  return currentSunStatus === 'CloudObscured' ? 'gated' : normalizeWeatherGateState(value);
}

function normalizePublicPotentialGateState(value: unknown): 'not_gated' | 'unknown' {
  return normalizeWeatherGateState(value) === 'not_gated' ? 'not_gated' : 'unknown';
}

function normalizeSunDaySeries(value: unknown): VenueDaySeriesEntry[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((entry): entry is VenueDaySeriesEntry => Boolean(entry) && typeof entry === 'object')
    .map((entry) => ({
      ...entry,
      weatherGateState: normalizeWeatherGateStateForStatus(
        entry.currentSunStatus,
        (entry as VenueDaySeriesEntry & { weatherGateState?: unknown }).weatherGateState,
      ),
    }));
}

function normalizePredictionUncertainty(value: unknown): PredictionUncertaintyDto | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { level, reasons } = value as {
    level?: unknown;
    reasons?: unknown;
  };
  if (!isPredictionUncertaintyLevel(level)) return undefined;
  const normalizedReasons = normalizePredictionUncertaintyReasons(reasons);
  if (normalizedReasons.length === 0) return undefined;
  return {
    level,
    reasons: normalizedReasons,
  };
}

function isPredictionUncertaintyLevel(
  value: unknown,
): value is PredictionUncertaintyLevel {
  return (
    typeof value === 'string' &&
    PREDICTION_UNCERTAINTY_LEVELS.has(value as PredictionUncertaintyLevel)
  );
}

function normalizePredictionUncertaintyReasons(
  value: unknown,
): PredictionUncertaintyReason[] {
  if (!Array.isArray(value)) return [];
  const reasons: PredictionUncertaintyReason[] = [];
  const seen = new Set<PredictionUncertaintyReason>();
  for (const rawReason of value) {
    const reason = normalizePredictionUncertaintyReason(rawReason);
    if (!reason || seen.has(reason)) continue;
    seen.add(reason);
    reasons.push(reason);
  }
  return reasons;
}

function normalizePredictionUncertaintyReason(
  value: unknown,
): PredictionUncertaintyReason | null {
  if (typeof value !== 'string') return null;
  const reason = value.trim();
  if (!reason) return null;
  if (PREDICTION_UNCERTAINTY_REASONS.has(reason as PredictionUncertaintyReason)) {
    return reason as PredictionUncertaintyReason;
  }
  return 'other';
}

function normalizeShortText(value: string | undefined, maxLength: number): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return Array.from(trimmed).slice(0, maxLength).join('');
}

function normalizeInitials(value: string | undefined): string | undefined {
  const trimmed = normalizeShortText(value, MAX_THUMBNAIL_INITIALS_LENGTH);
  return trimmed?.toUpperCase();
}

function normalizeThumbnailUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString();
  } catch {
    return undefined;
  }
  return undefined;
}
