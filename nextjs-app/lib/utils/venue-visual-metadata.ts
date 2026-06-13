import type { VenueDataDto, VenueDetailDto } from '@/lib/types/api';

export type VenueVisualMetadata = {
  type: string;
  rating: string;
  reviewCount: string;
  tags: string[];
  exposure: string;
  distance?: string;
  bestAt?: string;
  seats: string;
  price: string;
};

type MetadataLocale = 'sv' | 'en';

const BY_SLUG: Record<string, Record<MetadataLocale, VenueVisualMetadata>> = {
  'test-venue-sunny': {
    sv: {
      type: 'Kafé',
      rating: '4.7',
      reviewCount: '842',
      tags: ['Innergård', 'Hund ok', 'Wifi', 'Bakverk'],
      exposure: 'Söder',
      distance: '340 m',
      bestAt: '13:00',
      seats: '~24',
      price: 'kr · kr',
    },
    en: {
      type: 'Cafe',
      rating: '4.7',
      reviewCount: '842',
      tags: ['Courtyard', 'Dogs ok', 'Wi-Fi', 'Pastries'],
      exposure: 'South',
      distance: '340 m',
      bestAt: '13:00',
      seats: '~24',
      price: 'kr · kr',
    },
  },
  'bryggeriet-soltak': {
    sv: {
      type: 'Bar',
      rating: '4.6',
      reviewCount: '318',
      tags: ['Morgonsol', 'Take-away', 'Surdeg'],
      exposure: 'Väster',
      seats: '~32',
      price: 'kr · kr',
    },
    en: {
      type: 'Bar',
      rating: '4.6',
      reviewCount: '318',
      tags: ['Morning sun', 'Take-away', 'Sourdough'],
      exposure: 'West',
      seats: '~32',
      price: 'kr · kr',
    },
  },
  'solplats-magasinsgatan': {
    sv: {
      type: 'Kafé',
      rating: '4.5',
      reviewCount: '221',
      tags: ['Kanal', 'Skaldjur'],
      exposure: 'Söder',
      seats: '~18',
      price: 'kr · kr',
    },
    en: {
      type: 'Cafe',
      rating: '4.5',
      reviewCount: '221',
      tags: ['Canal', 'Seafood'],
      exposure: 'South',
      seats: '~18',
      price: 'kr · kr',
    },
  },
  'cafe-halvvags': {
    sv: {
      type: 'Kafé',
      rating: '4.8',
      reviewCount: '156',
      tags: ['Parasoller', 'Specialkaffe'],
      exposure: 'Öster',
      seats: '~20',
      price: 'kr',
    },
    en: {
      type: 'Cafe',
      rating: '4.8',
      reviewCount: '156',
      tags: ['Parasols', 'Specialty coffee'],
      exposure: 'East',
      seats: '~20',
      price: 'kr',
    },
  },
  'brygghuset-lerum': {
    sv: {
      type: 'Restaurang',
      rating: '4.4',
      reviewCount: '204',
      tags: ['Innergård', 'Hund ok'],
      exposure: 'Väster',
      seats: '~28',
      price: 'kr · kr',
    },
    en: {
      type: 'Restaurant',
      rating: '4.4',
      reviewCount: '204',
      tags: ['Courtyard', 'Dogs ok'],
      exposure: 'West',
      seats: '~28',
      price: 'kr · kr',
    },
  },
  'skuggans-hus': {
    sv: {
      type: 'Restaurang',
      rating: '4.3',
      reviewCount: '97',
      tags: ['Svalt', 'Lunch'],
      exposure: 'Norr',
      seats: '~16',
      price: 'kr · kr',
    },
    en: {
      type: 'Restaurant',
      rating: '4.3',
      reviewCount: '97',
      tags: ['Cool shade', 'Lunch'],
      exposure: 'North',
      seats: '~16',
      price: 'kr · kr',
    },
  },
  'bistro-bakgarden': {
    sv: {
      type: 'Bistro',
      rating: '4.6',
      reviewCount: '144',
      tags: ['Bakgård', 'Kväll'],
      exposure: 'Öster',
      seats: '~22',
      price: 'kr · kr',
    },
    en: {
      type: 'Bistro',
      rating: '4.6',
      reviewCount: '144',
      tags: ['Backyard', 'Evening'],
      exposure: 'East',
      seats: '~22',
      price: 'kr · kr',
    },
  },
};

const DEFAULT_METADATA: Record<MetadataLocale, VenueVisualMetadata> = {
  sv: {
    type: 'Kafé',
    rating: '4.7',
    reviewCount: '128',
    tags: ['Innergård', 'Hund ok'],
    exposure: 'Söder',
    bestAt: '13:00',
    seats: '~24',
    price: 'kr · kr',
  },
  en: {
    type: 'Cafe',
    rating: '4.7',
    reviewCount: '128',
    tags: ['Courtyard', 'Dogs ok'],
    exposure: 'South',
    bestAt: '13:00',
    seats: '~24',
    price: 'kr · kr',
  },
};

export function getVenueVisualMetadata(
  venue: VenueDataDto | VenueDetailDto,
  locale = 'sv',
): VenueVisualMetadata {
  const key: MetadataLocale = locale === 'en' ? 'en' : 'sv';
  const metadata = BY_SLUG[venue.slug]?.[key] ?? BY_SLUG[venue.venueSlug]?.[key] ?? DEFAULT_METADATA[key];
  if (!venue.reviewSummary) return metadata;
  return {
    ...metadata,
    rating: venue.reviewSummary.averageRating === null
      ? '-'
      : venue.reviewSummary.averageRating.toFixed(1),
    reviewCount: String(venue.reviewSummary.reviewCount),
  };
}

export function formatVenueDistance(meters?: number): string {
  if (!Number.isFinite(meters)) return '-';
  if ((meters ?? 0) >= 1000) return `${((meters ?? 0) / 1000).toFixed(1)} km`;
  return `${Math.round(meters ?? 0)} m`;
}

export function formatVenueSunPercent(value?: number): string {
  const safeValue = Number.isFinite(value) ? Math.round(value ?? 0) : 0;
  return `${safeValue}%`;
}

export function formatVenueSunLabel(
  venue: VenueDataDto | VenueDetailDto,
  locale = 'sv',
): string {
  if (venue.currentSunStatus === 'Shaded' || venue.sunExposurePercent < 35) {
    return locale === 'en' ? 'MOSTLY SHADE' : 'MEST SKUGGA';
  }
  if (venue.currentSunStatus === 'Partial' || venue.sunExposurePercent < 75) {
    return locale === 'en' ? 'PARTIAL SUN' : 'DELVIS SOL';
  }
  return locale === 'en' ? 'FULL SUN' : 'FULL SOL';
}

export function formatPeakHour(venue: VenueDetailDto | VenueDataDto): string {
  if ('timeline' in venue && venue.timeline.peakTime) {
    return venue.timeline.peakTime.slice(0, 5);
  }
  if (venue.sunWindow?.start) return venue.sunWindow.start;
  return '13:00';
}
