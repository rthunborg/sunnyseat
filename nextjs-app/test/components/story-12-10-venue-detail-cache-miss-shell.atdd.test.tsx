import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { VenueDetailContent } from '@/components/composed/venue/VenueDetailContent';
import type { VenueDataDto } from '@/lib/types/api';

const FALLBACK_VENUE: VenueDataDto = {
  id: '1',
  venueId: '1',
  venueName: 'Kafé Magasinet',
  venueSlug: 'test-venue-sunny',
  slug: 'test-venue-sunny',
  neighborhood: 'Inom Vallgraven',
  location: { lat: 57.705, lng: 11.97 },
  currentSunStatus: 'Sunny',
  weatherGateState: 'not_gated',
  isPartner: true,
  confidence: 92,
  distanceMeters: 0,
  sunExposurePercent: 95,
  tags: [],
  sunWindow: { start: '13:00', end: '18:30' },
  thumbnail: { alt: 'Uteservering hos Kafé Magasinet', initials: 'KM' },
};

const labels = {
  openMaps: 'ÖPPNA I KARTOR',
  route: 'Visa Rutt',
  routeLoading: 'Öppnar kartor',
  photoPlaceholder: 'Platshållarbild för platsen',
  loading: 'Laddar platsinformation',
  detailsUnavailable: 'Detaljer saknas',
  openingHours: 'Öppettider',
  address: 'Adress',
  sunBadge: '{percent}% sol',
  notSunnyVerdict: 'Inte soligt vid vald tid',
  obscuredHeadline: 'Sol bakom moln',
  sky: {
    label: 'Himmel nu',
    clear: 'Klart',
    partlyCloudy: 'Delvis molnigt',
    overcast: 'Mulet',
    rain: 'Regn',
  },
  city: 'Göteborg',
  openUntil: 'ÖPPET · {time}',
  openUntilLine: 'Öppet till {time}',
  placeholderImageShort: 'Platshållarbild',
  facts: {
    distance: 'AVSTÅND',
    distanceApproximate: '≈ från centrum',
  },
};

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(path.join(process.cwd(), relativePath), 'utf8'));
}

describe('Story 12.10 ATDD - cache-miss detail shell', () => {
  test('[P1] Swedish venue-detail loading announcement is exactly "Laddar platsinformation"', () => {
    const svVenue = readJson('messages/sv/venue.json') as {
      detail?: { loading?: string };
    };
    const enVenue = readJson('messages/en/venue.json') as {
      detail?: { loading?: string };
    };

    expect(svVenue.detail?.loading).toBe('Laddar platsinformation');
    expect(enVenue.detail?.loading).toBeTruthy();
  });

  test('[P1] cache-miss shell keeps identity, aria-busy, visible loading scrim, one polite status, stable skeletons, and retry-capable chrome', () => {
    render(
      <VenueDetailContent
        fallbackVenue={FALLBACK_VENUE}
        detail={undefined}
        isLoading
        currentTime="14:00"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.getByRole('article', { name: 'Kafé Magasinet' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getByRole('heading', { name: 'Kafé Magasinet' })).toBeVisible();
    expect(screen.getAllByRole('status', { name: 'Laddar platsinformation' })).toHaveLength(1);
    expect(screen.getByRole('status', { name: 'Laddar platsinformation' })).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(screen.getByTestId('venue-detail-loading-status')).toHaveClass('sr-only');
    const loadingScrim = screen.getByTestId('venue-detail-loading-scrim');
    expect(loadingScrim).toBeVisible();
    expect(loadingScrim).toHaveClass('backdrop-blur-subtle');
    expect(loadingScrim).not.toHaveClass('backdrop-blur-standard');
    expect(screen.getByTestId('venue-detail-loading-spinner')).toBeVisible();
    expect(screen.getAllByTestId('venue-detail-skeleton').length).toBeGreaterThan(2);
    expect(screen.getByRole('button', { name: 'Visa Rutt' })).toBeEnabled();
  });
});
