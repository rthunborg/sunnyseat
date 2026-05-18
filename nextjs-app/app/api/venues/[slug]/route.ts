import { NextRequest, NextResponse } from 'next/server';
import { VENUE_FIXTURE } from '@/lib/services/venues-fixture';
import type {
  GetVenueDetailResponse,
  VenueDataDto,
  VenueDetailDto,
} from '@/lib/types/api';

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

  const detail = buildDetailDto(venue, DETAIL_FIXTURE[venue.slug]);
  const response: GetVenueDetailResponse = {
    venue: detail,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'public, max-age=30, s-maxage=30, must-revalidate',
    },
  });
}

function buildDetailDto(venue: VenueDataDto, fixture?: FixtureDetail): VenueDetailDto {
  const sunWindow = venue.sunWindow
    ? [
        {
          start: venue.sunWindow.start,
          end: venue.sunWindow.end,
          status: venue.currentSunStatus,
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
      peakTime: fixture?.peakTime,
    },
    ...(fixture?.shadowWarningMinutes != null
      ? { shadowWarningMinutes: fixture.shadowWarningMinutes }
      : {}),
  };
}
