import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  VenueDetailContent,
  peakTimeFromTimeline,
} from '@/components/composed/venue/VenueDetailContent';
import type { VenueDataDto, VenueDetailDto } from '@/lib/types/api';
import type { PredictionUncertaintyDisplayLabels } from '@/lib/utils/prediction-uncertainty-display';
import { expectNoSensitiveSourceTerms } from '../setup/sensitive-source-terms';

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
  sectionTitle: 'Solprognos idag',
  peakTime: 'Toppar kl {time}',
  bestWindow: 'Bäst {start}-{end}',
  openMaps: 'ÖPPNA I KARTOR',
  route: 'Visa Rutt',
  routeLoading: 'Öppnar kartor',
  photoPlaceholder: 'Platshållarbild för platsen',
  loading: 'Laddar platsdetaljer',
  detailsUnavailable: 'Detaljer saknas',
  openingHours: 'Öppettider',
  address: 'Adress',
  shadowWarning: 'Blir skuggigt om {minutes} min',
  sunBadge: '{percent}% sol',
  confidence: 'Säkerhet',
  confidenceApproximate: 'cirka',
  confidenceUnavailable: 'Säkerhet saknas',
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

const uncertaintyLabels: PredictionUncertaintyDisplayLabels = {
  description:
    'Vi räknar på solens läge, byggnadsskuggor och väder. Träd, markiser, parasoller, broar och tillfälliga konstruktioner kan påverka platsen.',
  accessible: '{label}. {description}',
  levels: {
    low: 'Låg osäkerhet',
    medium: 'Osäker prognos',
    high: 'Mer osäker prognos',
  },
  short: {
    building_shadow_coverage: 'Byggnadsskuggor mer osäkra',
    obstruction: 'Lokala hinder kan påverka',
    weather: 'Vädret gör prognosen osäkrare',
    other: 'Lokala förhållanden kan påverka',
  },
  reasons: {
    building_shadow_coverage: 'Byggnadsskuggorna är beräknade med begränsad täckning här.',
    vegetation: 'Träd kan påverka platsen.',
    awning: 'Markiser kan påverka platsen.',
    umbrella: 'Parasoller kan påverka platsen.',
    bridge: 'Broar kan påverka platsen.',
    temporary_structure: 'Tillfälliga konstruktioner kan påverka platsen.',
    seasonal_furniture: 'Säsongsmöbler kan påverka platsen.',
    weather: 'Vädret gör prognosen mer osäker.',
    other: 'Lokala förhållanden kan påverka platsen.',
  },
};

describe('VenueDetailContent', () => {
  it('renders detail content, warning, maps link, and route CTA', () => {
    render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Kafé Magasinet' })).toHaveClass('text-display-xl');
    expect(screen.getByText('Stor uteservering med eftermiddagssol.')).toHaveClass('text-body-lg');
    expect(screen.getByText('Solprognos idag')).toHaveClass('text-heading-lg');
    expect(screen.getByText('Innergård')).toBeInTheDocument();
    expect(screen.getByText('PLATSER UTE')).toBeInTheDocument();
    expect(screen.getByText('Blir skuggigt om 45 min')).toHaveClass('text-error');
    expect(screen.getByLabelText('95% sol')).toContainHTML('svg');
    expect(screen.queryByText(/Säkerhet:/)).not.toBeInTheDocument();
    expect(screen.getByText('Säkerhet 92%')).toHaveClass('sr-only');
    expect(screen.getByRole('link', { name: /ÖPPNA I KARTOR/i })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=57.705%2C11.97',
    );
    expect(screen.getByRole('link', { name: /ÖPPNA I KARTOR/i })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    expect(screen.getByRole('button', { name: 'Visa Rutt' })).toBeEnabled();
  });

  it('renders route estimate copy and a scoped loading label on the primary CTA', () => {
    const { rerender } = render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        routeEstimateLabel="ca 11 min promenad"
        onRoute={() => undefined}
      />,
    );

    expect(screen.getByText('ca 11 min promenad')).toBeInTheDocument();

    rerender(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        routeEstimateLabel="ca 11 min promenad"
        isRouteLoading
        onRoute={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: 'Öppnar kartor' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });

  it('uses token-backed venue detail hero heights', () => {
    const { rerender } = render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    const mobileHero = screen.getByRole('img', { name: 'Uteservering hos Kafé Magasinet' })
      .parentElement;
    expect(mobileHero).toHaveClass('h-venue-detail-hero-mobile');
    expect(mobileHero?.className).not.toMatch(/h-\[/);

    rerender(
      <VenueDetailContent
        mode="desktop"
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    const desktopHero = screen.getByRole('img', { name: 'Uteservering hos Kafé Magasinet' })
      .parentElement;
    expect(desktopHero).toHaveClass('h-venue-detail-hero-desktop');
    expect(desktopHero?.className).not.toMatch(/h-\[/);
  });

  it('carries rounded midpoint minutes into the hour for derived peak labels', () => {
    expect(peakTimeFromTimeline({
      timezone: 'Europe/Stockholm',
      range: { start: '06:00', end: '21:00' },
      windows: [{ start: '10:29', end: '11:30', status: 'Sunny' }],
    })).toBe('11:00');
  });

  it('keeps confidence metadata accessible without adding duplicate visible detail text', () => {
    const { rerender } = render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: '2026-05-22T09:00:00.000Z',
        }}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.queryByText(/Säkerhet:/)).not.toBeInTheDocument();
    expect(screen.getByText('Säkerhet cirka 92%')).toHaveClass('sr-only');
    expect(screen.getByLabelText('95% sol')).toBeInTheDocument();

    rerender(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        confidenceMeta={{ sunDataSource: 'geometry-only' }}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.queryByText(/Säkerhet:/)).toBeNull();
    expect(screen.getByText(/Säkerhet saknas/)).toHaveClass('sr-only');
    expect(screen.getByLabelText('95% sol')).toBeInTheDocument();
  });

  it('renders a concise uncertainty note near the sun forecast context', () => {
    const { container } = render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={{
          ...DETAIL,
          predictionUncertainty: {
            level: 'medium',
            reasons: ['vegetation', 'source_layer' as never, 'awning', 'seasonal_furniture'],
          },
        }}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        currentTime="15:30"
        labels={{ ...labels, uncertainty: uncertaintyLabels }}
        onRoute={() => undefined}
      />,
    );

    const note = screen.getByText('Osäker prognos').closest('p');
    expect(note).toHaveTextContent('Lokala hinder kan påverka');
    expect(note).toHaveTextContent(
      'Vi räknar på solens läge, byggnadsskuggor och väder',
    );
    expect(note).toHaveTextContent('Träd kan påverka platsen');
    expect(note).toHaveClass('bg-surface-sand');
    expectNoSensitiveSourceTerms(container);
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

  it('uses projected sun windows for mobile detail timeline output', () => {
    render(
      <VenueDetailContent
        fallbackVenue={{
          ...LIST_VENUE,
          sunWindow: { start: '10:00', end: '11:00' },
        }}
        detail={{
          ...DETAIL,
          sunWindow: { start: '10:00', end: '11:00' },
          timeline: {
            timezone: 'Europe/Stockholm',
            range: { start: '06:00', end: '21:00' },
            windows: [{ start: '10:00', end: '11:00', status: 'Sunny' }],
            peakTime: '10:30',
          },
        }}
        currentTime="10:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.getByText('Bäst 10:00-11:00')).toBeInTheDocument();
    expect(screen.queryByText('Bäst mellan 11:00 och 15:00')).toBeNull();
    expect(screen.getByRole('img', { name: 'Sol 10:00-11:00' })).toBeInTheDocument();
  });

  it('uses partial-window copy when the generic best-window label is absent', () => {
    const labelsWithoutBestWindow: Omit<typeof labels, 'bestWindow'> & { bestWindow?: string } = {
      ...labels,
    };
    delete labelsWithoutBestWindow.bestWindow;

    render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={{
          ...DETAIL,
          currentSunStatus: 'Partial',
          timeline: {
            timezone: 'Europe/Stockholm',
            range: { start: '06:00', end: '21:00' },
            windows: [{ start: '10:00', end: '11:00', status: 'Partial' }],
          },
        }}
        currentTime="10:30"
        labels={labelsWithoutBestWindow}
        onRoute={() => undefined}
      />,
    );

    expect(screen.getByText('Delvis sol 10:00-11:00')).toBeInTheDocument();
    expect(screen.queryByText('Sol 10:00-11:00')).not.toBeInTheDocument();
  });

  it('does not render future partner badges in active venue detail runtime', () => {
    render(
      <VenueDetailContent
        mode="desktop"
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.queryByText('SOL NU')).toBeNull();
    expect(screen.getByText('ÖPPET · 22:00')).toBeInTheDocument();
  });
});
