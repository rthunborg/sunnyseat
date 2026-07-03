import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  VenueDetailContent,
  peakTimeFromTimeline,
} from '@/components/composed/venue/VenueDetailContent';
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
  tags: [],
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
  sunBadge: '{percent}% sol',
  obscuredHeadline: 'Sol bakom moln',
  obscuredBadge: '{percent}% solläge',
  sky: {
    label: 'Himmel nu',
    clear: 'Klart',
    partlyCloudy: 'Delvis molnigt',
    overcast: 'Mulet',
    rain: 'Regn',
  },
  confidence: 'Säkerhet',
  confidenceApproximate: 'cirka',
  confidenceUnavailable: 'Säkerhet saknas',
  city: 'Göteborg',
  openUntil: 'ÖPPET · {time}',
  placeholderImageShort: 'Platshållarbild',
  facts: {
    distance: 'AVSTÅND',
    distanceApproximate: '≈ från centrum',
  },
  timeline: {
    ariaLabel: 'Soltider idag',
    currentTime: 'Nu {time}',
    sunnyWindow: 'Sol {start}-{end}',
    partialWindow: 'Delvis sol {start}-{end}',
    shadedWindow: 'Skugga {start}-{end}',
  },
};

describe('VenueDetailContent', () => {
  it('renders detail content, the real distance fact, maps link, and route CTA', () => {
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
    // De-bloat sweep (Story 9.1): the fabricated fact cards + dead shadow-warning
    // line are gone; only the genuine AVSTÅND fact survives.
    expect(screen.getByText('AVSTÅND')).toBeInTheDocument();
    expect(screen.queryByText('EXPONERING')).not.toBeInTheDocument();
    expect(screen.queryByText('BÄST KL.')).not.toBeInTheDocument();
    expect(screen.queryByText('PLATSER UTE')).not.toBeInTheDocument();
    expect(screen.queryByText(/Blir skuggigt om/)).not.toBeInTheDocument();
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

  it('renders the muted obscured hero badge + headline + sky line, no amber sun badge (Story 10.2 AC1/AC3)', () => {
    const obscuredDetail: VenueDetailDto = {
      ...DETAIL,
      currentSunStatus: 'CloudObscured',
      skyCondition: 'overcast',
      timeline: {
        ...DETAIL.timeline,
        windows: [{ start: '13:00', end: '18:30', status: 'Sunny' }],
      },
    };

    render(
      <VenueDetailContent
        fallbackVenue={{ ...LIST_VENUE, currentSunStatus: 'CloudObscured', skyCondition: 'overcast' }}
        detail={obscuredDetail}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    // AC1: the hero badge is the muted "% solläge" badge, NOT the amber "% sol" badge.
    expect(screen.getByLabelText('95% solläge')).toBeInTheDocument();
    expect(screen.queryByLabelText('95% sol')).not.toBeInTheDocument();
    // AC1: the muted "Sol bakom moln" headline is present.
    const obscuredBlock = screen.getByTestId('venue-detail-obscured');
    expect(obscuredBlock).toHaveTextContent('Sol bakom moln');
    // AC3: the plain-language sky descriptor (overcast -> "Mulet"), no cloud %.
    expect(obscuredBlock).toHaveTextContent('Mulet');
    expect(obscuredBlock.textContent).not.toMatch(/\d+\s*%/);
    // AC2: the geometric sun timeline STILL renders as clear-sky potential.
    expect(screen.getByText('Solprognos idag')).toBeInTheDocument();
  });

  it('renders NO sky line when the obscured venue sky is unavailable (AC3 — never fabricate)', () => {
    render(
      <VenueDetailContent
        fallbackVenue={{ ...LIST_VENUE, currentSunStatus: 'CloudObscured', skyCondition: 'unavailable' }}
        detail={{ ...DETAIL, currentSunStatus: 'CloudObscured', skyCondition: 'unavailable' }}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    const obscuredBlock = screen.getByTestId('venue-detail-obscured');
    // The headline still shows, but NO sky descriptor is fabricated.
    expect(obscuredBlock).toHaveTextContent('Sol bakom moln');
    expect(obscuredBlock).not.toHaveTextContent('Mulet');
    expect(obscuredBlock).not.toHaveTextContent('Klart');
    expect(obscuredBlock).not.toHaveTextContent('Delvis molnigt');
  });

  it('renders the fallback sun-window as clear-sky POTENTIAL for an obscured venue with no loaded detail (Story 10.2 AC2 / Completion Note #3)', () => {
    // Before the detail payload loads, the timeline is derived from the list
    // venue via timelineFromListVenue(). For a CloudObscured headline that
    // helper maps the window status back to the geometric `Partial` tier — so
    // the "when it clears" potential renders as a Partial (amber) window rather
    // than vanishing into a transparent shaded bar. Pin that fallback path (the
    // real-detail obscured test always passes an explicit `detail`, so this
    // branch was otherwise uncovered).
    render(
      <VenueDetailContent
        fallbackVenue={{
          ...LIST_VENUE,
          currentSunStatus: 'CloudObscured',
          skyCondition: 'overcast',
          sunWindow: { start: '13:00', end: '18:30' },
        }}
        // No `detail` prop → the component falls back to timelineFromListVenue.
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    // The obscured headline still shows...
    expect(screen.getByTestId('venue-detail-obscured')).toHaveTextContent('Sol bakom moln');
    // ...and the fallback sun window is present as POTENTIAL, labelled as the
    // Partial ("Delvis sol") window — NOT the shaded ("Skugga") transparent bar.
    expect(screen.getByLabelText('Delvis sol 13:00-18:30')).toBeInTheDocument();
    expect(screen.queryByLabelText('Skugga 13:00-18:30')).not.toBeInTheDocument();
  });

  it('keeps the sunny detail unchanged — no obscured block on a clear-sky venue (Behaviour gate)', () => {
    render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.queryByTestId('venue-detail-obscured')).not.toBeInTheDocument();
    // The amber sun badge is intact for the sunny state.
    expect(screen.getByLabelText('95% sol')).toBeInTheDocument();
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

  it('does not render the removed uncertainty disclaimer text (Story 9.1 de-bloat)', () => {
    render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={{
          ...DETAIL,
          predictionUncertainty: {
            level: 'medium',
            reasons: ['vegetation', 'awning', 'seasonal_furniture'],
          },
        }}
        confidenceMeta={{
          sunDataSource: 'weather',
          weatherUpdatedAt: new Date().toISOString(),
        }}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.queryByText('Osäker prognos')).not.toBeInTheDocument();
    expect(screen.queryByText('Lokala hinder kan påverka')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Vi räknar på solens läge/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Träd kan påverka platsen/)).not.toBeInTheDocument();
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

  it('does not render feedback or review slots unless explicitly provided', () => {
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

  it('renders explicit review slots below the route CTA', () => {
    render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
        reviewSlot={<section aria-label="Omdömen">Lämna ett omdöme</section>}
      />,
    );

    const routeButton = screen.getByRole('button', { name: 'Visa Rutt' });
    const reviewSection = screen.getByLabelText('Omdömen');
    expect(reviewSection).toHaveTextContent('Lämna ett omdöme');
    expect(routeButton.compareDocumentPosition(reviewSection)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it('uses review-backed summary metadata in venue detail headers', () => {
    render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={{
          ...DETAIL,
          reviewSummary: {
            averageRating: 4.5,
            reviewCount: 2,
          },
        }}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.getByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
    expect(screen.queryByText('(842)')).toBeNull();
  });

  it('does not fall back to fixture ratings when review summary has no average', () => {
    render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={{
          ...DETAIL,
          reviewSummary: {
            averageRating: null,
            reviewCount: 1,
          },
        }}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
    expect(screen.queryByText('4.7')).toBeNull();
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

  it('keeps the de-bloated mobile fact area to a single full-width AVSTÅND tile with no orphaned cell (Story 9.1 AC #2)', () => {
    const { container } = render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    // Exactly one FactCard survives (AVSTÅND) — the EXPONERING / BÄST KL. /
    // PLATSER UTE tiles are gone, so there is no 2-col grid leaving an empty cell.
    const factLabels = screen.getAllByText('AVSTÅND');
    expect(factLabels).toHaveLength(1);
    const factCard = factLabels[0].closest('section');
    expect(factCard).not.toBeNull();
    // The surviving tile is not wrapped in a grid-cols-2 container (no orphaned cell).
    expect(container.querySelector('.grid-cols-2')).toBeNull();
    // The fabricated-fact icons (Compass exposure, Armchair seats) are gone.
    expect(screen.queryByText('EXPONERING')).not.toBeInTheDocument();
    expect(screen.queryByText('PLATSER UTE')).not.toBeInTheDocument();
    expect(screen.queryByText('BÄST KL.')).not.toBeInTheDocument();
    // The real distance value still renders inside the surviving tile (a metres
    // figure), proving the kept signal is intact after the de-bloat.
    expect(factCard?.textContent).toMatch(/\d+\s?m|\d+(?:\.\d+)?\s?km/);
  });

  it('removes the desktop EXPONERING row and the mobile-only AVSTÅND fact while keeping confidence in desktop mode (Story 9.1 AC #1)', () => {
    render(
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

    // Desktop EXPONERING DetailRow + the fabricated fact labels are absent.
    expect(screen.queryByText('EXPONERING')).not.toBeInTheDocument();
    expect(screen.queryByText('BÄST KL.')).not.toBeInTheDocument();
    expect(screen.queryByText('PLATSER UTE')).not.toBeInTheDocument();
    // The AVSTÅND FactCard is mobile-only — it must not appear in desktop mode.
    expect(screen.queryByText('AVSTÅND')).not.toBeInTheDocument();
    // No dead shadow-warning copy in desktop either.
    expect(screen.queryByText(/Blir skuggigt om/)).not.toBeInTheDocument();
    // The preserved confidence signal still renders (announced once, sr-only).
    expect(screen.getByText('Säkerhet 92%')).toHaveClass('sr-only');
    expect(screen.queryByText(/Säkerhet:/)).not.toBeInTheDocument();
    // The kept opening-hours and address rows survive (they back genuine signals).
    expect(screen.getByText('Öppettider')).toBeInTheDocument();
    expect(screen.getByText('Adress')).toBeInTheDocument();
  });

  it('qualifies the Avstånd card honestly on the centrum fallback (Story 9.5 AC3)', () => {
    const { rerender } = render(
      <VenueDetailContent
        fallbackVenue={{ ...LIST_VENUE, distanceMeters: 250 }}
        detail={{ ...DETAIL, distanceMeters: 250 }}
        distanceIsApproximate
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    const factCard = screen.getByText('AVSTÅND').closest('section');
    expect(factCard).toHaveTextContent('≈ från centrum');

    // A real personal fix does not qualify the distance.
    rerender(
      <VenueDetailContent
        fallbackVenue={{ ...LIST_VENUE, distanceMeters: 250 }}
        detail={{ ...DETAIL, distanceMeters: 250 }}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );
    expect(screen.queryByText('≈ från centrum')).toBeNull();
  });

  it('does not qualify the Avstånd card when the distance is non-numeric (NaN)', () => {
    render(
      <VenueDetailContent
        fallbackVenue={{ ...LIST_VENUE, distanceMeters: Number.NaN }}
        detail={{ ...DETAIL, distanceMeters: Number.NaN }}
        distanceIsApproximate
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.queryByText('≈ från centrum')).toBeNull();
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
