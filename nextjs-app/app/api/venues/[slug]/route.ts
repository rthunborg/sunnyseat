import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeVenueForResponse,
  VENUE_FIXTURE,
} from '@/lib/services/venues-fixture';
import {
  applyPlannerSelectionToVenue,
  parseVenuePlannerParams,
} from '@/lib/services/venue-planner';
import {
  applyFixtureWeatherAvailability,
  resolveFixtureSunFreshness,
} from '@/lib/services/weather-freshness-fixture';
import { badRequest } from '@/lib/utils/api-errors';
import { greatCircleMeters } from '@/lib/utils/geo';
import { formatPlannerTime, parsePlannerTime } from '@/lib/utils/time-planner';
import {
  validateLatitude,
  validateLongitude,
} from '@/lib/utils/validation';
import type {
  GetVenueDetailResponse,
  VenueDataDto,
  VenueDetailDto,
} from '@/lib/types/api';
import { sunFreshnessHeaders } from '@/lib/utils/sun-freshness';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

type FixtureDetail = {
  description: string;
  address: string;
  openingHours: VenueDetailDto['openingHours'];
  peakTime: string;
  shadowWarningMinutes?: number;
};

type DetailTimelineProjection = {
  peakTime?: string;
  windowStatus?: VenueDataDto['currentSunStatus'];
};

type DetailCoordinates = {
  lat: number;
  lng: number;
};

const DETAIL_FIXTURE: Record<string, FixtureDetail> = {
  'test-venue-sunny': {
    description:
      'Stor uteservering med eftermiddagssol, skyddade bord och nära till både spårvagn och kajstråk.',
    address: 'Tredje Långgatan 9, 413 03 Göteborg',
    openingHours: { display: 'Öppet till 22:00', closesAt: '22:00' },
    peakTime: '15:30',
    shadowWarningMinutes: 45,
  },
  'bryggeriet-soltak': {
    description:
      'Taknära sittplatser med bred solträff under lunch och eftermiddag.',
    address: 'Linnégatan 21, 413 04 Göteborg',
    openingHours: { display: 'Öppet till 23:00', closesAt: '23:00' },
    peakTime: '15:00',
  },
  'solplats-magasinsgatan': {
    description:
      'Lugn innerstadsterrass med bäst sol när eftermiddagen vänder mot kväll.',
    address: 'Magasinsgatan 17, 411 18 Göteborg',
    openingHours: { display: 'Öppet till 21:00', closesAt: '21:00' },
    peakTime: '15:30',
  },
  'cafe-halvvags': {
    description:
      'Avslappnat kvarterscafé med delvis sol på de yttre borden.',
    address: 'Vasagatan 32, 411 24 Göteborg',
    openingHours: { display: 'Öppet till 20:00', closesAt: '20:00' },
    peakTime: '16:00',
  },
  'brygghuset-lerum': {
    description:
      'Skyddad gårdsmiljö med kortare solfönster och gott om sittplatser.',
    address: 'Haga Nygata 8, 413 01 Göteborg',
    openingHours: { display: 'Öppet till 22:00', closesAt: '22:00' },
    peakTime: '14:30',
  },
  'skuggans-hus': {
    description:
      'Sval uteservering som bara får korta solglimtar mellan husfasaderna.',
    address: 'Södra Hamngatan 12, 411 14 Göteborg',
    openingHours: { display: 'Öppet till 19:00', closesAt: '19:00' },
    peakTime: '16:30',
  },
  'bistro-bakgarden': {
    description:
      'Bakgårdsservering med mest skugga, men en kort lunchsol vid klart väder.',
    address: 'Engelbrektsgatan 44, 411 37 Göteborg',
    openingHours: { display: 'Öppet till 21:00', closesAt: '21:00' },
    peakTime: '12:00',
    shadowWarningMinutes: 0,
  },
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
  const freshness = resolveFixtureSunFreshness(_request.nextUrl.searchParams);
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
  const venue = VENUE_FIXTURE.find(
    (candidate) => candidate.slug === decodedSlug || candidate.venueSlug === decodedSlug,
  );

  if (!venue) {
    return NextResponse.json(
      { detail: `Venue not found: ${decodedSlug}`, status: 404 },
      { status: 404 },
    );
  }

  const venueWithDistance = coordinates.value
    ? {
        ...venue,
        distanceMeters: greatCircleMeters(
          coordinates.value.lat,
          coordinates.value.lng,
          venue.location.lat,
          venue.location.lng,
        ),
      }
    : venue;
  const normalizedVenue = normalizeVenueForResponse(venueWithDistance);
  const weatherAdjustedVenue = applyFixtureWeatherAvailability(normalizedVenue, freshness);
  const adjustedVenue = applyPlannerSelectionToVenue(weatherAdjustedVenue, planner.selection);
  const detail = buildDetailDto(
    adjustedVenue,
    DETAIL_FIXTURE[venue.slug],
    planner.selection
      ? timelineProjectionFromAdjustedVenue(adjustedVenue)
      : undefined,
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
  fixture?: FixtureDetail,
  timelineProjection?: DetailTimelineProjection,
): VenueDetailDto {
  const timelineWindowStatus = timelineProjection?.windowStatus ?? venue.currentSunStatus;
  const peakTime = timelineProjection?.peakTime ?? fixture?.peakTime;
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
    description:
      fixture?.description ??
      `${venue.venueName} har uteservering i ${venue.neighborhood}.`,
    address: fixture?.address ?? venue.neighborhood,
    openingHours: fixture?.openingHours ?? { display: 'Öppettider saknas' },
    timeline: {
      timezone: 'Europe/Stockholm',
      range: { start: '06:00', end: '21:00' },
      windows: sunWindow,
      ...(peakTime ? { peakTime } : {}),
    },
    ...(fixture?.shadowWarningMinutes != null
      ? { shadowWarningMinutes: fixture.shadowWarningMinutes }
      : {}),
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
