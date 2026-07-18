import type { VenueDetailDto } from '@/lib/types/api';

export function resolveForcedVisualVenueDetail(
  slug: string | null,
  forcedState: string | null,
): VenueDetailDto | null {
  if (process.env.NODE_ENV === 'production') return null;
  if (slug !== 'test-venue-sunny') return null;

  // Story 10.2 (Task 5): a deterministic obscured detail surface for the
  // visual/axe/e2e gates WITHOUT live Met.no weather. The `venue-detail-obscured`
  // state renders the SAME seeded venue with the weather-gated headline
  // (`CloudObscured` + `skyCondition: 'overcast'`) so the muted detail chrome
  // is reachable on the fixture/CI path. The geometric layer (sunWindow,
  // timeline, sunExposurePercent) is UNCHANGED — it is the "when it clears"
  // potential the two-signal model preserves (AC2).
  if (forcedState === 'venue-detail-obscured') {
    return {
      ...FORCED_VISUAL_VENUE_DETAIL,
      currentSunStatus: 'CloudObscured',
      weatherGateState: 'gated',
      skyCondition: 'overcast',
    };
  }

  if (forcedState !== 'venue-detail' && forcedState !== 'feedback' && forcedState !== 'review') {
    return null;
  }

  return FORCED_VISUAL_VENUE_DETAIL;
}

const FORCED_VISUAL_VENUE_DETAIL: VenueDetailDto = {
  id: '1',
  venueId: '1',
  venueName: 'Kafé Magasinet',
  venueSlug: 'test-venue-sunny',
  slug: 'test-venue-sunny',
  neighborhood: 'Linné',
  location: { lat: 57.6986, lng: 11.9467 },
  currentSunStatus: 'Sunny',
  weatherGateState: 'not_gated',
  skyCondition: 'clear',
  isPartner: false,
  confidence: 95,
  distanceMeters: 420,
  sunExposurePercent: 95,
  tags: ['Innergård', 'Hund ok', 'Wifi', 'Bakverk'],
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
  // Story 11.9 (AC2): per-weekday shape (closes 22:00 every day) so the visual gate
  // derives the byte-identical "Öppet till 22:00" / "ÖPPET · 22:00" on any run-day.
  openingHours: {
    '1': { open: '11:00', close: '22:00' },
    '2': { open: '11:00', close: '22:00' },
    '3': { open: '11:00', close: '22:00' },
    '4': { open: '11:00', close: '22:00' },
    '5': { open: '11:00', close: '22:00' },
    '6': { open: '11:00', close: '22:00' },
    '7': { open: '11:00', close: '22:00' },
  },
  timeline: {
    timezone: 'Europe/Stockholm',
    range: { start: '06:00', end: '21:00' },
    windows: [
      { start: '11:00', end: '15:00', status: 'Sunny' },
    ],
    peakTime: '14:00',
  },
};

export function currentTimeLabel(date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Stockholm',
  }).format(date);
}
