import type { VenueDataDto, VenueDetailDto, VenueThumbnailDto } from '@/lib/types/api';

const PHOTO_FALLBACK_VERSION = 'v2026-07-missing';
const FALLBACK_SUPABASE_ORIGIN = 'https://sunnyseat.supabase.co';
const FORCED_PHOTO_WEBP_DATA_URL = [
  'data:image/webp;base64,',
  'UklGRuwDAABXRUJQVlA4WAoAAAAgAAAAPwAAJwAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABh',
  'Y3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'AlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJD',
  'AAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZ',
  'WiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAAN',
  'WQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAx',
  'ADZWUDgg/gEAANAMAJ0BKkAAKAA+KQ6FQiGGVyWZBgChLEAXDITPuPXvxV5yWN2T/WHO9gdQBvH/lAFMewmYTlzx',
  'qy3qBedOVExPELKw4XTa1nghzhSQwXSN9Gsxz5/ooIcFEm5UTnHKv9/9G4KhIHV8NTSx/jaQgAD+',
  '/b8R8MBs8SxR89h/i93d9VcfMLykhKJVxLzes6H+zrv99Q1yn/95P0dsEY9xFde///GL9VHhsc',
  'fa7H/7g+NK46lzuemQ7xz3bEPV9xK2Rt6Lcfv+a1ukvzbHMy3vfCx9ACAKy/RxjknbYPnenOc',
  '1sIcjn1UBoHn/kZWD9ZSasswGgzeyCTQFb9UFZX2kkbIMbeJeEVhfe6JTEuxHt0GLn0oPDDBdtvuyke',
  'FM/Kx/Fe/u3uqv75Fte5vDUG/wsvp10Vg9ip6/uefk3rSL7/wlVpy5o5zi/CIAUTXDmsM5/uv8q',
  'LX+pufP/DHf+7fwvgXI31W49Hl8IOr5OLMrafcpj3WN60p9s/9MxKf0v8rllIYEjzw//yK',
  'DPf9HbbfgrXTh7AsqOXrHfv3+z0sAZjV7HNC2uYAm+u9TawjPei7uP2VW7OqrIFCjPaFve',
  'KFeGaaUPXvdJGx2EB6YqBPZPwNTriMTeIJEihmQK+O8didoSbDVyCjiaXaPf1gjiPO0Vj5xOS',
  'NhSJwcB6wLwOoAAA==',
].join('');

export type ForcedVenuePhotoState = 'venue-photo-loaded' | 'venue-photo-fallback';

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

  if (isForcedVenuePhotoState(forcedState)) {
    return withForcedVenuePhotoThumbnail(FORCED_VISUAL_VENUE_DETAIL, forcedState);
  }

  if (forcedState !== 'venue-detail' && forcedState !== 'feedback' && forcedState !== 'review') {
    return null;
  }

  return FORCED_VISUAL_VENUE_DETAIL;
}

export function isForcedVenuePhotoState(
  forcedState: string | null,
): forcedState is ForcedVenuePhotoState {
  return forcedState === 'venue-photo-loaded' || forcedState === 'venue-photo-fallback';
}

export function withForcedVenuePhotoThumbnail<T extends VenueDataDto>(
  venue: T,
  forcedState: ForcedVenuePhotoState,
): T {
  const thumbnail: VenueThumbnailDto = {
    alt: venue.thumbnail?.alt?.trim() || `Uteservering hos ${venue.venueName}`,
    initials: venue.thumbnail?.initials?.trim() || venue.venueName.slice(0, 2).toUpperCase(),
    cardUrl: forcedVenueMediaUrl(forcedState, 'card'),
    heroUrl: forcedVenueMediaUrl(forcedState, 'hero'),
  };
  return {
    ...venue,
    thumbnail,
  };
}

function forcedVenueMediaUrl(
  forcedState: ForcedVenuePhotoState,
  rendition: 'card' | 'hero',
): string {
  if (forcedState === 'venue-photo-loaded') {
    return FORCED_PHOTO_WEBP_DATA_URL;
  }

  const configuredOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || FALLBACK_SUPABASE_ORIGIN;
  const origin = configuredOrigin.replace(/\/+$/, '');
  const version = PHOTO_FALLBACK_VERSION;
  return `${origin}/storage/v1/object/public/venue-media/test-venue-sunny/${version}/${rendition}.webp`;
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
  predictionEvidence: {
    geometryInputHash: 'g1:0000000000000000000000000000000000000000000000000000000000000000',
  },
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
