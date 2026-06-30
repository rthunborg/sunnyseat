import type { VenueDetailDto } from '@/lib/types/api';

export function resolveForcedVisualVenueDetail(
  slug: string | null,
  forcedState: string | null,
): VenueDetailDto | null {
  if (process.env.NODE_ENV === 'production') return null;
  if (
    (forcedState !== 'venue-detail' && forcedState !== 'feedback' && forcedState !== 'review') ||
    slug !== 'test-venue-sunny'
  ) {
    return null;
  }

  return {
    id: '1',
    venueId: '1',
    venueName: 'Kafé Magasinet',
    venueSlug: 'test-venue-sunny',
    slug: 'test-venue-sunny',
    neighborhood: 'Linné',
    location: { lat: 57.6986, lng: 11.9467 },
    currentSunStatus: 'Sunny',
    skyCondition: 'clear',
    isPartner: false,
    confidence: 95,
    distanceMeters: 420,
    sunExposurePercent: 95,
    sunWindow: { start: '11:00', end: '15:00' },
    thumbnail: {
      alt: 'Uteservering hos Kafé Magasinet',
      initials: 'KM',
    },
    reviewSummary: {
      averageRating: 4.5,
      reviewCount: 2,
    },
    description:
      'Stor uteservering med eftermiddagssol, skyddade bord och nära till både spårvagn och kajstråk.',
    address: 'Tredje Långgatan 9, 413 03 Göteborg',
    openingHours: { display: 'Öppet till 22:00', closesAt: '22:00' },
    timeline: {
      timezone: 'Europe/Stockholm',
      range: { start: '06:00', end: '21:00' },
      windows: [
        { start: '11:00', end: '15:00', status: 'Sunny' },
      ],
      peakTime: '14:00',
    },
  };
}

export function currentTimeLabel(date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Stockholm',
  }).format(date);
}
