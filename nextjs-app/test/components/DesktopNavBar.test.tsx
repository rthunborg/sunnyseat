import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';
import { renderWithProviders } from '@/test/setup/test-utils';
import { DesktopNavBar } from '@/components/custom/layout/DesktopNavBar';
import { TimeProvider } from '@/lib/contexts/TimeContext';
import { TagFilterProvider } from '@/lib/contexts/TagFilterContext';
import type { GetVenuesResponse } from '@/lib/types/api';

const SEARCH_DEBOUNCE_MS = 200;

const mockState = vi.hoisted(() => ({
  selectVenue: vi.fn(),
  easeTo: vi.fn(),
  useVenueSearch: vi.fn(),
  requestLocation: vi.fn(),
  openSettings: vi.fn(),
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
    loading: 'Laddar...',
    error: 'Kunde inte ladda',
    retry: 'Försök igen',
    nav: {
      barLabel: 'Huvudnavigation',
      headerLabel: 'Sidhuvud',
      karta: 'Karta',
      favoriter: 'Favoriter',
      om: 'Om',
      logoAria: 'SunnySeat — gå till kartan',
      searchPlaceholder: 'Sök plats eller område i Göteborg...',
      filter: 'Filter',
      previous: 'Föregående filter',
      next: 'Nästa filter',
      myLocation: 'Min plats',
      settings: 'Inställningar',
      language: 'Språk',
      switchToSwedish: 'Byt till svenska',
      switchToEnglish: 'Byt till engelska',
      filterChips: {
        courtyard: 'Innergård',
        dogs: 'Hund ok',
        wifi: 'Wifi',
        pastries: 'Bakverk',
        morningSun: 'Morgonsol',
        takeAway: 'Take-away',
        sourdough: 'Surdeg',
        rooftop: 'Takterrass',
      },
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

describe('DesktopNavBar', () => {
  beforeEach(() => {
    mockState.selectVenue.mockClear();
    mockState.easeTo.mockClear();
    mockState.useVenueSearch.mockReset().mockReturnValue({
      data: makeVenueResponse(),
      isFetching: false,
      isError: false,
      dataUpdatedAt: 1,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the SunnySeat wordmark inside a link to /', () => {
    renderDesktopNav();

    const logo = screen.getByRole('link', {
      name: 'SunnySeat — gå till kartan',
    });
    expect(logo).toHaveAttribute('href', '/');
    expect(logo).toHaveTextContent('SunnySeat');
  });

  it('renders the search combobox in the desktop navbar', () => {
    renderDesktopNav();

    const search = screen.getByRole('combobox', { name: 'Sök plats' });
    expect(search).toHaveAttribute('placeholder', 'Sök plats eller område i Göteborg...');
    expect(screen.getByRole('search', { name: 'Sök plats' })).toBeInTheDocument();
  });

  it('supports keyboard focus and selection from the navbar searchbox', async () => {
    // Single-result response so the keyboard navigation is deterministic
    // (the default multi-venue response drives the chip-union tests instead).
    mockState.useVenueSearch.mockReturnValue({
      data: makeSingleVenueResponse(),
      isFetching: false,
      isError: false,
      dataUpdatedAt: 1,
    });
    renderDesktopNav();

    const search = screen.getByRole('combobox', { name: 'Sök plats' });
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'magasinet' } });
    await screen.findByRole('option', { name: /Kafé Magasinet/ });
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(mockState.selectVenue).toHaveBeenCalledWith(
      'venue-1',
      expect.objectContaining({ id: 'venue-1' }),
    );
    expect(mockState.easeTo).toHaveBeenCalledWith({
      center: [11.97, 57.7],
      duration: 500,
    });
    await waitFor(() => expect(screen.getByTestId('venue-search-results')).not.toBeVisible());
    expect(search).not.toHaveFocus();
  });

  it('shows a loading state instead of stale nearby results while a new search is debouncing', async () => {
    renderDesktopNav();

    const search = screen.getByRole('combobox', { name: 'Sök plats' });
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'magasinet' } });

    expect(screen.getByText('Söker platser')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Kafé Magasinet/ })).not.toBeInTheDocument();

    await waitFor(
      () => expect(screen.getByRole('option', { name: /Kafé Magasinet/ })).toBeInTheDocument(),
      { timeout: SEARCH_DEBOUNCE_MS + 1000 },
    );
  });

  it('passes planner date and time to search queries', () => {
    renderDesktopNav({ forcedDate: '2026-06-14', forcedTime: '14:00' });

    expect(mockState.useVenueSearch).toHaveBeenCalledWith(expect.objectContaining({
      date: '2026-06-14',
      time: '14:00',
    }));
  });

  it('labels the outer <header> with the Swedish header aria-label', () => {
    renderDesktopNav();

    expect(screen.getByTestId('desktop-nav-bar')).toHaveAttribute(
      'aria-label',
      'Sidhuvud',
    );
  });

  it('renders the chip row from the loaded venues tag UNION (data-driven, de-duped, first-seen order) — Story 9.7', () => {
    renderDesktopNav();

    // Union of ['Innergård','Hund ok','Wifi'] + ['Innergård','Hund ok'] = 3 chips.
    expect(screen.getByRole('button', { name: 'Innergård' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hund ok' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wifi' })).toBeInTheDocument();
    // A tag no venue carries must NOT render (the hardcoded 'Takterrass'
    // placeholder is gone — chips are the real tag union now).
    expect(screen.queryByRole('button', { name: 'Takterrass' })).toBeNull();
  });

  it('enables the filter chips (no disabled / cursor-not-allowed) — flips the Story 9.6 marker', () => {
    renderDesktopNav();

    const chip = screen.getByRole('button', { name: 'Innergård' });
    expect(chip).toBeEnabled();
    expect(chip.className).not.toContain('cursor-not-allowed');
    expect(chip).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles a chip on/off through the shared context (active "on" pill; re-click clears) — Story 9.7', () => {
    renderDesktopNav();

    const chip = screen.getByRole('button', { name: 'Innergård' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(chip);
    const active = screen.getByRole('button', { name: 'Innergård' });
    expect(active).toHaveAttribute('aria-pressed', 'true');
    // Reference "on" pill: dark #1b1b1e (bg-text-primary) + white label.
    expect(active.className).toContain('bg-text-primary');
    expect(active.className).toContain('text-white');

    fireEvent.click(active);
    expect(screen.getByRole('button', { name: 'Innergård' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('no longer renders the dead pager chevrons (Story 9.6 removed them)', () => {
    renderDesktopNav();

    expect(screen.queryByRole('button', { name: 'Föregående filter' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Nästa filter' })).toBeNull();
  });

  it('opens the settings modal from the settings button and no longer renders a standalone About link', () => {
    renderDesktopNav();

    // About now lives inside the settings modal ("Om SunnySeat").
    expect(screen.queryByTestId('desktop-nav-about')).not.toBeInTheDocument();

    const settings = screen.getByRole('button', { name: 'Inställningar' });
    expect(settings).toBeEnabled();
    fireEvent.click(settings);
    expect(mockState.openSettings).toHaveBeenCalledTimes(1);
  });

  it('wires the my-location button to request geolocation (the canonical desktop control)', () => {
    renderDesktopNav();

    const locate = screen.getByRole('button', { name: 'Min plats' });
    expect(locate).toBeEnabled();
    fireEvent.click(locate);
    expect(mockState.requestLocation).toHaveBeenCalledTimes(1);
  });

  it('renders the SV/EN language switcher group', () => {
    renderDesktopNav();

    expect(screen.getByRole('group', { name: 'Språk' })).toBeInTheDocument();
    expect(screen.getByTestId('language-switch-sv')).toBeInTheDocument();
    expect(screen.getByTestId('language-switch-en')).toBeInTheDocument();
  });
});

function renderDesktopNav({
  forcedDate,
  forcedTime,
}: {
  forcedDate?: string;
  forcedTime?: string;
} = {}) {
  return renderWithProviders(
    // Story 9.7: the chip row writes to the shared TagFilterContext, so the nav
    // must render inside a real TagFilterProvider for the toggle to update state.
    <TagFilterProvider>
      <TimeProvider forcedDate={forcedDate} forcedTime={forcedTime}>
        <DesktopNavBar />
      </TimeProvider>
    </TagFilterProvider>,
    { messages: NAV_MESSAGES },
  );
}

function makeVenueResponse(): GetVenuesResponse {
  return {
    venues: [
      {
        id: 'venue-1',
        venueId: 'venue-1',
        venueName: 'Kafé Magasinet',
        venueSlug: 'test-venue-sunny',
        slug: 'test-venue-sunny',
        neighborhood: 'Inom Vallgraven',
        location: { lat: 57.7, lng: 11.97 },
        currentSunStatus: 'Sunny',
        isPartner: false,
        confidence: 92,
        distanceMeters: 180,
        sunExposurePercent: 95,
        // Story 9.7: real tags drive the data-driven chip row (union, first-seen
        // order). 'Take-away' repeats across the two venues → de-duped to one chip.
        tags: ['Innergård', 'Hund ok', 'Wifi'],
        sunWindow: { start: '13:00', end: '18:30' },
        thumbnail: { alt: 'Kafé Magasinet uteservering', initials: 'KM' },
      },
      {
        id: 'venue-5',
        venueId: 'venue-5',
        venueName: 'Brygghuset Lerum',
        venueSlug: 'brygghuset-lerum',
        slug: 'brygghuset-lerum',
        neighborhood: 'Haga',
        location: { lat: 57.7115, lng: 11.9605 },
        currentSunStatus: 'Partial',
        isPartner: false,
        confidence: 66,
        distanceMeters: 260,
        sunExposurePercent: 58,
        tags: ['Innergård', 'Hund ok'],
        sunWindow: { start: '13:35', end: '16:50' },
        thumbnail: { alt: 'Brygghuset Lerum uteservering', initials: 'BL' },
      },
    ],
    meta: { count: 2, radiusKm: 1.5 },
    timestamp: 'now',
    totalCount: 2,
  };
}

// Single-result response for the deterministic keyboard-selection test.
function makeSingleVenueResponse(): GetVenuesResponse {
  const full = makeVenueResponse();
  return {
    ...full,
    venues: [full.venues[0]],
    meta: { count: 1, radiusKm: 1.5 },
    totalCount: 1,
  };
}
