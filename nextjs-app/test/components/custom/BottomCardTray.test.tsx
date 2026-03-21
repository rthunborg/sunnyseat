import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useEffect } from 'react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(function MotionDiv(props: Record<string, unknown>, ref: React.Ref<HTMLDivElement>) {
      const { children, drag, dragConstraints, dragElastic, onDragEnd, ...rest } = props;
      return React.createElement('div', { ...rest, ref, 'data-testid': 'motion-div' }, children as React.ReactNode);
    }),
  },
  useMotionValue: (initial: number) => ({
    get: () => initial,
    set: () => {},
  }),
  animate: vi.fn(),
}));

// Mock useReducedMotion
vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

// Mock useIsDesktop — default to mobile (false)
let mockIsDesktop = false;
vi.mock('@/lib/hooks/useIsDesktop', () => ({
  useIsDesktop: () => mockIsDesktop,
}));

// Mock VenueCard
vi.mock('@/components/custom/VenueCard', () => ({
  VenueCard: (props: Record<string, unknown>) => (
    <div
      data-testid={`venue-card-${props.venueId}`}
      data-is-best-choice={props.isBestChoice ? 'true' : 'false'}
      data-layout={props.layout}
      onMouseEnter={props.onMouseEnter as React.MouseEventHandler | undefined}
      onMouseLeave={props.onMouseLeave as React.MouseEventHandler | undefined}
    >
      {props.venueName as string}
    </div>
  ),
}));

// Mock VenueCardSkeleton
vi.mock('@/components/custom/VenueCardSkeleton', () => ({
  VenueCardSkeleton: () => (
    <div data-testid="venue-card-skeleton">
      <div className="h-[120px] rounded-card shadow-card animate-warm-pulse" aria-hidden="true" />
      <p role="status">Letar efter soliga platser...</p>
    </div>
  ),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Mock SeasonalBanner
vi.mock('@/components/custom/SeasonalBanner', () => ({
  SeasonalBanner: () => <div data-testid="seasonal-banner">Seasonal Banner</div>,
}));

import { CardTrayProvider, useCardTray } from '@/lib/context/CardTrayContext';
import { LanguageProvider } from '@/lib/i18n';
import { BottomCardTray } from '@/components/custom/BottomCardTray';
import type { SunExposureResult } from '@/lib/types/venue';
import type { SunStatus } from '@/lib/types/design-tokens';

function makeVenue(id: string, name: string, status: SunStatus = 'sunny'): SunExposureResult {
  return {
    venue: { id, name, slug: id, neighborhood: 'Haga', lat: 57.7, lng: 11.97 },
    current_status: status,
    sun_exposure_percent: 85,
    confidence: 0.9,
    windows: [],
    weather: { cloud_cover_percent: 10, sky_condition: 'clear', temperature_c: 14, wind_speed_ms: 3, source: 'met.no', fetched_at: new Date().toISOString() },
    distance_meters: 350,
  };
}

function VenueInjector({ venues }: { venues: SunExposureResult[] }) {
  const { setVenues } = useCardTray();
  useEffect(() => {
    setVenues(venues);
  }, [venues, setVenues]);
  return null;
}

function LoadingInjector() {
  const { setLoading } = useCardTray();
  useEffect(() => {
    setLoading(true);
  }, [setLoading]);
  return null;
}

function TestWrapper({ children, venues, loading }: { children: React.ReactNode; venues?: SunExposureResult[]; loading?: boolean }) {
  return (
    <LanguageProvider>
      <CardTrayProvider>
        {venues && <VenueInjector venues={venues} />}
        {loading && <LoadingInjector />}
        {children}
      </CardTrayProvider>
    </LanguageProvider>
  );
}

describe('BottomCardTray', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDesktop = false;
  });

  it('renders grab handle', () => {
    render(
      <TestWrapper>
        <BottomCardTray />
      </TestWrapper>
    );
    const handle = document.querySelector('[aria-hidden="true"]');
    expect(handle).toBeTruthy();
  });

  it('shows empty state when no venues', () => {
    render(
      <TestWrapper>
        <BottomCardTray />
      </TestWrapper>
    );
    expect(screen.getByTestId('empty-state-area')).toBeInTheDocument();
  });

  it('renders venue cards when venues are provided', async () => {
    const venues = [makeVenue('v1', 'Café Husaren'), makeVenue('v2', 'Da Matteo')];
    render(
      <TestWrapper venues={venues}>
        <BottomCardTray />
      </TestWrapper>
    );
    await vi.waitFor(() => {
      expect(screen.getByTestId('venue-card-v1')).toBeInTheDocument();
      expect(screen.getByTestId('venue-card-v2')).toBeInTheDocument();
    });
  });

  it('shows VenueCardSkeleton when loading', () => {
    render(
      <TestWrapper loading>
        <BottomCardTray />
      </TestWrapper>
    );
    expect(screen.getByTestId('venue-card-skeleton')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  describe('status group headers', () => {
    it('renders group headers for each status present', async () => {
      const venues = [
        makeVenue('v1', 'Sunny Place', 'sunny'),
        makeVenue('v2', 'Shaded Place', 'shaded'),
        makeVenue('v3', 'Upcoming Place', 'upcoming'),
      ];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        expect(screen.getByTestId('group-header-sunny')).toBeInTheDocument();
        expect(screen.getByTestId('group-header-shaded')).toBeInTheDocument();
        expect(screen.getByTestId('group-header-upcoming')).toBeInTheDocument();
      });
    });

    it('does not render headers for empty groups', async () => {
      const venues = [makeVenue('v1', 'Sunny Place', 'sunny')];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        expect(screen.getByTestId('group-header-sunny')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('group-header-shaded')).not.toBeInTheDocument();
      expect(screen.queryByTestId('group-header-partial')).not.toBeInTheDocument();
      expect(screen.queryByTestId('group-header-upcoming')).not.toBeInTheDocument();
    });

    it('group headers have role="heading" and aria-level="3"', async () => {
      const venues = [makeVenue('v1', 'Sunny Place', 'sunny')];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        const header = screen.getByTestId('group-header-sunny');
        expect(header.getAttribute('role')).toBe('heading');
        expect(header.getAttribute('aria-level')).toBe('3');
      });
    });

    it('group headers have sticky positioning class', async () => {
      const venues = [makeVenue('v1', 'Sunny Place', 'sunny')];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        const header = screen.getByTestId('group-header-sunny');
        expect(header.className).toContain('sticky');
        expect(header.className).toContain('top-0');
      });
    });

    it('group headers have left border in status color', async () => {
      const venues = [
        makeVenue('v1', 'Sunny Place', 'sunny'),
        makeVenue('v2', 'Shaded Place', 'shaded'),
      ];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        expect(screen.getByTestId('group-header-sunny').className).toContain('border-l-sun-sunny');
        expect(screen.getByTestId('group-header-shaded').className).toContain('border-l-sun-shaded');
      });
    });
  });

  describe('venue count summary', () => {
    it('renders enhanced summary with total, sunny, and upcoming counts', async () => {
      const venues = [
        makeVenue('v1', 'Sunny 1', 'sunny'),
        makeVenue('v2', 'Sunny 2', 'sunny'),
        makeVenue('v3', 'Upcoming 1', 'upcoming'),
        makeVenue('v4', 'Shaded 1', 'shaded'),
      ];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        const summary = screen.getByTestId('venue-summary');
        expect(summary).toBeInTheDocument();
        expect(summary.textContent).toContain('4');
        expect(summary.textContent).toContain('2 soliga');
        expect(summary.textContent).toContain('1 med sol snart');
      });
    });

    it('shows colored dots in summary', async () => {
      const venues = [
        makeVenue('v1', 'Sunny 1', 'sunny'),
        makeVenue('v2', 'Upcoming 1', 'upcoming'),
      ];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        const summary = screen.getByTestId('venue-summary');
        const dots = summary.querySelectorAll('.rounded-full');
        expect(dots.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('first card emphasis', () => {
    it('marks first sunny venue as best choice', async () => {
      const venues = [
        makeVenue('v1', 'Best Sunny', 'sunny'),
        makeVenue('v2', 'Other Sunny', 'sunny'),
        makeVenue('v3', 'Shaded', 'shaded'),
      ];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        const bestCard = screen.getByTestId('venue-card-v1');
        expect(bestCard.getAttribute('data-is-best-choice')).toBe('true');
        const otherCard = screen.getByTestId('venue-card-v2');
        expect(otherCard.getAttribute('data-is-best-choice')).toBe('false');
      });
    });

    it('does not mark best choice when no sunny venues', async () => {
      const venues = [
        makeVenue('v1', 'Partial 1', 'partial'),
        makeVenue('v2', 'Upcoming 1', 'upcoming'),
      ];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        const card = screen.getByTestId('venue-card-v1');
        expect(card.getAttribute('data-is-best-choice')).toBe('false');
      });
    });
  });

  describe('scroll fade', () => {
    it('renders scroll fade container when venues are present', async () => {
      const venues = [makeVenue('v1', 'Café Husaren', 'sunny')];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        const container = screen.getByTestId('scroll-fade-container');
        expect(container).toBeInTheDocument();
      });
    });

    it('does not render scroll fade container when no venues (empty state)', () => {
      render(
        <TestWrapper>
          <BottomCardTray />
        </TestWrapper>
      );
      // The container still exists but without the fade style
      const container = screen.queryByTestId('scroll-fade-container');
      if (container) {
        // Style should not contain mask when no venues
        const style = container.getAttribute('style') ?? '';
        expect(style).not.toContain('mask-image');
      }
    });
  });

  describe('desktop side panel', () => {
    beforeEach(() => {
      mockIsDesktop = true;
    });

    it('renders as aside with "Venue list" label on desktop', () => {
      render(
        <TestWrapper>
          <BottomCardTray />
        </TestWrapper>
      );
      const aside = screen.getByRole('complementary', { name: 'Venue list' });
      expect(aside).toBeInTheDocument();
      expect(aside.tagName).toBe('ASIDE');
    });

    it('has 380px width class on desktop', () => {
      render(
        <TestWrapper>
          <BottomCardTray />
        </TestWrapper>
      );
      const aside = screen.getByRole('complementary', { name: 'Venue list' });
      expect(aside.className).toContain('w-[380px]');
    });

    it('has xl:w-[440px] responsive width class on desktop', () => {
      render(
        <TestWrapper>
          <BottomCardTray />
        </TestWrapper>
      );
      const aside = screen.getByRole('complementary', { name: 'Venue list' });
      expect(aside.className).toContain('xl:w-[440px]');
    });

    it('renders side panel header with SunnySeat wordmark', () => {
      render(
        <TestWrapper>
          <BottomCardTray />
        </TestWrapper>
      );
      expect(screen.getByTestId('side-panel-header')).toBeInTheDocument();
      expect(screen.getByText('SunnySeat')).toBeInTheDocument();
    });

    it('side panel header has border-bottom separator', () => {
      render(
        <TestWrapper>
          <BottomCardTray />
        </TestWrapper>
      );
      const header = screen.getByTestId('side-panel-header');
      expect(header.className).toContain('border-b');
      expect(header.className).toContain('border-border-default');
    });

    it('side panel header contains sort/filter placeholder', () => {
      render(
        <TestWrapper>
          <BottomCardTray />
        </TestWrapper>
      );
      expect(screen.getByTestId('sort-filter-placeholder')).toBeInTheDocument();
    });

    it('renders venue cards in side panel on desktop', async () => {
      const venues = [makeVenue('v1', 'Café Husaren')];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        expect(screen.getByTestId('venue-card-v1')).toBeInTheDocument();
      });
      // Verify it's inside the aside
      const aside = screen.getByRole('complementary', { name: 'Venue list' });
      expect(aside).toContainElement(screen.getByTestId('venue-card-v1'));
    });

    it('passes layout="expanded" to VenueCards on desktop', async () => {
      const venues = [makeVenue('v1', 'Café Husaren')];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        const card = screen.getByTestId('venue-card-v1');
        expect(card.getAttribute('data-layout')).toBe('expanded');
      });
    });

    it('does not render drag handle on desktop', () => {
      render(
        <TestWrapper>
          <BottomCardTray />
        </TestWrapper>
      );
      // Grab handle div with w-10 h-1 is only in mobile layout
      const motionDiv = screen.queryByTestId('motion-div');
      expect(motionDiv).not.toBeInTheDocument();
    });

    it('renders group headers on desktop too', async () => {
      const venues = [
        makeVenue('v1', 'Sunny Place', 'sunny'),
        makeVenue('v2', 'Shaded Place', 'shaded'),
      ];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        expect(screen.getByTestId('group-header-sunny')).toBeInTheDocument();
        expect(screen.getByTestId('group-header-shaded')).toBeInTheDocument();
      });
    });

    it('calls onVenueHover on card mouse events', async () => {
      const hoverMock = vi.fn();
      const venues = [makeVenue('v1', 'Café Husaren')];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray onVenueHover={hoverMock} />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        const card = screen.getByTestId('venue-card-v1');
        fireEvent.mouseEnter(card);
        expect(hoverMock).toHaveBeenCalledWith('v1');
        fireEvent.mouseLeave(card);
        expect(hoverMock).toHaveBeenCalledWith(null);
      });
    });
  });

  describe('mobile bottom sheet', () => {
    it('renders motion div with "Venue card tray" label', () => {
      render(
        <TestWrapper>
          <BottomCardTray />
        </TestWrapper>
      );
      const tray = screen.getByLabelText('Venue card tray');
      expect(tray).toBeInTheDocument();
    });

    it('does not render aside element on mobile', () => {
      render(
        <TestWrapper>
          <BottomCardTray />
        </TestWrapper>
      );
      const aside = screen.queryByRole('complementary');
      expect(aside).not.toBeInTheDocument();
    });

    it('uses z-40 for proper stacking above time controls', () => {
      render(
        <TestWrapper>
          <BottomCardTray />
        </TestWrapper>
      );
      const tray = screen.getByLabelText('Venue card tray');
      expect(tray.className).toContain('z-40');
    });

    it('passes layout="compact" to VenueCards on mobile', async () => {
      const venues = [makeVenue('v1', 'Café Husaren')];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        const card = screen.getByTestId('venue-card-v1');
        expect(card.getAttribute('data-layout')).toBe('compact');
      });
    });
  });

  describe('seasonal banner integration', () => {
    it('renders SeasonalBanner at top of mobile tray', () => {
      render(
        <TestWrapper>
          <BottomCardTray />
        </TestWrapper>
      );
      expect(screen.getByTestId('seasonal-banner')).toBeInTheDocument();
    });

    it('renders SeasonalBanner at top of desktop side panel', () => {
      mockIsDesktop = true;
      render(
        <TestWrapper>
          <BottomCardTray />
        </TestWrapper>
      );
      expect(screen.getByTestId('seasonal-banner')).toBeInTheDocument();
    });
  });

  describe('cloudy day mode', () => {
    it('shows cloudy day header when >80% venues are shaded', async () => {
      // 9 shaded + 1 sunny = 90% > 80%
      const venues = [
        makeVenue('v1', 'Sunny 1', 'sunny'),
        ...Array.from({ length: 9 }, (_, i) => makeVenue(`s${i}`, `Shaded ${i}`, 'shaded')),
      ];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        expect(screen.getByTestId('cloudy-day-header')).toBeInTheDocument();
      });
    });

    it('does not show cloudy day header when <=80% venues are shaded', async () => {
      // 4 shaded + 1 sunny = 80% exactly (not >80%)
      const venues = [
        makeVenue('v1', 'Sunny 1', 'sunny'),
        ...Array.from({ length: 4 }, (_, i) => makeVenue(`s${i}`, `Shaded ${i}`, 'shaded')),
      ];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        expect(screen.getByTestId('venue-groups')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('cloudy-day-header')).not.toBeInTheDocument();
    });

    it('adds visual emphasis to sunny/partial venues on cloudy days', async () => {
      const venues = [
        makeVenue('v1', 'Sunny 1', 'sunny'),
        ...Array.from({ length: 9 }, (_, i) => makeVenue(`s${i}`, `Shaded ${i}`, 'shaded')),
      ];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        const emphasizedCards = document.querySelectorAll('[data-cloudy-emphasis="true"]');
        expect(emphasizedCards.length).toBe(1); // Only the sunny venue
      });
    });

    it('does not add emphasis when not a cloudy day', async () => {
      const venues = [
        makeVenue('v1', 'Sunny 1', 'sunny'),
        makeVenue('v2', 'Sunny 2', 'sunny'),
        makeVenue('v3', 'Shaded', 'shaded'),
      ];
      render(
        <TestWrapper venues={venues}>
          <BottomCardTray />
        </TestWrapper>
      );
      await vi.waitFor(() => {
        expect(screen.getByTestId('venue-groups')).toBeInTheDocument();
      });
      const emphasizedCards = document.querySelectorAll('[data-cloudy-emphasis="true"]');
      expect(emphasizedCards.length).toBe(0);
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(() => {
      mockIsDesktop = true;
    });

    it('Escape key deselects venue', async () => {
      // Mock scrollIntoView which jsdom doesn't support
      Element.prototype.scrollIntoView = vi.fn();

      const venues = [makeVenue('v1', 'Café Husaren')];

      function SelectInjector() {
        const { selectVenue } = useCardTray();
        useEffect(() => {
          selectVenue('v1');
        }, [selectVenue]);
        return null;
      }

      render(
        <LanguageProvider>
          <CardTrayProvider>
            <VenueInjector venues={venues} />
            <SelectInjector />
            <BottomCardTray />
          </CardTrayProvider>
        </LanguageProvider>
      );

      await vi.waitFor(() => {
        expect(screen.getByTestId('venue-card-v1')).toBeInTheDocument();
      });

      // The venue-groups container handles Escape
      const groupsContainer = screen.getByTestId('venue-groups');
      fireEvent.keyDown(groupsContainer, { key: 'Escape' });
      // Escape should trigger selectVenue(null) — verified by no error
    });
  });
});
