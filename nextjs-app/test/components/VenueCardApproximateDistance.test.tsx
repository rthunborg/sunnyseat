/**
 * Story 9.5 AC3 — honest approximate-distance label boundary at the VenueCard
 * level (automate coverage).
 *
 * The AC3 ATDD scaffold (`VenueListApproximateDistance.atdd.test.tsx`) proves
 * the label threads through `VenueList` in mobile mode. The label BRANCH itself
 * lives in `VenueCard` (`distanceIsApproximate` + `labels.distanceApproximate`,
 * rendered in BOTH the full and compact layouts). This file asserts that
 * fallback-vs-success boundary directly on the card, which the list-level test
 * does not exercise:
 *   - approximate + label present → the "≈ från centrum" annotation renders,
 *     alongside (never instead of) the real distance value, in BOTH layouts,
 *   - NOT approximate (a real fix) → the annotation is absent, value still shown,
 *   - approximate but label MISSING → no annotation (graceful — no `undefined`).
 *
 * Deterministic DOM text only.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VenueCard, type VenueCardLabels } from '@/components/composed/venue/VenueCard';

const APPROXIMATE = '≈ från centrum';

function labels(overrides: Partial<VenueCardLabels> = {}): VenueCardLabels {
  return {
    select: 'Välj',
    favourite: 'Spara {name}',
    sun: 'Sol',
    photoPlaceholder: 'Bild',
    confidence: 'Säkerhet',
    confidenceApproximate: 'cirka',
    confidenceUnavailable: 'saknas',
    distance: 'Avstånd',
    distanceApproximate: APPROXIMATE,
    sunUnavailable: 'saknas',
    ...overrides,
  };
}

function renderCard(props: {
  distanceIsApproximate?: boolean;
  compact?: boolean;
  labelOverrides?: Partial<VenueCardLabels>;
}) {
  return render(
    <VenueCard
      name="Solterrassen"
      neighborhood="Centrum"
      distanceMeters={250}
      sunExposurePercent={80}
      isSunny
      distanceIsApproximate={props.distanceIsApproximate}
      compact={props.compact}
      labels={labels(props.labelOverrides)}
      onSelect={() => {}}
    />,
  );
}

describe('Story 9.5 AC3 — VenueCard approximate-distance boundary', () => {
  it.each([false, true])(
    'shows "≈ från centrum" alongside the real distance on the fallback (compact=%s)',
    (compact) => {
      renderCard({ distanceIsApproximate: true, compact });
      expect(screen.getByText(APPROXIMATE)).toBeInTheDocument();
      // The real distance VALUE is never hidden — only the label is qualified.
      // (Compact layout inlines it as "Centrum · 250 m", so match on textContent.)
      expect(screen.getByTestId('venue-card')).toHaveTextContent('250 m');
    },
  );

  it.each([false, true])(
    'does NOT show the approximate label on a real fix (compact=%s)',
    (compact) => {
      renderCard({ distanceIsApproximate: false, compact });
      expect(screen.queryByText(APPROXIMATE)).toBeNull();
      expect(screen.getByTestId('venue-card')).toHaveTextContent('250 m');
    },
  );

  it('renders no annotation (and no undefined) when the approximate label is missing', () => {
    renderCard({
      distanceIsApproximate: true,
      labelOverrides: { distanceApproximate: undefined },
    });
    expect(screen.queryByText(APPROXIMATE)).toBeNull();
    expect(screen.getByTestId('venue-card')).not.toHaveTextContent('undefined');
    expect(screen.getByText('250 m')).toBeInTheDocument();
  });
});
