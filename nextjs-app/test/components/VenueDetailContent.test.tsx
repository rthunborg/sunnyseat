import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VenueDetailContent } from '@/components/composed/venue/VenueDetailContent';
import type { VenueDataDto, VenueDetailDto } from '@/lib/types/api';

const LIST_VENUE: VenueDataDto = {
  id: '1',
  venueId: '1',
  venueName: 'Kafé Magasinet',
  venueSlug: 'test-venue-sunny',
  slug: 'test-venue-sunny',
  neighborhood: 'Inom Vallgraven',
  location: { lat: 57.705, lng: 11.97 },
  currentSunStatus: 'Sunny',
  isPartner: true,
  confidence: 92,
  distanceMeters: 0,
  sunExposurePercent: 95,
  sunWindow: { start: '13:00', end: '18:30' },
  thumbnail: {
    alt: 'Uteservering hos Kafé Magasinet',
    initials: 'KM',
  },
};

const DETAIL: VenueDetailDto = {
  ...LIST_VENUE,
  description: 'Stor uteservering med eftermiddagssol.',
  address: 'Tredje Långgatan 9, Göteborg',
  openingHours: { display: 'Öppet till 22:00', closesAt: '22:00' },
  timeline: {
    timezone: 'Europe/Stockholm',
    range: { start: '06:00', end: '21:00' },
    windows: [{ start: '13:00', end: '18:30', status: 'Sunny' }],
    peakTime: '15:30',
  },
  shadowWarningMinutes: 45,
};

const labels = {
  sectionTitle: 'SOLTIDER IDAG',
  peakTime: 'Toppar kl {time}',
  openMaps: 'ÖPPNA I KARTOR',
  route: 'Visa Rutt',
  photoPlaceholder: 'Platshållarbild för platsen',
  loading: 'Laddar platsdetaljer',
  detailsUnavailable: 'Detaljer saknas',
  openingHours: 'Öppettider',
  address: 'Adress',
  shadowWarning: 'Blir skuggigt om {minutes} min',
  sunBadge: '{percent}% sol',
  timeline: {
    ariaLabel: 'Soltider idag',
    currentTime: 'Nu {time}',
    sunnyWindow: 'Sol {start}-{end}',
    partialWindow: 'Delvis sol {start}-{end}',
    shadedWindow: 'Skugga {start}-{end}',
  },
};

describe('VenueDetailContent', () => {
  it('renders detail content, warning, maps link, and route CTA', () => {
    render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Kafé Magasinet' })).toHaveClass('text-display-xl');
    expect(screen.getByText('Stor uteservering med eftermiddagssol.')).toHaveClass('text-body-lg');
    expect(screen.getByText('SOLTIDER IDAG')).toHaveClass('text-heading-sm');
    expect(screen.getByText('Blir skuggigt om 45 min')).toHaveClass('text-error');
    expect(screen.getByLabelText('95% sol')).toContainHTML('svg');
    expect(screen.getByRole('link', { name: /ÖPPNA I KARTOR/i })).toHaveAttribute(
      'href',
      expect.stringContaining('57.705'),
    );
    expect(screen.getByRole('button', { name: 'Visa Rutt' })).toBeEnabled();
  });

  it('shows the venue name immediately while detail fields are loading', () => {
    render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={undefined}
        isLoading
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Kafé Magasinet' })).toBeInTheDocument();
    expect(screen.getByLabelText('Laddar platsdetaljer')).toBeInTheDocument();
    expect(screen.getAllByTestId('venue-detail-skeleton').length).toBeGreaterThan(1);
  });

  it('does not render future feedback or review flows in this story', () => {
    render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.queryByText(/Lämna ett omdöme/i)).toBeNull();
    expect(screen.queryByText(/Stämmer sol/i)).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
