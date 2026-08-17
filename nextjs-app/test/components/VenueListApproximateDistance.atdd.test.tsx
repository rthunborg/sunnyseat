/**
 * ATDD RED-PHASE SCAFFOLD — Story 9.5 AC3
 * Honest distance labelling on the Gothenburg-centre fallback.
 *
 * STATUS: describe.skip — `VenueList` exists, but the `locationIsApproximate`
 * prop and the new i18n key the label renders do NOT exist yet, so the label
 * assertions are RED. Skipped so CI stays green. The dev (Task 3):
 *   (1) threads a `locationIsApproximate` boolean (derived from
 *       geolocation.status === 'fallback') from MapView → VenueList, and
 *   (2) adds a parity-guarded "≈ från centrum" / "≈ from centre" key to
 *       messages/{sv,en}/venue.json,
 * then un-skips this block.
 *
 * What this proves (deterministic DOM text — no timing):
 *  - status === 'fallback' (locationIsApproximate) → the approximate treatment
 *    ("≈ från centrum") is present in the rendered list.
 *  - status === 'success' (NOT approximate) → the plain distance renders and the
 *    "≈ från centrum" label is ABSENT (the number is honest, label suppressed).
 *  - The real distance VALUE is never fabricated or hidden — only the LABEL changes
 *    (AC3 intent: honest, not contradictory/absent — the anti-pattern 9.1 removed).
 *
 * The `locationIsApproximate` prop is passed through a typed-as-Record cast so the
 * scaffold type-checks against today's VenueListProps. The dev removes the cast
 * and adds the prop to VenueListProps when implementing.
 *
 * Expected label copy (the dev confirms casing against the reference list copy):
 *   sv: "≈ från centrum"   en: "≈ from centre"
 * If the dev instead chooses the ALTERNATIVE (suppress "Närmast" on fallback),
 * replace the label assertions with a sort-control / sortMode assertion and keep
 * the success-path "plain distance" assertion.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { VenueList } from '@/components/custom/venue/VenueList';
import venueMessages from '@/messages/sv/venue.json';
import type { VenueDataDto } from '@/lib/types/api';

// The approximate-distance label copy the dev adds to venue.json. Kept here as a
// single source so the assertion + the implementer's key value stay in lockstep.
const APPROXIMATE_LABEL = '≈ från centrum';

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="sv" messages={{ venue: venueMessages }}>
      {children}
    </NextIntlClientProvider>
  );
}

function makeVenue(overrides: Partial<VenueDataDto> = {}): VenueDataDto {
  return {
    id: 'v1',
    venueId: 'v1',
    venueName: 'Solterrassen',
    venueSlug: 'solterrassen',
    slug: 'solterrassen',
    neighborhood: 'Centrum',
    location: { lat: 57.7, lng: 11.97 },
    currentSunStatus: 'Sunny',
    weatherGateState: 'not_gated',
    isPartner: false,
    confidence: 90,
    distanceMeters: 250,
    ...overrides,
  } as VenueDataDto;
}

// `locationIsApproximate` is a NEW prop the dev adds to VenueListProps (Task 3).
// Cast through Record so this scaffold type-checks against today's prop type.
function renderList(props: { locationIsApproximate?: boolean }) {
  const extra = props as Record<string, unknown>;
  return render(
    <VenueList
      venues={[makeVenue()]}
      mode="mobile"
      onSelectVenue={() => {}}
      {...(extra as object)}
    />,
    { wrapper: Wrapper },
  );
}

describe('Story 9.5 AC3 — honest approximate-distance label on fallback (RED)', () => {
  it('shows the "≈ från centrum" approximate treatment when locationIsApproximate is true (fallback)', () => {
    renderList({ locationIsApproximate: true });
    expect(screen.getByText(new RegExp(APPROXIMATE_LABEL))).toBeInTheDocument();
  });

  it('does NOT show the approximate label when locationIsApproximate is false (real fix)', () => {
    renderList({ locationIsApproximate: false });
    expect(screen.queryByText(new RegExp(APPROXIMATE_LABEL))).toBeNull();
  });

  it('still renders the real distance VALUE on the fallback path (number not hidden, only labelled honest)', () => {
    renderList({ locationIsApproximate: true });
    // The distance number stays visible — 9.1's anti-pattern was an absent/
    // contradictory number, not an honestly-labelled centrum-relative one.
    // makeVenue() sets distanceMeters: 250, which formats to "250 m". Assert
    // the concrete distance number renders rather than any digit-bearing node
    // (the full card also carries a sun-% figure).
    expect(screen.getByText('250 m')).toBeInTheDocument();
  });
});

/**
 * i18n parity guard (AC3): the new key MUST exist in BOTH sv + en venue.json.
 * `messages-parity.test.ts` auto-discovers keys, so adding the key to both
 * locales is sufficient. This explicit assertion documents the contract and
 * fails loudly (RED) until the sv key exists.
 */
describe('Story 9.5 AC3 — approximate-distance i18n key present (RED)', () => {
  it('sv/venue.json defines the approximate-distance label key', () => {
    const flat = JSON.stringify(venueMessages);
    expect(flat).toContain(APPROXIMATE_LABEL);
  });
});
