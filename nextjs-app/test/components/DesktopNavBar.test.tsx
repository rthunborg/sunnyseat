import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';
import { renderWithProviders } from '@/test/setup/test-utils';
import { DesktopNavBar } from '@/components/custom/layout/DesktopNavBar';
import { TimeProvider } from '@/lib/contexts/TimeContext';
import type { GetVenuesResponse } from '@/lib/types/api';

const SEARCH_DEBOUNCE_MS = 200;

const mockState = vi.hoisted(() => ({
  selectVenue: vi.fn(),
  easeTo: vi.fn(),
  useVenueSearch: vi.fn(),
}));

vi.mock('@/hooks/useGeolocation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useGeolocation')>();
  return {
    ...actual,
    useGeolocation: () => ({
    status: 'idle',
    coords: { lat: 57.7089, lng: 11.9746 },
    requestLocation: () => {},
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
      filterChips: {
        courtyard: 'Innergård',
        dogs: 'Hund ok',
        wifi: 'Wifi',
        pastries: 'Bakverk',
        morningSun: 'Morgonsol',
        takeAway: 'Take-away',
        sourdough: 'Surdeg',
        rooftop: 'Takt',
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

  it('keeps out-of-scope desktop chrome disabled until later stories own behavior', () => {
    renderDesktopNav();

    expect(screen.getByRole('button', { name: 'Innergård' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Föregående filter' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nästa filter' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Min plats' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Inställningar' })).toBeDisabled();
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
    <TimeProvider forcedDate={forcedDate} forcedTime={forcedTime}>
      <DesktopNavBar />
    </TimeProvider>,
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
        sunWindow: { start: '13:00', end: '18:30' },
        thumbnail: { alt: 'Kafé Magasinet uteservering', initials: 'KM' },
      },
    ],
    meta: { count: 1, radiusKm: 1.5 },
    timestamp: 'now',
    totalCount: 1,
  };
}
