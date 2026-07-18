/**
 * ATDD RED-PHASE acceptance scaffolds — Story 11.9 (AC2)
 * "Detail render: ÖPPET badge + Öppettider row DERIVED from per-weekday hours"
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The component contract for AC2 at the detail surface. `VenueDetailContent` currently
 * reads `detail.openingHours.closesAt` (a stored field) for the "ÖPPET · {time}" badge
 * and prints `detail.openingHours.display` (a stored string) in the "Öppettider" row.
 * After 11.9 both are DERIVED at render time from the new per-weekday shape + the
 * current Stockholm weekday. This spec pins the RENDER invariants that must survive the
 * shape change:
 *   - open-today → badge shows the derived close; the Öppettider row shows a derived
 *     "Öppet till HH:MM" line;
 *   - closed-today / no-hours → NO badge, NO fabricated closing time (11.4/11.6
 *     never-fabricate rule);
 *   - the 11.6 same-box `Skeleton → badge` swap (no layout jump) is PRESERVED while
 *     `loading`.
 *
 * The scenarios are driven purely through PROPS (the component is presentational —
 * Dev Notes 3.3/3.4 keep it prop-fed), so they are deterministic with no clock.
 *
 * =========================================================================
 * STATUS — GREEN (live, un-skipped)
 * =========================================================================
 * Task 3.4 landed: `VenueDetailDto.openingHours` is now the per-weekday shape and
 * `VenueDetailContent` derives the badge close + Öppettider line at render time. These
 * blocks are un-skipped and run against the real component as ordinary green tests that
 * gate CI; this file is no longer a `.skip`-ed red-phase scaffold. The `DETAIL_*` fixtures
 * carry the per-weekday shape via the typed `buildDetail()` shim below.
 *
 * NOTE on the badge-open-guard decision (Dev Notes constraint): this story derives the
 * badge from TODAY's close (weekday-correct). A full minute-precise is-open-now guard is
 * OUT of scope unless trivial — the assertions below do NOT require it; they require the
 * badge to reflect today's derived close and to VANISH when today has no hours.
 */

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
  weatherGateState: 'not_gated',
  isPartner: true,
  confidence: 92,
  distanceMeters: 0,
  sunExposurePercent: 95,
  tags: [],
  sunWindow: { start: '13:00', end: '18:30' },
  thumbnail: { alt: 'Uteservering', initials: 'KM' },
};

/**
 * Build a detail whose `openingHours` carries the NEW per-weekday shape. Cast through
 * `unknown` so the `.skip`-ed file compiles against the CURRENT (pre-change) type; once
 * `VenueDetailDto.openingHours` is the per-weekday type (Task 3.1), drop the cast.
 */
function buildDetail(hours: unknown): VenueDetailDto {
  return {
    ...LIST_VENUE,
    description: 'Stor uteservering med eftermiddagssol.',
    address: 'Tredje Långgatan 9, Göteborg',
    openingHours: hours as VenueDetailDto['openingHours'],
    timeline: {
      timezone: 'Europe/Stockholm',
      range: { start: '06:00', end: '21:00' },
      windows: [{ start: '13:00', end: '18:30', status: 'Sunny' }],
      peakTime: '15:30',
    },
  };
}

// Full-week fixtures so the derive (which reads the CURRENT Stockholm weekday via
// `new Date()`) is deterministic regardless of the CI run-day: OPEN_TODAY closes
// 22:00 every day; CLOSED_TODAY is null every day.
const OPEN_TODAY = {
  '1': { open: '11:00', close: '22:00' },
  '2': { open: '11:00', close: '22:00' },
  '3': { open: '11:00', close: '22:00' },
  '4': { open: '11:00', close: '22:00' },
  '5': { open: '11:00', close: '22:00' },
  '6': { open: '11:00', close: '22:00' },
  '7': { open: '11:00', close: '22:00' },
};
const CLOSED_TODAY = {
  '1': null, '2': null, '3': null, '4': null, '5': null, '6': null, '7': null,
};

const labels = {
  openMaps: 'ÖPPNA I KARTOR',
  route: 'Visa Rutt',
  routeLoading: 'Öppnar kartor',
  photoPlaceholder: 'Platshållarbild',
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
  facts: { distance: 'AVSTÅND', distanceApproximate: '≈ från centrum' },
};

describe('[11.9 AC2] VenueDetailContent — derived ÖPPET badge + Öppettider row', () => {
  it('open today → badge shows the derived close (ÖPPET · 22:00)', () => {
    render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={buildDetail(OPEN_TODAY)}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );
    // The badge time is DERIVED from today's close, not a stored `closesAt`.
    expect(screen.getByText(/ÖPPET · 22:00/)).toBeInTheDocument();
  });

  it('open today → the Öppettider row shows a derived "Öppet till 22:00" line (not a stored display string)', () => {
    render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={buildDetail(OPEN_TODAY)}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );
    // The row renders the derived localized line, distinct from the badge
    // ("ÖPPET · 22:00"). Both carry "22:00", so target the full row copy.
    expect(screen.getByText('Öppet till 22:00')).toBeInTheDocument();
  });

  it('closed today → NO ÖPPET badge, NO fabricated closing time', () => {
    render(
      <VenueDetailContent
        fallbackVenue={LIST_VENUE}
        detail={buildDetail(CLOSED_TODAY)}
        currentTime="15:30"
        labels={labels}
        onRoute={() => undefined}
      />,
    );
    // Never-fabricate: no "ÖPPET · ..." badge when today has no hours.
    expect(screen.queryByText(/ÖPPET ·/)).not.toBeInTheDocument();
  });

  it('loading → the same-box Skeleton stands in for the badge (11.6 no-layout-jump swap preserved)', () => {
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
    // While loading, the badge box is a skeleton (never a fabricated time).
    expect(screen.getAllByTestId('venue-detail-skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByText(/ÖPPET ·/)).not.toBeInTheDocument();
  });
});
