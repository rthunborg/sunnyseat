import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NoSunExpected } from './NoSunExpected';

describe('NoSunExpected', () => {
  it('should display Shadow badge', () => {
    render(
      <NoSunExpected
        reason="Shadow"
        date={new Date('2025-10-08')}
      />
    );

    expect(screen.getByText(/Building Shadows/i)).toBeTruthy();
    expect(screen.getByText(/Nearby buildings will block sunlight/i)).toBeTruthy();
  });

  it('should display Cloud badge', () => {
    render(
      <NoSunExpected
        reason="Cloud"
        date={new Date('2025-10-08')}
      />
    );

    // Use getAllByText since the text appears multiple times
    const cloudCoverElements = screen.getAllByText(/Cloud Cover/i);
    expect(cloudCoverElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Heavy cloud cover/i)).toBeTruthy();
  });

  it('should display Weather badge', () => {
    render(
      <NoSunExpected
        reason="Weather"
        date={new Date('2025-10-08')}
      />
    );

    expect(screen.getByText(/Poor Weather/i)).toBeTruthy();
  });

  it('should show suggestions', () => {
    render(
      <NoSunExpected
        reason="Shadow"
        date={new Date('2025-10-08')}
      />
    );

    expect(screen.getByText(/Suggestions:/i)).toBeTruthy();
    expect(screen.getByText(/Try searching for other venues/i)).toBeTruthy();
  });

  it('should display next sun window when provided', () => {
    const nextWindow = {
      date: '2025-10-10',
      window: {
        id: 1,
        patioId: 1,
        date: '2025-10-10',
        startTime: '2025-10-10T08:00:00Z',
        endTime: '2025-10-10T10:00:00Z',
        localStartTime: '2025-10-10T10:00:00',
        localEndTime: '2025-10-10T12:00:00',
        duration: '02:00:00',
        peakExposure: 85,
        minExposurePercent: 70,
        maxExposurePercent: 95,
        averageExposurePercent: 85,
        peakExposureTime: '2025-10-10T09:00:00Z',
        localPeakExposureTime: '2025-10-10T11:00:00',
        quality: 'Good' as const,
        confidence: 80,
        description: 'Good sun',
        isRecommended: true,
        recommendationReason: 'Good',
        priorityScore: 90,
        dataPointCount: 12,
        calculatedAt: '2025-10-08T00:00:00Z',
      },
    };

    render(
      <NoSunExpected
        reason="Cloud"
        date={new Date('2025-10-08')}
        nextSunWindow={nextWindow}
      />
    );

    expect(screen.getByText(/Good news! Sun expected soon/i)).toBeTruthy();
  });
});

