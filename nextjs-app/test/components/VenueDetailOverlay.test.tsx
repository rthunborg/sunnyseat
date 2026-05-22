import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VenueDetailOverlay } from '@/components/custom/venue/VenueDetailOverlay';
import type { VenueDataDto, VenueDetailDto } from '@/lib/types/api';

const FALLBACK: VenueDataDto = {
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
  thumbnail: { alt: 'Uteservering hos Kafé Magasinet', initials: 'KM' },
};

const DETAIL: VenueDetailDto = {
  ...FALLBACK,
  description: 'Stor uteservering med eftermiddagssol.',
  address: 'Tredje Långgatan 9, Göteborg',
  openingHours: { display: 'Öppet till 22:00', closesAt: '22:00' },
  timeline: {
    timezone: 'Europe/Stockholm',
    range: { start: '06:00', end: '21:00' },
    windows: [{ start: '13:00', end: '18:30', status: 'Sunny' }],
    peakTime: '15:30',
  },
};

const labels = {
  close: 'Stäng platsdetaljer',
  favourite: 'Spara plats',
  share: 'Dela plats',
  sectionTitle: 'Solprognos idag',
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
  city: 'Göteborg',
  openUntil: 'ÖPPET · {time}',
  placeholderImageShort: 'Platshållarbild',
  facts: {
    distance: 'AVSTÅND',
    exposure: 'EXPONERING',
    bestAt: 'BÄST KL.',
    outdoorSeats: 'PLATSER UTE',
  },
  timeline: {
    ariaLabel: 'Soltider idag',
    currentTime: 'Nu {time}',
    sunnyWindow: 'Sol {start}-{end}',
    partialWindow: 'Delvis sol {start}-{end}',
    shadedWindow: 'Skugga {start}-{end}',
  },
};

describe('VenueDetailOverlay mobile', () => {
  it('renders a full mobile detail sheet with token-backed shell classes', () => {
    render(
      <VenueDetailOverlay
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    const sheet = screen.getByTestId('mobile-venue-detail-sheet');
    expect(sheet).toHaveAttribute('role', 'dialog');
    expect(sheet).toHaveClass('rounded-t-sheet-full', 'shadow-sheet-full-up');
    expect(screen.getByRole('heading', { name: 'Kafé Magasinet' })).toBeInTheDocument();
  });

  it('keeps the venue name visible while detail data is loading', () => {
    render(
      <VenueDetailOverlay
        fallbackVenue={FALLBACK}
        detail={undefined}
        isLoading
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Kafé Magasinet' })).toBeInTheDocument();
    expect(screen.getByLabelText('Laddar platsdetaljer')).toBeInTheDocument();
  });

  it('dismisses from the keyboard-operable drag handle', () => {
    const onDismiss = vi.fn();
    render(
      <VenueDetailOverlay
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={onDismiss}
        onRoute={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByTestId('mobile-venue-detail-handle'), {
      key: 'ArrowDown',
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses when the close handle is activated like a normal button', () => {
    const onDismiss = vi.fn();
    render(
      <VenueDetailOverlay
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={onDismiss}
        onRoute={vi.fn()}
      />,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Stäng platsdetaljer' })[1]);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('uses opacity-only motion when reduced motion is requested', () => {
    render(
      <VenueDetailOverlay
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        reducedMotion
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    expect(screen.getByTestId('mobile-venue-detail-sheet')).toHaveAttribute(
      'data-reduced-motion',
      'true',
    );
  });
});

describe('VenueDetailOverlay desktop', () => {
  it('renders a 390px right-side panel with utility chrome controls', () => {
    render(
      <VenueDetailOverlay
        mode="desktop"
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
      />,
    );

    const panel = screen.getByTestId('desktop-venue-detail-panel');
    expect(panel).toHaveClass('right-0', 'w-venue-detail-panel');
    expect(screen.getByRole('button', { name: 'Stäng platsdetaljer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spara plats' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Dela plats' })).toBeEnabled();
  });

  it('desktop close button dismisses the panel', () => {
    const onDismiss = vi.fn();
    render(
      <VenueDetailOverlay
        mode="desktop"
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={onDismiss}
        onRoute={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Stäng platsdetaljer' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('keeps the route placeholder disabled until routing lands', () => {
    render(
      <VenueDetailOverlay
        mode="desktop"
        fallbackVenue={FALLBACK}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onDismiss={vi.fn()}
        onRoute={vi.fn()}
        routeDisabled
      />,
    );

    expect(screen.getByRole('button', { name: 'Visa Rutt' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Visa Rutt' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
