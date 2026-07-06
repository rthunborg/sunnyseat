import { NextRequest, NextResponse } from 'next/server';
import { normalizeVenueForResponse } from '@/lib/services/venues-fixture';
import {
  getVenueBySlug,
  storedVenueDetail,
  toVenueData,
  type StoredVenueDetail,
} from '@/lib/services/venue-store';
import { getReviewSummaryForVenueFromPersistence } from '@/lib/services/venue-reviews-persistence';
import {
  applyPlannerSelectionToVenue,
  parseVenuePlannerParams,
} from '@/lib/services/venue-planner';
import {
  applyFixtureWeatherAvailability,
  resolveFixtureSunFreshness,
} from '@/lib/services/weather-freshness-fixture';
import {
  applyRealSunEngine,
  resolveRequestedAt,
  shouldUseRealSunEngine,
} from '@/lib/services/sun-engine';
import { badRequest } from '@/lib/utils/api-errors';
import { greatCircleMeters } from '@/lib/utils/geo';
import { formatPlannerTime, parsePlannerTime } from '@/lib/utils/time-planner';
import {
  validateLatitude,
  validateLongitude,
} from '@/lib/utils/validation';
import type {
  GetVenueDetailResponse,
  SunFreshnessMeta,
  VenueDataDto,
  VenueDetailDto,
} from '@/lib/types/api';
import { sunFreshnessHeaders } from '@/lib/utils/sun-freshness';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

type DetailTimelineProjection = {
  peakTime?: string;
  windowStatus?: VenueDataDto['currentSunStatus'];
};

type DetailCoordinates = {
  lat: number;
  lng: number;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const planner = parseVenuePlannerParams(_request.nextUrl.searchParams);
  if (!planner.ok) {
    return NextResponse.json(
      { detail: planner.detail, status: 400 },
      { status: 400 },
    );
  }
  const coordinates = parseDetailCoordinates(_request.nextUrl.searchParams);
  if (!coordinates.ok) return badRequest(coordinates.detail);
  const { slug } = await context.params;
  let decodedSlug: string;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch {
    return NextResponse.json(
      { detail: 'Invalid venue slug', status: 400 },
      { status: 400 },
    );
  }
  const stored = await getVenueBySlug(decodedSlug);

  if (!stored) {
    return NextResponse.json(
      { detail: `Venue not found: ${decodedSlug}`, status: 404 },
      { status: 404 },
    );
  }

  // STORY 8.3 — real engine swap behind the frozen VenueDetailDto. Default
  // (flag off) path is byte-identical to the 8.2 seed; the real path feeds the
  // timeline projection (sunWindow/status/peakTime) from the engine and bypasses
  // the planner + fixture-weather stages.
  const useRealEngine = shouldUseRealSunEngine();
  const now = new Date();
  let adjustedVenue: VenueDataDto;
  let freshness: SunFreshnessMeta;
  let timelineProjection: DetailTimelineProjection | undefined;

  if (useRealEngine) {
    const requestedAt = resolveRequestedAt(planner.selection, now);
    const outcome = await applyRealSunEngine(stored, requestedAt, now);
    freshness = outcome.freshness;
    const base = withDetailDistance(outcome.venue, coordinates.value);
    adjustedVenue = normalizeVenueForResponse(base);
    timelineProjection = {
      ...(outcome.peakTime ? { peakTime: outcome.peakTime } : {}),
      windowStatus: adjustedVenue.currentSunStatus,
    };
  } else {
    freshness = resolveFixtureSunFreshness(_request.nextUrl.searchParams);
    // Strip the detail block before the normalize/weather/planner pipeline (each
    // stage spreads `...venue`); detail is applied explicitly via buildDetailDto.
    const venue = withDetailDistance(toVenueData(stored), coordinates.value);
    const normalizedVenue = normalizeVenueForResponse(venue);
    const weatherAdjustedVenue = applyFixtureWeatherAvailability(normalizedVenue, freshness);
    adjustedVenue = applyPlannerSelectionToVenue(weatherAdjustedVenue, planner.selection);
    timelineProjection = planner.selection
      ? timelineProjectionFromAdjustedVenue(adjustedVenue)
      : undefined;
  }

  let reviewSummary: VenueDetailDto['reviewSummary'];
  try {
    reviewSummary = await getReviewSummaryForVenueFromPersistence(adjustedVenue);
  } catch {
    reviewSummary = undefined;
  }
  const detail = buildDetailDto(
    adjustedVenue,
    storedVenueDetail(stored),
    timelineProjection,
    reviewSummary,
  );
  const response: GetVenueDetailResponse = {
    venue: detail,
    meta: freshness,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, max-age=30, s-maxage=30, must-revalidate',
      ...sunFreshnessHeaders(freshness),
    },
  });
}

function buildDetailDto(
  venue: VenueDataDto,
  fixture?: StoredVenueDetail,
  timelineProjection?: DetailTimelineProjection,
  reviewSummary?: VenueDetailDto['reviewSummary'],
): VenueDetailDto {
  const rawWindowStatus = timelineProjection?.windowStatus ?? venue.currentSunStatus;
  // Story 10.2 (AC2) + Iteration-2 review fix: on the LIVE real-engine path this
  // status can be 'CloudObscured' after applyCloudGate. The sun-window timeline is
  // the geometric "when it clears" POTENTIAL, not a weather signal, so remap the
  // obscured value back to the geometric 'Partial' tier here — mirroring the client
  // `timelineFromListVenue` fallback remap so the server-loaded detail timeline and
  // the pre-load fallback render identically. Without this the window ships
  // 'CloudObscured', which SunTimeline/bestWindowLabel do not handle → a blank bar
  // labelled "Shaded" (the exact dishonest label AC4 exists to prevent).
  const timelineWindowStatus =
    rawWindowStatus === 'CloudObscured' ? 'Partial' : rawWindowStatus;
  // STORY 11.9 (AC3): the stored `peak_time` fixture fallback is gone — peakTime
  // is now ONLY the live timeline-derived engine/planner value. No surface loses a
  // real value (the fixture fallback was a stored-column echo, not a computed one).
  const peakTime = timelineProjection?.peakTime;
  const sunWindow = venue.sunWindow
    ? [
        {
          start: venue.sunWindow.start,
          end: venue.sunWindow.end,
          status: timelineWindowStatus,
        },
      ]
    : [];

  return {
    ...venue,
    reviewSummary,
    description:
      fixture?.description ??
      `${venue.venueName} har uteservering i ${venue.neighborhood}.`,
    address: fixture?.address ?? venue.neighborhood,
    // STORY 11.9 (AC2): the per-weekday structure passes through; an absent-hours
    // venue serializes an EMPTY object (closed every weekday → the render layer
    // shows nothing) rather than the fabricated `{ display: 'Öppettider saknas' }`.
    // The render layer derives the display/closesAt from the current weekday.
    openingHours: fixture?.openingHours ?? {},
    timeline: {
      timezone: 'Europe/Stockholm',
      range: { start: '06:00', end: '21:00' },
      windows: sunWindow,
      ...(peakTime ? { peakTime } : {}),
    },
  };
}

function withDetailDistance(
  venue: VenueDataDto,
  coordinates: DetailCoordinates | undefined,
): VenueDataDto {
  if (!coordinates) return venue;
  return {
    ...venue,
    distanceMeters: greatCircleMeters(
      coordinates.lat,
      coordinates.lng,
      venue.location.lat,
      venue.location.lng,
    ),
  };
}

function parseDetailCoordinates(
  params: URLSearchParams,
): { ok: true; value: DetailCoordinates | undefined } | { ok: false; detail: string } {
  if (params.has('latitude') || params.has('longitude')) {
    return { ok: false, detail: 'Use canonical coordinate parameters: lat and lng' };
  }
  const hasLat = params.has('lat');
  const hasLng = params.has('lng');
  if (!hasLat && !hasLng) return { ok: true, value: undefined };
  if (!hasLat || !hasLng) {
    return { ok: false, detail: 'Use lat and lng together for venue detail distance' };
  }
  const lat = parseStrictCoordinate(params.get('lat'));
  if (lat === null) return { ok: false, detail: 'Invalid lat: must be a finite number' };
  if (!validateLatitude(lat)) {
    return { ok: false, detail: 'Latitude must be between -90 and 90 degrees' };
  }
  const lng = parseStrictCoordinate(params.get('lng'));
  if (lng === null) return { ok: false, detail: 'Invalid lng: must be a finite number' };
  if (!validateLongitude(lng)) {
    return { ok: false, detail: 'Longitude must be between -180 and 180 degrees' };
  }
  return { ok: true, value: { lat, lng } };
}

function parseStrictCoordinate(value: string | null): number | null {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timelineProjectionFromAdjustedVenue(
  venue: VenueDataDto,
): DetailTimelineProjection {
  return {
    peakTime: peakTimeFromSunWindow(venue.sunWindow),
    windowStatus: venue.currentSunStatus,
  };
}

function peakTimeFromSunWindow(
  sunWindow: VenueDataDto['sunWindow'],
): string | undefined {
  if (!sunWindow) return undefined;
  const start = parsePlannerTime(sunWindow.start);
  const end = parsePlannerTime(sunWindow.end);
  if (start === null || end === null) return undefined;
  return formatPlannerTime((start + end) / 2);
}
