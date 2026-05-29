import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SunTimeline } from '@/components/composed/venue/SunTimeline';
import type { VenueSunTimelineDto } from '@/lib/types/api';

const TIMELINE: VenueSunTimelineDto = {
  timezone: 'Europe/Stockholm',
  range: { start: '06:00', end: '21:00' },
  peakTime: '15:30',
  windows: [
    { start: '13:00', end: '18:30', status: 'Sunny' },
    { start: '19:00', end: '20:00', status: 'Partial' },
  ],
};

describe('SunTimeline', () => {
  it('renders accessible sun windows, tick labels, and current time marker', () => {
    render(
      <SunTimeline
        timeline={TIMELINE}
        currentTime="15:30"
        labels={{
          ariaLabel: 'Soltider idag',
          currentTime: 'Nu 15:30',
          sunnyWindow: 'Sol {start}-{end}',
          partialWindow: 'Delvis sol {start}-{end}',
          shadedWindow: 'Skugga {start}-{end}',
        }}
      />,
    );

    expect(screen.getByLabelText('Soltider idag')).toBeInTheDocument();
    expect(screen.getByText('15:30')).toHaveClass('text-time');
    expect(screen.getByText('06:00')).toBeInTheDocument();
    expect(screen.getByText('21:00')).toBeInTheDocument();
    expect(screen.getByLabelText('Sol 13:00-18:30')).toBeInTheDocument();
    expect(screen.getByLabelText('Delvis sol 19:00-20:00')).toBeInTheDocument();
  });

  it('uses instant fill when reduced motion is requested', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    render(
      <SunTimeline
        timeline={TIMELINE}
        currentTime="15:30"
        reducedMotion
        labels={{
          ariaLabel: 'Soltider idag',
          currentTime: 'Nu 15:30',
          sunnyWindow: 'Sol {start}-{end}',
          partialWindow: 'Delvis sol {start}-{end}',
          shadedWindow: 'Skugga {start}-{end}',
        }}
      />,
    );

    expect(screen.getByTestId('timeline-progress')).toHaveAttribute('data-reduced-motion', 'true');
    vi.unstubAllGlobals();
  });

  it('derives tick labels from the provided timeline range', () => {
    render(
      <SunTimeline
        timeline={{
          ...TIMELINE,
          range: { start: '09:00', end: '18:00' },
        }}
        currentTime="12:00"
        labels={{
          ariaLabel: 'Soltider idag',
          currentTime: 'Nu {time}',
          sunnyWindow: 'Sol {start}-{end}',
          partialWindow: 'Delvis sol {start}-{end}',
          shadedWindow: 'Skugga {start}-{end}',
        }}
      />,
    );

    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('18:00')).toBeInTheDocument();
    expect(screen.queryByText('06:00')).not.toBeInTheDocument();
    expect(screen.queryByText('21:00')).not.toBeInTheDocument();
  });
});
