import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { useRef, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type maplibregl from 'maplibre-gl';
import { MapInstanceContext } from '@/lib/contexts/MapInstanceContext';
import { VenueSearchShell } from '@/components/custom/search/VenueSearchShell';

// Story 9.6: the mobile top-bar locate + settings pair is the single surviving
// mobile access point (the floating MapControls duplicates were removed). This
// suite covers the two behaviours 9.6 landed here:
//   - Task 2: the settings gear is enabled and opens the settings modal.
//   - Task 1: the locate button carries the relocated Story 9.5 reliability
//     feedback (aria-busy + data-locate-state, clickable on fallback).

const mockState = vi.hoisted(() => ({
  openSettings: vi.fn(),
  requestLocation: vi.fn(),
}));

const geoState = vi.hoisted(() => ({ status: 'idle' as string }));
const searchState = vi.hoisted(() => ({
  venues: [] as Array<{
    id: string;
    venueId: string;
    venueName: string;
    venueSlug: string;
    slug: string;
    neighborhood: string;
    location: { lat: number; lng: number };
    currentSunStatus: string;
    weatherGateState: string;
    isPartner: boolean;
    confidence: number;
    distanceMeters: number;
    sunExposurePercent: number;
    tags: string[];
    openingHours?: Record<string, { open: string; close: string } | null>;
  }>,
}));
const selectionState = vi.hoisted(() => ({
  selectVenue: vi.fn(),
}));
const routerState = vi.hoisted(() => ({
  push: vi.fn(),
}));
const navigationState = vi.hoisted(() => ({
  searchParams: '',
}));

vi.mock('@/lib/contexts/SettingsContext', () => ({
  useSettings: () => ({
    activeView: null,
    openSettings: mockState.openSettings,
    openFeedback: vi.fn(),
    close: vi.fn(),
  }),
}));

vi.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    status: geoState.status,
    coords: { lat: 57.7089, lng: 11.9746 },
    requestLocation: mockState.requestLocation,
    useCentrum: vi.fn(),
  }),
}));

vi.mock('@/hooks/queries/useVenueSearch', () => ({
  useVenueSearch: () => ({
    data: { venues: searchState.venues },
    isFetching: false,
    isError: false,
    dataUpdatedAt: 1,
  }),
}));

vi.mock('@/lib/contexts/MapSelectionContext', () => ({
  useMapSelection: () => ({
    selectedVenueId: null,
    selectVenue: selectionState.selectVenue,
    toggleVenue: vi.fn(),
  }),
}));

vi.mock('@/lib/contexts/TimeContext', () => ({
  useTimeContext: () => ({
    currentTime: new Date('2026-05-20T10:15:00.000Z'),
    selectedDate: '2026-05-20',
    selectedTime: '12:15',
    selectedMinutes: 735,
    isLiveNow: true,
    plannerQuery: undefined,
  }),
}));

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: routerState.push }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigationState.searchParams),
}));

const messages = {
  common: {
    nav: {
      myLocation: 'Min plats',
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
      closedAtSelectedTime: 'Stängt vid vald tid',
    },
  },
};

type MapInstanceContextValue = React.ComponentProps<
  typeof MapInstanceContext.Provider
>['value'];

function Wrapper({ children }: { children: ReactNode }) {
  const stubMap = {
    easeTo: vi.fn() as Mock,
    flyTo: vi.fn() as Mock,
  } as unknown as maplibregl.Map;
  const mapRef = useRef<maplibregl.Map | null>(stubMap);
  const value: MapInstanceContextValue = {
    mapRef,
    mapInstance: stubMap,
    setMapInstance: () => {},
  };
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale="sv" messages={messages}>
        <MapInstanceContext.Provider value={value}>{children}</MapInstanceContext.Provider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

describe('<VenueSearchShell variant="mobile" /> top-bar controls (Story 9.6)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    geoState.status = 'idle';
    searchState.venues = [];
    navigationState.searchParams = '';
  });

  it('enables the settings gear and opens the settings modal on click', () => {
    const { getByTestId } = render(<VenueSearchShell variant="mobile" />, { wrapper: Wrapper });
    const settings = getByTestId('search-shell-settings');
    expect(settings).not.toBeDisabled();
    expect(settings).toHaveAttribute('aria-label', 'Inställningar');
    fireEvent.click(settings);
    expect(mockState.openSettings).toHaveBeenCalledTimes(1);
  });

  it('keeps the locate button wired to requestLocation and exposes the idle locate state', () => {
    const { getByTestId } = render(<VenueSearchShell variant="mobile" />, { wrapper: Wrapper });
    const locate = getByTestId('search-shell-my-location');
    expect(locate).toHaveAttribute('aria-label', 'Min plats');
    expect(locate).toHaveAttribute('data-locate-state', 'idle');
    expect(locate).not.toHaveAttribute('aria-busy');
    fireEvent.click(locate);
    expect(mockState.requestLocation).toHaveBeenCalledTimes(1);
  });

  it('reflects the relocated Story 9.5 pending feedback (aria-busy + data-locate-state)', () => {
    geoState.status = 'pending';
    const { getByTestId } = render(<VenueSearchShell variant="mobile" />, { wrapper: Wrapper });
    const locate = getByTestId('search-shell-my-location');
    expect(locate).toHaveAttribute('aria-busy', 'true');
    expect(locate).toHaveAttribute('data-locate-state', 'pending');
  });

  it('stays clickable to retry on fallback (denied/unavailable) with data-locate-state=fallback', () => {
    geoState.status = 'fallback';
    const { getByTestId } = render(<VenueSearchShell variant="mobile" />, { wrapper: Wrapper });
    const locate = getByTestId('search-shell-my-location') as HTMLButtonElement;
    expect(locate.disabled).toBe(false);
    expect(locate).toHaveAttribute('data-locate-state', 'fallback');
    expect(locate).not.toHaveAttribute('aria-busy');
  });

  it('clears the busy signal once geolocation resolves to success (completes the 9.5 state matrix)', () => {
    geoState.status = 'success';
    const { getByTestId } = render(<VenueSearchShell variant="mobile" />, { wrapper: Wrapper });
    const locate = getByTestId('search-shell-my-location') as HTMLButtonElement;
    // aria-busy is only set while pending — success must drop it so AT does not
    // keep announcing a permanent busy locate control after the pin lands.
    expect(locate).not.toHaveAttribute('aria-busy');
    expect(locate).toHaveAttribute('data-locate-state', 'success');
    expect(locate.disabled).toBe(false);
  });

  it('renders the search combobox with no floating locate/settings duplicates on the shell surface', () => {
    // Story 9.6 consolidation: the mobile shell is the SINGLE mobile access
    // point. It owns exactly one locate + one settings control — the removed
    // MapControls duplicates must never resurface here under their old testids.
    const { getByRole, getAllByTestId, queryByTestId } = render(
      <VenueSearchShell variant="mobile" />,
      { wrapper: Wrapper },
    );
    expect(getByRole('combobox', { name: 'Sök plats' })).toBeInTheDocument();
    expect(getAllByTestId('search-shell-my-location')).toHaveLength(1);
    expect(getAllByTestId('search-shell-settings')).toHaveLength(1);
    expect(queryByTestId('map-control-my-location')).toBeNull();
    expect(queryByTestId('map-control-settings')).toBeNull();
  });

  it('keeps only an exact full-name closed match in search and opens it as detail without restoring a pin', async () => {
    vi.useFakeTimers();
    searchState.venues = [
      makeSearchVenue({
        id: 'closed-venue',
        name: 'Kafé Magasinet',
        slug: 'kafe-magasinet',
        openingHours: {
          '1': { open: '18:00', close: '22:00' },
          '2': { open: '18:00', close: '22:00' },
          '3': { open: '18:00', close: '22:00' },
          '4': { open: '18:00', close: '22:00' },
          '5': { open: '18:00', close: '22:00' },
          '6': { open: '18:00', close: '22:00' },
          '7': { open: '18:00', close: '22:00' },
        },
      }),
    ];
    const { getByLabelText, getByRole, queryByText } = render(<VenueSearchShell variant="desktop" />, {
      wrapper: Wrapper,
    });
    const input = getByRole('combobox', { name: 'Sök plats' });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Kafé' } });
    await actFlushSearchDebounce();
    expect(queryByText('Kafé Magasinet')).toBeNull();

    fireEvent.change(input, { target: { value: 'Kafé Magasinet' } });
    await actFlushSearchDebounce();
    const exact = getByRole('option', { name: /Kafé Magasinet.*Stängt vid vald tid/ });
    fireEvent.click(exact);

    expect(selectionState.selectVenue).not.toHaveBeenCalled();
    expect(routerState.push).toHaveBeenCalledWith({
      pathname: '/',
      query: { venue: 'kafe-magasinet' },
    });
  });

  it('retains a closed exact match when the user omits accents and casing, but still filters non-full-name text', async () => {
    vi.useFakeTimers();
    searchState.venues = [
      makeSearchVenue({
        id: 'closed-venue',
        name: 'Kafé Magasinet',
        slug: 'kafe-magasinet',
        openingHours: {
          '1': { open: '18:00', close: '22:00' },
          '2': { open: '18:00', close: '22:00' },
          '3': { open: '18:00', close: '22:00' },
          '4': { open: '18:00', close: '22:00' },
          '5': { open: '18:00', close: '22:00' },
          '6': { open: '18:00', close: '22:00' },
          '7': { open: '18:00', close: '22:00' },
        },
      }),
    ];
    const { getByLabelText, getByRole, queryByText } = render(<VenueSearchShell variant="desktop" />, {
      wrapper: Wrapper,
    });
    const input = getByRole('combobox', { name: 'Sök plats' });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'kafe magasinet ' } });
    await actFlushSearchDebounce();
    expect(
      getByLabelText('Kafé Magasinet, Inom Vallgraven, Stängt vid vald tid'),
    ).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'magasinet' } });
    await actFlushSearchDebounce();
    expect(queryByText('Kafé Magasinet')).toBeNull();
  });

  it('seeds the exact closed search result for the selected-time closed visual route', () => {
    navigationState.searchParams =
      '_state=map-selected-time-closed&_search=Kaf%C3%A9%20Magasinet';
    searchState.venues = [
      makeSearchVenue({
        id: 'closed-venue',
        name: 'Kafé Magasinet',
        slug: 'kafe-magasinet',
        openingHours: {
          '1': { open: '18:00', close: '22:00' },
          '2': { open: '18:00', close: '22:00' },
          '3': { open: '18:00', close: '22:00' },
          '4': { open: '18:00', close: '22:00' },
          '5': { open: '18:00', close: '22:00' },
          '6': { open: '18:00', close: '22:00' },
          '7': { open: '18:00', close: '22:00' },
        },
      }),
    ];

    const { getByRole } = render(<VenueSearchShell variant="desktop" />, {
      wrapper: Wrapper,
    });

    expect(getByRole('combobox', { name: 'Sök plats' })).toHaveValue('Kafé Magasinet');
    expect(
      getByRole('option', { name: /Kafé Magasinet.*Stängt vid vald tid/ }),
    ).toBeInTheDocument();
  });
});

async function actFlushSearchDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });
}

function makeSearchVenue({
  id,
  name,
  slug,
  openingHours,
}: {
  id: string;
  name: string;
  slug: string;
  openingHours?: Record<string, { open: string; close: string } | null>;
}) {
  return {
    id,
    venueId: id,
    venueName: name,
    venueSlug: slug,
    slug,
    neighborhood: 'Inom Vallgraven',
    location: { lat: 57.7, lng: 11.97 },
    currentSunStatus: 'Sunny',
    weatherGateState: 'not_gated',
    isPartner: false,
    confidence: 92,
    distanceMeters: 180,
    sunExposurePercent: 95,
    tags: [],
    openingHours,
  };
}
