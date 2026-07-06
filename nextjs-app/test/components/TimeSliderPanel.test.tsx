import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { TimeSliderPanel } from '@/components/custom/time/TimeSliderPanel';
import { TimeProvider } from '@/lib/contexts/TimeContext';
import { addDaysToDateKey, stockholmDateKey } from '@/lib/utils/time-planner';
import venueMessages from '@/messages/sv/venue.json';

const FIXED_NOW = '2026-05-20T10:15:00.000Z';

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="sv" messages={{ venue: venueMessages }}>
      <TimeProvider
        initialNowIso={FIXED_NOW}
        clock={() => new Date(FIXED_NOW)}
      >
        {children}
      </TimeProvider>
    </NextIntlClientProvider>
  );
}

/** A wrapper pinned to a forced planner DATE (in-window) so the next-day boundary
 * can be exercised deterministically. */
function forcedDateWrapper(forcedDate: string) {
  return function ForcedWrapper({ children }: { children: ReactNode }) {
    return (
      <NextIntlClientProvider locale="sv" messages={{ venue: venueMessages }}>
        <TimeProvider
          initialNowIso={FIXED_NOW}
          clock={() => new Date(FIXED_NOW)}
          forcedDate={forcedDate}
          forcedTime="14:00"
        >
          {children}
        </TimeProvider>
      </NextIntlClientProvider>
    );
  };
}

describe('<TimeSliderPanel />', () => {
  it('renders the free mobile planner as compact top chrome with calendar access and no premium copy', () => {
    render(<TimeSliderPanel variant="mobile" />, { wrapper: Wrapper });

    expect(screen.getByTestId('time-slider-panel')).toHaveClass('bg-glass-slider', 'rounded-panel', 'shadow-card-up');
    expect(screen.queryByRole('button', { name: 'Föregående dag' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Öppna kalender: Idag' })).toBeInTheDocument();
    expect(screen.getByTestId('planner-date-label')).toHaveTextContent('Idag');
    expect(screen.getByTestId('time-slider-value-badge')).toHaveTextContent('12:15');
    expect(screen.queryByText(/Säsongskortet|Swish|Premium/i)).not.toBeInTheDocument();
  });

  it('selects a future date from the calendar and keeps planner controls visible', async () => {
    render(<TimeSliderPanel variant="mobile" />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole('button', { name: 'Öppna kalender: Idag' }));
    fireEvent.click(screen.getByRole('button', { name: 'Välj 21 maj 2026' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Välj datum' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('slider', { name: 'Välj tid' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Öppna kalender: torsdag 21 maj/ })).toBeInTheDocument();
  });

  it('uses instant reduced-motion transitions when requested', () => {
    render(<TimeSliderPanel variant="desktop" reducedMotion />, { wrapper: Wrapper });

    expect(screen.getByTestId('time-slider-panel')).toHaveAttribute('data-reduced-motion', 'true');
    expect(screen.getByRole('slider', { name: 'Välj tid' })).toBeInTheDocument();
  });

  it('renders desktop planner as date left, slider center, and selected time right', () => {
    render(<TimeSliderPanel variant="desktop" />, { wrapper: Wrapper });

    const panel = screen.getByTestId('time-slider-panel');
    expect(Array.from(panel.querySelectorAll('[data-planner-layout-part]')).map((node) =>
      node.getAttribute('data-planner-layout-part'),
    )).toEqual(['date', 'slider', 'time']);
    expect(screen.getByTestId('planner-date-label')).toHaveTextContent('Idag');
    expect(screen.getByTestId('planner-time-label')).toHaveTextContent('12:15');
  });

  // External-review fix: the "next day" control must not be a dead no-op button at
  // the today+3 window end (it silently no-ops there because the context clamps).
  describe('planner-date-next window boundary (external-review fix)', () => {
    it('stays ENABLED from today (next date is in-window) — the scrub-zero e2e clicks it from today', () => {
      render(<TimeSliderPanel variant="mobile" />, { wrapper: Wrapper });
      // today = 2026-05-20; next = 2026-05-21 is within the today+3 window.
      const nextDay = screen.getByTestId('planner-date-next');
      expect(nextDay).toBeEnabled();
      expect(nextDay).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('is DISABLED + aria-disabled at the today+3 window end (next date is beyond the window)', () => {
      // Force the selected date to today+3 (the last selectable day); today+4 is
      // out-of-window, so the next-day control must be disabled.
      const windowEnd = addDaysToDateKey(stockholmDateKey(new Date(FIXED_NOW)), 3);
      render(<TimeSliderPanel variant="mobile" />, { wrapper: forcedDateWrapper(windowEnd) });

      const nextDay = screen.getByTestId('planner-date-next');
      expect(nextDay).toBeDisabled();
      expect(nextDay).toHaveAttribute('aria-disabled', 'true');
      expect(nextDay.className).toContain('cursor-not-allowed');
    });

    it('stays ENABLED at today+2 (next date today+3 is the last in-window day)', () => {
      const nearEnd = addDaysToDateKey(stockholmDateKey(new Date(FIXED_NOW)), 2);
      render(<TimeSliderPanel variant="mobile" />, { wrapper: forcedDateWrapper(nearEnd) });

      expect(screen.getByTestId('planner-date-next')).toBeEnabled();
    });
  });
});
