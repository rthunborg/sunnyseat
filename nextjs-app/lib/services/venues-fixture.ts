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
} from '@/lib/types/api';

const TIME_WINDOW_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_THUMBNAIL_ALT_LENGTH = 120;
const MAX_THUMBNAIL_INITIALS_LENGTH = 3;

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
    skyCondition: 'clear',
    isPartner: true,
    confidence: 92,
    distanceMeters: 0,
    sunExposurePercent: 95,
    sunWindow: { start: '13:00', end: '18:30' },
    thumbnail: {
      alt: 'Uteservering hos Kafé Magasinet',
      initials: 'KM',
      url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=560&q=80',
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
    skyCondition: 'clear',
    isPartner: false,
    confidence: 88,
    distanceMeters: 0,
    sunExposurePercent: 89,
    sunWindow: { start: '12:45', end: '18:15' },
    thumbnail: {
      alt: 'Uteservering hos Bryggerietsoltak',
      initials: 'BS',
      url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=560&q=80',
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
    skyCondition: 'partly-cloudy',
    isPartner: false,
    confidence: 78,
    distanceMeters: 0,
    sunExposurePercent: 82,
    sunWindow: { start: '14:00', end: '17:45' },
    thumbnail: {
      alt: 'Uteservering på Solplats Magasinsgatan',
      initials: 'SM',
      url: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=560&q=80',
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
    skyCondition: 'partly-cloudy',
    isPartner: false,
    confidence: 70,
    distanceMeters: 0,
    sunExposurePercent: 65,
    predictionUncertainty: {
      level: 'medium',
      reasons: ['building_shadow_coverage'],
    },
    sunWindow: { start: '15:10', end: '17:20' },
    thumbnail: {
      alt: 'Uteservering hos Café Halvvägs',
      initials: 'CH',
      url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=560&q=80',
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
    skyCondition: 'partly-cloudy',
    isPartner: false,
    confidence: 66,
    distanceMeters: 0,
    sunExposurePercent: 58,
    predictionUncertainty: {
      level: 'medium',
      reasons: ['vegetation', 'awning', 'seasonal_furniture'],
    },
    sunWindow: { start: '13:35', end: '16:50' },
    thumbnail: {
      alt: 'Uteservering hos Brygghuset Lerum',
      initials: 'BL',
      url: 'https://images.unsplash.com/photo-1508424757105-b6d5ad9329d0?auto=format&fit=crop&w=560&q=80',
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
    skyCondition: 'overcast',
    isPartner: false,
    confidence: 80,
    distanceMeters: 0,
    sunExposurePercent: 22,
    sunWindow: { start: '16:10', end: '16:45' },
    thumbnail: {
      alt: 'Uteservering hos Skuggans Hus',
      initials: 'SH',
      url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=560&q=80',
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
    skyCondition: 'overcast',
    isPartner: false,
    confidence: 75,
    distanceMeters: 0,
    sunExposurePercent: 14,
    sunWindow: { start: '11:30', end: '12:20' },
    thumbnail: {
      alt: 'Uteservering hos Bistro Bakgården',
      initials: 'BB',
      url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=560&q=80',
    },
  },
];

export function normalizeVenueForResponse(venue: VenueDataDto): VenueDataDto {
  const {
    predictionUncertainty: rawPredictionUncertainty,
    ...venueWithoutUncertainty
  } = venue as VenueDataDto & { predictionUncertainty?: unknown };
  const sunWindow =
    venue.sunWindow &&
    TIME_WINDOW_PATTERN.test(venue.sunWindow.start) &&
    TIME_WINDOW_PATTERN.test(venue.sunWindow.end)
      ? venue.sunWindow
      : undefined;
  const alt = normalizeShortText(venue.thumbnail?.alt, MAX_THUMBNAIL_ALT_LENGTH);
  const initials = normalizeInitials(venue.thumbnail?.initials);
  const url = normalizeThumbnailUrl(venue.thumbnail?.url);
  const predictionUncertainty = normalizePredictionUncertainty(rawPredictionUncertainty);

  return {
    ...venueWithoutUncertainty,
    sunWindow,
    thumbnail:
      alt || initials || url
        ? {
            alt: alt ?? venue.venueName,
            initials: initials ?? venue.venueName.slice(0, 2).toUpperCase(),
            ...(url ? { url } : {}),
          }
        : undefined,
    ...(predictionUncertainty ? { predictionUncertainty } : {}),
  };
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

function normalizeThumbnailUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
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
