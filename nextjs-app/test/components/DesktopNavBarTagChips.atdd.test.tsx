/**
 * ATDD RED-PHASE SCAFFOLD — Story 9.7 AC2 / AC3 / AC5
 * (data-driven, ENABLED, toggleable chip row in DesktopNavBar)
 *
 * Proves the chip row is:
 *  - DATA-DRIVEN (AC2): rendered from the UNION of the loaded venues' tags
 *    (mocked `useVenueSearch` returns venues with known tags), NOT the hardcoded
 *    `nav.filterChips.*` list. A tag that no venue carries never renders; a tag a
 *    venue carries DOES render.
 *  - ENABLED (AC2): each chip is an interactive `<button>` — no `disabled`, no
 *    `cursor-not-allowed`. (This is the flip of the marker test in
 *    DesktopNavBar.test.tsx:213 that Story 9.6 left for 9.7 to own.)
 *  - TOGGLEABLE via the SHARED context (AC3): clicking a chip flips
 *    `aria-pressed` true and applies the reference "on" pill classes
 *    (`bg-text-primary text-white`); a second click clears it. State is written
 *    through `useTagFilter().toggleTag` (shared context), not local state.
 *
 * STATUS: describe.skip — DesktopNavBar does not yet consume `useVenueSearch`
 * tags nor `useTagFilter`, and `@/lib/contexts/TagFilterContext` does not exist
 * yet. Skipped so the PostToolUse gate (tsc + vitest + eslint) stays GREEN. The
 * not-yet-existing `TagFilterProvider` is reached via a RUNTIME dynamic specifier
 * INSIDE the (skipped) beforeEach, so tsc / Vitest import-analysis do not trip.
 * The DesktopNavBar import is a normal top-level import (it already exists); only
 * its NEW behaviour is under test. When Tasks 4-5 land, un-skip + hoist the
 * TagFilterProvider specifier.
 *
 * Deterministic RTL/jsdom only: rendered chip set, `aria-pressed`, className
 * membership, after `fireEvent.click`. No wall-clock, no timers.
 */
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { fireEvent, screen, render } from '@testing-library/react';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { DesktopNavBar } from '@/components/custom/layout/DesktopNavBar';
import { TimeProvider } from '@/lib/contexts/TimeContext';
import type { GetVenuesResponse } from '@/lib/types/api';

const TAG_FILTER_CTX = '@/lib/contexts/TagFilterContext';

type TagFilterProviderComponent = (props: { children: ReactNode }) => ReactNode;

const mockState = vi.hoisted(() => ({
  useVenueSearch: vi.fn(),
  requestLocation: vi.fn(),
  openSettings: vi.fn(),
  selectVenue: vi.fn(),
  easeTo: vi.fn(),
}));

vi.mock('@/lib/contexts/SettingsContext', () => ({
  useSettings: () => ({
    activeView: null,
    openSettings: mockState.openSettings,
    openFeedback: vi.fn(),
    close: vi.fn(),
  }),
}));

vi.mock('@/hooks/useGeolocation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useGeolocation')>();
  return {
    ...actual,
    useGeolocation: () => ({
      status: 'idle',
      coords: { lat: 57.7089, lng: 11.9746 },
      requestLocation: mockState.requestLocation,
      useCentrum: () => {},
    }),
  };
});

vi.mock('@/hooks/queries/useVenueSearch', () => ({
  useVenueSearch: (params?: unknown) => mockState.useVenueSearch(params),
}));

vi.mock('@/lib/contexts/MapSelectionContext', () => ({
  useMapSelection: () => ({
    selectedVenueId: null,
    selectVenue: mockState.selectVenue,
    toggleVenue: () => {},
  }),
}));

vi.mock('@/lib/contexts/MapInstanceContext', () => ({
  useMapInstance: () => ({
    mapRef: { current: null },
    mapInstance: { easeTo: mockState.easeTo },
    setMapInstance: () => {},
  }),
}));

vi.mock('next-intl/navigation', () => ({
  createNavigation: () => ({
    Link: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a href={String(href)} {...props}>
        {children}
      </a>
    ),
    usePathname: () => '/',
    useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
    redirect: vi.fn(),
    getPathname: vi.fn(),
  }),
}));

const NAV_MESSAGES = {
  common: {
    appName: 'SunnySeat',
    nav: {
      barLabel: 'Huvudnavigation',
      headerLabel: 'Sidhuvud',
      logoAria: 'SunnySeat — gå till kartan',
      filter: 'Filter',
      myLocation: 'Min plats',
      settings: 'Inställningar',
    },
  },
  venue: {
    search: {
      label: 'Sök plats',
      placeholder: 'Sök plats eller område i Göteborg...',
      clear: 'Rensa sökning',
      loading: 'Söker platser',
      error: 'Sökningen kunde inte genomföras',
      noResults: 'Inga resultat för "{query}"',
      resultCount: '{count, plural, one {# resultat} other {# resultat}}',
      settings: 'Inställningar',
    },
  },
};

// Two venues whose tag UNION (first-seen order) is the expected chip row.
// "Takterrass" is intentionally NOT present on any venue → its chip must NOT
// render (data-driven union resolves the "chips represent tags no venue has"
// fabrication).
function makeVenueResponse(): GetVenuesResponse {
  const base = {
    neighborhood: 'Inom Vallgraven',
    currentSunStatus: 'Sunny' as const,
    isPartner: false,
    confidence: 90,
    distanceMeters: 100,
    sunExposurePercent: 90,
  };
  return {
    venues: [
      {
        ...base,
        id: 'venue-1',
        venueId: 'venue-1',
        venueName: 'Kafé Magasinet',
        venueSlug: 'test-venue-sunny',
        slug: 'test-venue-sunny',
        location: { lat: 57.7, lng: 11.97 },
        tags: ['Innergård', 'Hund ok', 'Wifi'],
      },
      {
        ...base,
        id: 'venue-5',
        venueId: 'venue-5',
        venueName: 'Brygghuset Lerum',
        venueSlug: 'brygghuset-lerum',
        slug: 'brygghuset-lerum',
        location: { lat: 57.77, lng: 12.28 },
        tags: ['Innergård', 'Hund ok'], // dupes with venue-1 → union de-dupes
      },
    ] as unknown as GetVenuesResponse['venues'],
    meta: { count: 2, radiusKm: 1.5 },
    timestamp: 'now',
    totalCount: 2,
  };
}

let TagFilterProvider: TagFilterProviderComponent;

function renderNav() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="sv" messages={NAV_MESSAGES}>
        <TagFilterProvider>
          <TimeProvider>
            <DesktopNavBar />
          </TimeProvider>
        </TagFilterProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe.skip('Story 9.7 AC2/AC3/AC5 — data-driven, enabled, toggleable chip row (RED)', () => {
  beforeEach(async () => {
    (mockState.useVenueSearch as Mock).mockReset().mockReturnValue({
      data: makeVenueResponse(),
      isFetching: false,
      isError: false,
      dataUpdatedAt: 1,
    });
    const mod = (await import(/* @vite-ignore */ TAG_FILTER_CTX)) as unknown as {
      TagFilterProvider: TagFilterProviderComponent;
    };
    TagFilterProvider = mod.TagFilterProvider;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders chips from the venues tag UNION, de-duped, in first-seen order (AC2)', () => {
    renderNav();
    // Union of ['Innergård','Hund ok','Wifi'] + ['Innergård','Hund ok'] = 3 chips.
    expect(screen.getByRole('button', { name: 'Innergård' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hund ok' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wifi' })).toBeInTheDocument();
    // A tag no venue carries must NOT render (no fabricated placeholder chip).
    expect(screen.queryByRole('button', { name: 'Takterrass' })).toBeNull();
  });

  it('chips are ENABLED (no disabled, no cursor-not-allowed) — flips the 9.6 marker', () => {
    renderNav();
    const chip = screen.getByRole('button', { name: 'Innergård' });
    expect(chip).toBeEnabled();
    expect(chip.className).not.toContain('cursor-not-allowed');
  });

  it('clicking a chip sets aria-pressed=true + the active pill classes; re-click clears', () => {
    renderNav();
    const chip = screen.getByRole('button', { name: 'Innergård' });

    // Idle: not pressed.
    expect(chip).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(chip);
    // Active "on" pill: dark #1b1b1e background (bg-text-primary) + white label.
    const active = screen.getByRole('button', { name: 'Innergård' });
    expect(active).toHaveAttribute('aria-pressed', 'true');
    expect(active.className).toContain('bg-text-primary');
    expect(active.className).toContain('text-white');

    fireEvent.click(active);
    expect(screen.getByRole('button', { name: 'Innergård' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
