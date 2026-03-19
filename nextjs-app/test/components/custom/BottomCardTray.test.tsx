import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
    <div data-testid={`venue-card-${props.venueId}`}>{props.venueName as string}</div>
  ),
}));

// Mock cn utility
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import { CardTrayProvider, useCardTray } from '@/lib/context/CardTrayContext';
import { LanguageProvider } from '@/lib/i18n';
import { BottomCardTray } from '@/components/custom/BottomCardTray';
import type { SunExposureResult } from '@/lib/types/venue';

function makeVenue(id: string, name: string): SunExposureResult {
  return {
    venue: { id, name, slug: id, neighborhood: 'Haga', lat: 57.7, lng: 11.97 },
    current_status: 'sunny',
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
    expect(screen.getByText(/inga restauranger/i)).toBeInTheDocument();
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

  it('shows loading skeletons when loading', () => {
    render(
      <TestWrapper loading>
        <BottomCardTray />
      </TestWrapper>
    );
    const skeletons = document.querySelectorAll('.h-\\[120px\\]');
    expect(skeletons.length).toBe(3);
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
  });
});
