import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { AnchorHTMLAttributes } from 'react';
import { renderWithProviders } from '@/test/setup/test-utils';
import { DesktopNavBar } from '@/components/custom/layout/DesktopNavBar';
import { TimeProvider } from '@/lib/contexts/TimeContext';
import { TagFilterProvider } from '@/lib/contexts/TagFilterContext';
import { addDaysToDateKey, stockholmDateKey } from '@/lib/utils/time-planner';
import type { GetVenuesResponse } from '@/lib/types/api';

// Story 11.2 (AC3): a forced planner date must be inside the today->today+3
// window or `stateFromForcedPlanner` clamps it to today. Compute an in-window
// date (today+2) from the live clock so these forcing cases round-trip.
const IN_WINDOW_DATE = addDaysToDateKey(stockholmDateKey(new Date()), 2);

const SEARCH_DEBOUNCE_MS = 200;

const mockState = vi.hoisted(() => ({
  selectVenue: vi.fn(),
  easeTo: vi.fn(),
  useVenueSearch: vi.fn(),
  requestLocation: vi.fn(),
  openSettings: vi.fn(),
  // Story 11.3 review: the chip strip is hidden in favourites mode, gated on the
  // favourites route, so the pathname must be drivable per-test. Defaults to the
  // nearest route ('/') so every existing chip test keeps the strip rendered.
  pathname: '/',
  // External-review reduced-motion fix: drive `useReducedMotion` per-test. motion
  // /react caches its matchMedia read, so mock the hook directly (as
  // MobileBottomSheet.test.tsx does) rather than swapping window.matchMedia.
  reducedMotion: false,
}));

vi.mock('motion/react', async () => {
  const actual = await vi.importActual<typeof import('motion/react')>('motion/react');
  return {
    ...actual,
    useReducedMotion: () => mockState.reducedMotion,
  };
});

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
    usePathname: () => mockState.pathname,
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
      scrollFiltersLeft: 'Bläddra filter åt vänster',
      scrollFiltersRight: 'Bläddra filter åt höger',
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
    mockState.pathname = '/';
    mockState.reducedMotion = false;
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
    renderDesktopNav({ forcedDate: IN_WINDOW_DATE, forcedTime: '14:00' });

    expect(mockState.useVenueSearch).toHaveBeenCalledWith(expect.objectContaining({
      date: IN_WINDOW_DATE,
      time: '14:00',
    }));
  });

  it('feeds useVenueSearch the SAME deferred-planner args + coordsSettled gate as MapView (Story 9.4 / R-001 de-dupe invariant) — external-review shared-args fix', () => {
    // The nav's chip-driving venue query MUST be byte-identical to MapView's so
    // TanStack collapses them into ONE request during a slider drag / before
    // geolocation settles. Both callers now derive the args via the SHARED
    // `venuePlannerQueryArgs`, which on an OFF-LIVE selection emits
    // `{ date, time, isLiveNow: false }` (the `isLiveNow` flag is part of the
    // shared shape — its absence was the pre-fix divergence that flipped the nav's
    // key `list`→`planner` on the first scrub away from live). MapView issues:
    //   useVenueSearch({ lat, lng, radiusKm: 1.5, enabled: coordsSettled,
    //                    ...useDeferredValue(venuePlannerQueryArgs(plannerTime)) })
    // with coordsSettled = status === 'success' || 'fallback'. The geolocation
    // mock here is `idle` → coordsSettled === false → the nav must pass
    // `enabled: false` (the missing-gate defect) AND the same radius/coords the
    // deferred planner rides on.
    renderDesktopNav({ forcedDate: IN_WINDOW_DATE, forcedTime: '14:00' });

    expect(mockState.useVenueSearch).toHaveBeenCalledWith({
      lat: 57.7089,
      lng: 11.9746,
      radiusKm: 1.5,
      enabled: false,
      date: IN_WINDOW_DATE,
      time: '14:00',
      isLiveNow: false,
    });
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

  it('shows the chip strip in nearest mode (non-favourites route) — Story 11.3 review AC1 parity', () => {
    mockState.pathname = '/';
    renderDesktopNav();

    // Nearest route → the tag-chip strip renders with the loaded-venue union.
    expect(screen.getByTestId('desktop-tag-chip-strip')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Innergård' })).toBeInTheDocument();
  });

  it('hides the chip strip in favourites mode, mirroring the mobile gate — Story 11.3 review AC1 parity', () => {
    mockState.pathname = '/favoriter';
    renderDesktopNav();

    // Favourites route → the strip is scoped away on BOTH breakpoints, so a
    // desktop user can no longer toggle a tag that would filter the shared pins
    // while the mobile user has no chip affordance (the divergence the review
    // flagged). The strip and its chips must be entirely absent.
    expect(screen.queryByTestId('desktop-tag-chip-strip')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Innergård' })).toBeNull();
    // A nested favourites detail route stays gated too.
    mockState.pathname = '/favoriter/kafe-magasinet';
    renderDesktopNav();
    expect(screen.queryByTestId('desktop-tag-chip-strip')).toBeNull();
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

  it('prunes an active tag that disappears from the new venue union so it can never orphan-strand the surfaces — Epic 9 review fix', () => {
    const { rerender } = renderDesktopNav();

    // Activate 'Wifi' (present in the initial union).
    const wifi = screen.getByRole('button', { name: 'Wifi' });
    fireEvent.click(wifi);
    expect(screen.getByRole('button', { name: 'Wifi' })).toHaveAttribute('aria-pressed', 'true');

    // The venue set changes (new location/time) and 'Wifi' is no longer in ANY
    // loaded venue's tags → its chip stops rendering. Without the prune it would
    // stay active in context, silently filtering the list + pins to empty with no
    // chip to clear it.
    mockState.useVenueSearch.mockReturnValue({
      data: {
        ...makeVenueResponse(),
        venues: makeVenueResponse().venues.map((venue) => ({
          ...venue,
          tags: ['Innergård', 'Hund ok'],
        })),
      },
      isFetching: false,
      isError: false,
      dataUpdatedAt: 2,
    });

    rerender(
      <TagFilterProvider>
        <TimeProvider>
          <DesktopNavBar />
        </TimeProvider>
      </TagFilterProvider>,
    );

    // The orphaned 'Wifi' chip is gone AND, if it were to re-appear, it would be
    // un-pressed (pruned from active state) — never a stranded, unclearable filter.
    expect(screen.queryByRole('button', { name: 'Wifi' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Innergård' })).toBeInTheDocument();
  });

  it('no longer renders the dead pager chevrons (Story 9.6 removed them)', () => {
    renderDesktopNav();

    expect(screen.queryByRole('button', { name: 'Föregående filter' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Nästa filter' })).toBeNull();
  });

  describe('Story 11.3 (AC4) — scrollable chip strip with arrows + edge-fades', () => {
    it('makes the chip strip horizontally scrollable (overflow-x-auto), NOT the old mid-chip clip', () => {
      renderDesktopNav();

      const strip = screen.getByTestId('desktop-tag-chip-strip');
      expect(strip.className).toContain('overflow-x-auto');
      // The hard mid-chip clip is gone.
      expect(strip.className).not.toContain('overflow-hidden');
    });

    it('keeps ALL tags in the DOM (none clipped away) and focusable as buttons', () => {
      renderDesktopNav();

      const strip = screen.getByTestId('desktop-tag-chip-strip');
      // Union of the two mock venues' tags: Innergård, Hund ok, Wifi.
      const chips = ['Innergård', 'Hund ok', 'Wifi'];
      for (const name of chips) {
        const chip = within(strip).getByRole('button', { name });
        expect(chip).toBeEnabled();
        chip.focus();
        expect(chip).toHaveFocus();
      }
    });

    it('renders real left/right scroll-arrow buttons (labelled, type=button)', () => {
      renderDesktopNav();

      const left = screen.getByRole('button', { name: 'Bläddra filter åt vänster' });
      const right = screen.getByRole('button', { name: 'Bläddra filter åt höger' });
      expect(left).toHaveAttribute('type', 'button');
      expect(right).toHaveAttribute('type', 'button');
    });

    it('sizes the scroll-arrow buttons to the 44px minimum interactive target (size-11, not size-9) — external-review fix', () => {
      renderDesktopNav();

      for (const name of ['Bläddra filter åt vänster', 'Bläddra filter åt höger']) {
        const arrow = screen.getByRole('button', { name });
        // 44px min target; the icon (size-5) is unchanged.
        expect(arrow).toHaveClass('size-11');
        expect(arrow).not.toHaveClass('size-9');
      }
    });

    it('disables the left arrow at the start (scrollLeft 0)', () => {
      renderDesktopNav();

      expect(screen.getByRole('button', { name: 'Bläddra filter åt vänster' })).toBeDisabled();
    });

    it('enables the right arrow when the strip overflows, and scrolls a page on click', () => {
      renderDesktopNav();

      const strip = screen.getByTestId('desktop-tag-chip-strip');
      // Simulate an overflowing strip (jsdom reports 0 for all scroll metrics).
      Object.defineProperty(strip, 'scrollWidth', { configurable: true, value: 800 });
      Object.defineProperty(strip, 'clientWidth', { configurable: true, value: 300 });
      const scrollBy = vi.fn();
      (strip as unknown as { scrollBy: typeof scrollBy }).scrollBy = scrollBy;

      // Fire a scroll event so the component recomputes canScrollRight.
      act(() => {
        strip.dispatchEvent(new Event('scroll'));
      });

      const right = screen.getByRole('button', { name: 'Bläddra filter åt höger' });
      expect(right).toBeEnabled();
      fireEvent.click(right);
      expect(scrollBy).toHaveBeenCalledWith(
        expect.objectContaining({ left: expect.any(Number) }),
      );
      expect(scrollBy.mock.calls[0][0].left).toBeGreaterThan(0);
    });

    it('arrow scroll uses SMOOTH behavior when motion is allowed (default) — external-review reduced-motion fix', () => {
      // No reduced-motion preference (jsdom matchMedia defaults matches:false) →
      // the animated `smooth` scroll is used.
      renderDesktopNav();

      const strip = screen.getByTestId('desktop-tag-chip-strip');
      Object.defineProperty(strip, 'scrollWidth', { configurable: true, value: 800 });
      Object.defineProperty(strip, 'clientWidth', { configurable: true, value: 300 });
      const scrollBy = vi.fn();
      (strip as unknown as { scrollBy: typeof scrollBy }).scrollBy = scrollBy;
      act(() => {
        strip.dispatchEvent(new Event('scroll'));
      });

      fireEvent.click(screen.getByRole('button', { name: 'Bläddra filter åt höger' }));
      expect(scrollBy.mock.calls[0][0].behavior).toBe('smooth');
      // The scroller's CSS scroll-behavior matches the animated default.
      expect((strip as HTMLElement).style.scrollBehavior).toBe('smooth');
    });

    it('arrow scroll uses AUTO (instant) behavior for prefers-reduced-motion users — external-review reduced-motion fix', () => {
      mockState.reducedMotion = true;
      try {
        renderDesktopNav();

        const strip = screen.getByTestId('desktop-tag-chip-strip');
        Object.defineProperty(strip, 'scrollWidth', { configurable: true, value: 800 });
        Object.defineProperty(strip, 'clientWidth', { configurable: true, value: 300 });
        const scrollBy = vi.fn();
        (strip as unknown as { scrollBy: typeof scrollBy }).scrollBy = scrollBy;
        act(() => {
          strip.dispatchEvent(new Event('scroll'));
        });

        fireEvent.click(screen.getByRole('button', { name: 'Bläddra filter åt höger' }));
        // Reduced motion → instant jump, no animation.
        expect(scrollBy.mock.calls[0][0].behavior).toBe('auto');
        expect((strip as HTMLElement).style.scrollBehavior).toBe('auto');
      } finally {
        mockState.reducedMotion = false;
      }
    });

    it('shows the right edge-fade only when there is more content to the right', () => {
      renderDesktopNav();

      // At rest in jsdom (all metrics 0) neither fade shows.
      expect(screen.queryByTestId('chip-fade-left')).toBeNull();
      expect(screen.queryByTestId('chip-fade-right')).toBeNull();

      const strip = screen.getByTestId('desktop-tag-chip-strip');
      Object.defineProperty(strip, 'scrollWidth', { configurable: true, value: 800 });
      Object.defineProperty(strip, 'clientWidth', { configurable: true, value: 300 });
      act(() => {
        strip.dispatchEvent(new Event('scroll'));
      });

      // Overflow to the right → the right edge-fade appears; left stays hidden at start.
      expect(screen.getByTestId('chip-fade-right')).toBeInTheDocument();
      expect(screen.queryByTestId('chip-fade-left')).toBeNull();
    });

    // --- Story 11.3 coverage expansion (automate): the mirror-image LEFT-arrow
    // path + the mid-scroll both-fades state + the scroll-into-view focus + the
    // page-size floor — the existing suite proves the right/start end only. ---

    /** Simulate an overflowing strip scrolled to a given scrollLeft, then flush. */
    function overflowAt(strip: HTMLElement, scrollLeft: number) {
      Object.defineProperty(strip, 'scrollWidth', { configurable: true, value: 800 });
      Object.defineProperty(strip, 'clientWidth', { configurable: true, value: 300 });
      Object.defineProperty(strip, 'scrollLeft', { configurable: true, writable: true, value: scrollLeft });
      act(() => {
        strip.dispatchEvent(new Event('scroll'));
      });
    }

    it('enables the LEFT arrow once scrolled away from the start, and scrolls a NEGATIVE page on click', () => {
      renderDesktopNav();

      const strip = screen.getByTestId('desktop-tag-chip-strip');
      const scrollBy = vi.fn();
      (strip as unknown as { scrollBy: typeof scrollBy }).scrollBy = scrollBy;
      // Scrolled to a middle position (max scroll = 800 - 300 = 500).
      overflowAt(strip, 250);

      const left = screen.getByRole('button', { name: 'Bläddra filter åt vänster' });
      expect(left).toBeEnabled();
      fireEvent.click(left);
      expect(scrollBy).toHaveBeenCalledTimes(1);
      // Left arrow scrolls in the negative direction.
      expect(scrollBy.mock.calls[0][0].left).toBeLessThan(0);
    });

    it('shows BOTH edge-fades when scrolled into the middle (more content on each side)', () => {
      renderDesktopNav();

      const strip = screen.getByTestId('desktop-tag-chip-strip');
      overflowAt(strip, 250); // between 0 and the 500 max → both directions scrollable

      expect(screen.getByTestId('chip-fade-left')).toBeInTheDocument();
      expect(screen.getByTestId('chip-fade-right')).toBeInTheDocument();
    });

    it('disables the RIGHT arrow at the true max scroll (end reached, 1px slack absorbed)', () => {
      renderDesktopNav();

      const strip = screen.getByTestId('desktop-tag-chip-strip');
      // scrollLeft at max (800 - 300 = 500) → right arrow disables, right fade hides.
      overflowAt(strip, 500);

      expect(screen.getByRole('button', { name: 'Bläddra filter åt höger' })).toBeDisabled();
      expect(screen.queryByTestId('chip-fade-right')).toBeNull();
      // ...while the left arrow (and fade) are now active.
      expect(screen.getByRole('button', { name: 'Bläddra filter åt vänster' })).toBeEnabled();
    });

    it('scrolls an off-screen chip into view when it receives focus (keyboard reachability)', () => {
      renderDesktopNav();

      const strip = screen.getByTestId('desktop-tag-chip-strip');
      const chip = within(strip).getByRole('button', { name: 'Wifi' });
      const scrollIntoView = vi.fn();
      (chip as unknown as { scrollIntoView: typeof scrollIntoView }).scrollIntoView = scrollIntoView;

      fireEvent.focus(chip);
      expect(scrollIntoView).toHaveBeenCalledWith(
        expect.objectContaining({ block: 'nearest', inline: 'nearest' }),
      );
    });

    it('scrolls by at least the 120px page floor even when the visible width is very small', () => {
      renderDesktopNav();

      const strip = screen.getByTestId('desktop-tag-chip-strip');
      const scrollBy = vi.fn();
      (strip as unknown as { scrollBy: typeof scrollBy }).scrollBy = scrollBy;
      // clientWidth so small that clientWidth-48 would underflow the floor.
      Object.defineProperty(strip, 'scrollWidth', { configurable: true, value: 800 });
      Object.defineProperty(strip, 'clientWidth', { configurable: true, value: 40 });
      act(() => {
        strip.dispatchEvent(new Event('scroll'));
      });

      fireEvent.click(screen.getByRole('button', { name: 'Bläddra filter åt höger' }));
      // Math.max(clientWidth - 48, 120) → the 120 floor (never 0 or negative).
      expect(scrollBy.mock.calls[0][0].left).toBe(120);
    });
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
        weatherGateState: 'not_gated',
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
        weatherGateState: 'not_gated',
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
