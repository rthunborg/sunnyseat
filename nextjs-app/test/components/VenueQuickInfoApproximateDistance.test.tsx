/**
 * Story 9.9 Task 3 (folds in Story 9.5 AC3) — honest "≈ från centrum" distance
 * annotation on the selected-venue quick-info card.
 *
 * The `distanceIsApproximate` thread previously reached only VenueList →
 * VenueCard; VenueQuickInfo rendered an UNQUALIFIED distance, so on the
 * Gothenburg-centrum fallback the selected-venue card implied a real personal
 * fix. This file asserts the same fallback-vs-success boundary on the quick-info
 * card that `VenueCardApproximateDistance.test.tsx` asserts on the list card:
 *   - approximate + label present  → "≈ från centrum" renders alongside (never
 *     instead of) the real distance value,
 *   - NOT approximate (a real fix) → the annotation is absent, value still shown,
 *   - approximate but label MISSING → no annotation (graceful — no `undefined`),
 *   - anchored-mobile sr-only treatment: the screen-reader distance stays a
 *     clean "Avstånd: 420 m" (the approximate annotation is aria-hidden there).
 *
 * Deterministic DOM text only; the anchored/non-anchored branches are exercised
 * via the `position` prop (present → `isAnchoredMobile`).
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VenueQuickInfo, type VenueQuickInfoProps } from '@/components/composed/venue/VenueQuickInfo';

vi.mock('motion/react', async () => {
  const React = await import('react');
  type DivProps = React.HTMLAttributes<HTMLElement> & Record<string, unknown>;
  const strip = ({ children, ...props }: DivProps) => {
    const { initial: _i, animate: _a, exit: _e, transition: _t, ...rest } = props;
    return React.createElement('div', rest, children);
  };
  return {
    motion: { aside: strip, div: strip },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    useReducedMotion: () => false,
  };
});

const APPROXIMATE = '≈ från centrum';

function labels(
  overrides: Partial<VenueQuickInfoProps['labels']> = {},
): VenueQuickInfoProps['labels'] {
  return {
    route: 'Visa Rutt',
    moreInfo: 'Mer Info',
    close: 'Stäng platskort',
    photoPlaceholder: 'Platshållarbild',
    confidence: 'Säkerhet',
    confidenceApproximate: 'cirka',
    confidenceUnavailable: 'Säkerhet saknas',
    distance: 'Avstånd',
    distanceApproximate: APPROXIMATE,
    loadingSun: 'Laddar soldata',
    routeLoading: 'Öppnar kartor',
    favouriteAdd: 'Spara som favorit',
    favouriteRemove: 'Ta bort favorit',
    ...overrides,
  };
}

function renderQuickInfo(props: {
  distanceIsApproximate?: boolean;
  anchored?: boolean;
  distanceMeters?: number;
  labelOverrides?: Partial<VenueQuickInfoProps['labels']>;
}) {
  return render(
    <VenueQuickInfo
      mode="mobile"
      name="Solterrassen"
      confidencePercent={92}
      confidenceMeta={{ sunDataSource: 'weather', weatherUpdatedAt: new Date().toISOString() }}
      sunExposurePercent={80}
      distanceMeters={props.distanceMeters ?? 420}
      distanceIsApproximate={props.distanceIsApproximate}
      position={props.anchored ? { x: 180, y: 260 } : undefined}
      isLoadingSunData={false}
      onDismiss={() => {}}
      onOpenDetails={() => {}}
      onRoute={() => {}}
      labels={labels(props.labelOverrides)}
    />,
  );
}

describe('Story 9.9 — VenueQuickInfo approximate-distance boundary', () => {
  it.each([false, true])(
    'shows "≈ från centrum" alongside the real distance on the fallback (anchored=%s)',
    (anchored) => {
      renderQuickInfo({ distanceIsApproximate: true, anchored });
      expect(screen.getByText(APPROXIMATE)).toBeInTheDocument();
      // The real distance VALUE is never hidden — only the label is qualified.
      expect(screen.getByTestId('venue-quick-info')).toHaveTextContent('420 m');
    },
  );

  it.each([false, true])(
    'does NOT show the approximate label on a real fix (anchored=%s)',
    (anchored) => {
      renderQuickInfo({ distanceIsApproximate: false, anchored });
      expect(screen.queryByText(APPROXIMATE)).toBeNull();
      expect(screen.getByTestId('venue-quick-info')).toHaveTextContent('420 m');
    },
  );

  it.each([false, true])(
    'does NOT show the approximate label beside a non-numeric distance (NaN → "–", anchored=%s)',
    (anchored) => {
      // fallbackVenueFromSlug sets distanceMeters: NaN — the label is gated on
      // Number.isFinite so it never sits beside the "–" placeholder.
      renderQuickInfo({ distanceIsApproximate: true, distanceMeters: Number.NaN, anchored });
      expect(screen.queryByText(APPROXIMATE)).toBeNull();
      expect(screen.getByTestId('venue-quick-info')).toHaveTextContent('–');
    },
  );

  it('renders no annotation (and no undefined) when the approximate label is missing', () => {
    renderQuickInfo({
      distanceIsApproximate: true,
      labelOverrides: { distanceApproximate: undefined },
    });
    expect(screen.queryByText(APPROXIMATE)).toBeNull();
    expect(screen.getByTestId('venue-quick-info')).not.toHaveTextContent('undefined');
    expect(screen.getByTestId('venue-quick-info')).toHaveTextContent('420 m');
  });

  it('keeps a clean screen-reader distance in anchored mobile (approximate annotation is aria-hidden)', () => {
    renderQuickInfo({ distanceIsApproximate: true, anchored: true });
    // The sr-only distance the screen reader announces must stay unqualified.
    expect(screen.getByText(/Avstånd:/)).toHaveTextContent('Avstånd: 420 m');
    // The visible "≈ från centrum" annotation is present but aria-hidden.
    const annotation = screen.getByText(APPROXIMATE);
    expect(annotation).toHaveAttribute('aria-hidden', 'true');
  });
});
