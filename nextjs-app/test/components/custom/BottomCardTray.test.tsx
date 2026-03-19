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
});
