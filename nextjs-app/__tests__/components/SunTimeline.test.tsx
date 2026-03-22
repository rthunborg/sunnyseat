import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SunTimeline } from '@/components/custom/SunTimeline';
import type { SunWindow } from '@/lib/types/venue';

// Mock timezone util to avoid timezone issues in test
vi.mock('@/lib/solar/timezone-utils', () => ({
  convertUtcToStockholm: (d: Date) => d, // pass through — tests use local time
}));

describe('SunTimeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sunWindows: SunWindow[] = [
    {
      start: '2026-03-22T08:00:00.000Z',
      end: '2026-03-22T12:00:00.000Z',
      sun_status: 'sunny',
      sky_condition: 'clear',
    },
    {
      start: '2026-03-22T12:00:00.000Z',
      end: '2026-03-22T15:00:00.000Z',
      sun_status: 'partial',
      sky_condition: 'partly-cloudy',
    },
  ];

  it('renders the timeline container', () => {
    render(<SunTimeline sunWindows={sunWindows} now={new Date('2026-03-22T10:00:00.000Z')} />);

    expect(screen.getByTestId('sun-timeline')).toBeInTheDocument();
  });

  it('renders timeline bar with segments', () => {
    render(<SunTimeline sunWindows={sunWindows} now={new Date('2026-03-22T10:00:00.000Z')} />);

    const bar = screen.getByTestId('timeline-bar');
    expect(bar).toBeInTheDocument();
    // Bar should have child segments
    expect(bar.children.length).toBeGreaterThan(0);
  });

  it('renders hour labels row', () => {
    render(<SunTimeline sunWindows={sunWindows} now={new Date('2026-03-22T10:00:00.000Z')} />);

    const labels = screen.getByTestId('hour-labels');
    expect(labels).toBeInTheDocument();
    // Should have some hour labels
    expect(labels.children.length).toBeGreaterThan(0);
  });

  it('renders weather icons row', () => {
    render(<SunTimeline sunWindows={sunWindows} now={new Date('2026-03-22T10:00:00.000Z')} />);

    expect(screen.getByTestId('weather-icons-row')).toBeInTheDocument();
  });

  it('renders now indicator when time is within range', () => {
    // 10:00 UTC = within 06:00-22:00 range
    render(<SunTimeline sunWindows={sunWindows} now={new Date('2026-03-22T10:00:00.000Z')} />);

    expect(screen.getByTestId('now-indicator')).toBeInTheDocument();
  });

  it('has accessible role and label', () => {
    render(<SunTimeline sunWindows={sunWindows} now={new Date('2026-03-22T10:00:00.000Z')} />);

    const timeline = screen.getByRole('img');
    expect(timeline).toHaveAttribute('aria-label', 'Solprognos tidslinje');
  });

  it('renders with empty sun windows without crashing', () => {
    render(<SunTimeline sunWindows={[]} now={new Date('2026-03-22T10:00:00.000Z')} />);

    expect(screen.getByTestId('sun-timeline')).toBeInTheDocument();
  });
});
