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
  // Story 11.9 (AC2): per-weekday hours (closes 22:00 every day) so the derived
  // "Öppet till 22:00" / "ÖPPET · 22:00" renders on any run-day.
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
    windows: [{ start: '13:00', end: '18:30', status: 'Sunny' }],
    peakTime: '15:30',
  },
};

const labels = {
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
  openUntilLine: 'Öppet till {time}',
  placeholderImageShort: 'Platshållarbild',
  facts: {
    distance: 'AVSTÅND',
    distanceApproximate: '≈ från centrum',
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

  it('removes the "Soltider idag" sun-forecast section on both breakpoints (Story 11.6 AC2)', () => {
    const { rerender } = render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    // The removed forecast card heading (mobile) and its ariaLabel (desktop) are
    // gone, and no timeline window img/label survives on either breakpoint.
    expect(screen.queryByText('Solprognos idag')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Soltider idag')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /^Sol \d/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Sol 13:00-18:30$/)).not.toBeInTheDocument();
    // The kept genuine surfaces still render (heading, description, route CTA).
    expect(screen.getByRole('heading', { name: 'Kafé Magasinet' })).toBeInTheDocument();
    expect(screen.getByText('Stor uteservering med eftermiddagssol.')).toBeInTheDocument();

    rerender(
      <VenueDetailContent
        mode="desktop"
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.queryByText('Solprognos idag')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Soltider idag')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /^Sol \d/ })).not.toBeInTheDocument();
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

  it('shows the venue name + fallback fields immediately and skeletons every detail-only region while loading (Story 11.6 AC1)', () => {
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

    // Fallback-present fields render immediately (venue name, type from metadata).
    expect(screen.getByRole('heading', { name: 'Kafé Magasinet' })).toBeInTheDocument();
    expect(screen.getByText('Innergård')).toBeInTheDocument();
    // The scoped loading status is announced and skeletons stand in for detail.
    expect(screen.getByLabelText('Laddar platsdetaljer')).toBeInTheDocument();
    expect(screen.getAllByTestId('venue-detail-skeleton').length).toBeGreaterThan(1);
    // AC1 (load-bearing): the header badge must NOT flash a fabricated "22:00" —
    // no "ÖPPET · 22:00" while detail is unloaded, and a skeleton stands in.
    expect(screen.queryByText('ÖPPET · 22:00')).not.toBeInTheDocument();
    expect(screen.queryByText(/ÖPPET ·/)).not.toBeInTheDocument();
    // No timeline section appears in the loading frame either.
    expect(screen.queryByText('Solprognos idag')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Soltider idag')).not.toBeInTheDocument();
  });

  it('renders the ÖPPET badge only once real detail supplies the closing time (Story 11.6 AC1)', () => {
    const { rerender } = render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    // With loaded detail carrying closesAt, the honest badge renders.
    expect(screen.getByText('ÖPPET · 22:00')).toBeInTheDocument();

    // Story 11.9 (AC2): a loaded detail with NO hours today must NOT fabricate a
    // time — the badge is omitted. An empty per-weekday object = closed every day.
    rerender(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={{ ...DETAIL, openingHours: {} }}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.queryByText(/ÖPPET ·/)).not.toBeInTheDocument();
    expect(screen.queryByText('ÖPPET · 22:00')).not.toBeInTheDocument();
  });

  it('swaps skeletons for real content in the SAME instance when detail streams in (Story 11.6 AC1 — no layout jump / no stale skeleton)', () => {
    // Open on the fallback while loading: badge is a skeleton, detail regions
    // are skeletons, and the article announces aria-busy.
    const { rerender } = render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={undefined}
        isLoading
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.getByRole('article', { name: 'Kafé Magasinet' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.getAllByTestId('venue-detail-skeleton').length).toBeGreaterThan(1);
    // No opening-hours/address content yet, and no fabricated badge.
    expect(screen.queryByText('Öppet till 22:00')).not.toBeInTheDocument();
    expect(screen.queryByText('Tredje Långgatan 9, Göteborg')).not.toBeInTheDocument();
    expect(screen.queryByText(/ÖPPET ·/)).not.toBeInTheDocument();

    // Detail streams in on the SAME mounted component: skeletons are fully
    // replaced by real content and the badge appears — the fallback→detail swap.
    rerender(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        isLoading
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    // AC1: once `detail` is present the loading gate closes even while the parent
    // still reports isLoading (`loading = isLoading && !detail`) — content shows.
    expect(screen.getByRole('article', { name: 'Kafé Magasinet' })).toHaveAttribute(
      'aria-busy',
      'false',
    );
    expect(screen.queryByTestId('venue-detail-skeleton')).not.toBeInTheDocument();
    expect(screen.getByText('Öppet till 22:00')).toBeInTheDocument();
    expect(screen.getByText('Tredje Långgatan 9, Göteborg')).toBeInTheDocument();
    expect(screen.getByText('ÖPPET · 22:00')).toBeInTheDocument();
  });

  it('renders content (never skeletons) when detail is present even if isLoading is still true (Story 11.6 AC1 — loading-gate boundary)', () => {
    // The gate is `loading = isLoading && !detail`. detail-present + isLoading is
    // the boundary case: a background refetch must not blank a fully-loaded view.
    render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={DETAIL}
        isLoading
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );

    expect(screen.getByRole('article', { name: 'Kafé Magasinet' })).toHaveAttribute(
      'aria-busy',
      'false',
    );
    expect(screen.queryByTestId('venue-detail-skeleton')).not.toBeInTheDocument();
    expect(screen.getByText('Öppet till 22:00')).toBeInTheDocument();
    expect(screen.getByText('ÖPPET · 22:00')).toBeInTheDocument();
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
