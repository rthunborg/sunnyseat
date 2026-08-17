import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

function withPanelRect(height: number, run: () => void) {
  const originalRect = HTMLElement.prototype.getBoundingClientRect;
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 844 });
  HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
    if ((this as HTMLElement).getAttribute('data-testid') === 'time-slider-panel') {
      return DOMRect.fromRect({ x: 16, y: 72, width: 358, height });
    }
    return originalRect.call(this);
  };
  try {
    run();
  } finally {
    HTMLElement.prototype.getBoundingClientRect = originalRect;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
  }
}

async function openCalendar() {
  const trigger = screen.getByTestId('planner-date-trigger');
  trigger.focus();
  fireEvent.click(trigger);
  await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));
  expect(screen.getByRole('dialog', { name: 'Välj datum' })).toBeInTheDocument();
  return trigger;
}

describe('<TimeSliderPanel />', () => {
  it('renders mobile planner as <=72px slider/date chrome with one calendar trigger and no next-day shortcut', () => {
    withPanelRect(70, () => {
      render(<TimeSliderPanel variant="mobile" />, { wrapper: Wrapper });

      const panel = screen.getByTestId('time-slider-panel');
      const trigger = screen.getByTestId('planner-date-trigger');
      const panelBox = panel.getBoundingClientRect();

      expect(panel).toHaveClass('bg-glass-slider', 'rounded-panel', 'py-3', 'shadow-card-up');
      expect(panel).not.toHaveClass('pt-3', 'pb-2', 'pt-5');
      expect(panelBox.height).toBeGreaterThanOrEqual(68);
      expect(panelBox.height).toBeLessThanOrEqual(72);
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveClass(
        'min-h-11',
        'border',
        'border-divider',
        'bg-surface-cream/70',
        'shadow-subtle',
        'hover:bg-surface-sand',
        'active:bg-amber-pale/40',
        'focus-visible:ring-2',
        'focus-visible:ring-text-primary',
      );
      expect(within(trigger).getByTestId('planner-date-label')).toHaveTextContent('Idag');
      expect(trigger.querySelectorAll('svg')).toHaveLength(1);
      expect(screen.getByTestId('time-slider-value-badge')).toHaveTextContent('12:15');
      expect(screen.queryByTestId('planner-date-next')).not.toBeInTheDocument();
      expect(screen.queryByText(/Säsongskortet|Swish|Premium/i)).not.toBeInTheDocument();
    });
  });

  it('selects a future date from the calendar and keeps planner controls visible', async () => {
    render(<TimeSliderPanel variant="mobile" />, { wrapper: Wrapper });

    fireEvent.click(screen.getByTestId('planner-date-trigger'));
    fireEvent.click(screen.getByRole('button', { name: 'Välj 21 maj 2026' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Välj datum' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('slider', { name: 'Välj tid' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Öppna kalender: torsdag 21 maj/ })).toBeInTheDocument();
  });

  it('restores focus to the mobile date trigger after selecting a date', async () => {
    render(<TimeSliderPanel variant="mobile" />, { wrapper: Wrapper });
    const trigger = await openCalendar();

    fireEvent.click(screen.getByRole('button', { name: 'Välj 21 maj 2026' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Välj datum' })).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('restores focus to the mobile date trigger after Escape, close button, and backdrop close', async () => {
    render(<TimeSliderPanel variant="mobile" />, { wrapper: Wrapper });

    let trigger = await openCalendar();
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Välj datum' }), { key: 'Escape' });
    await waitFor(() => expect(trigger).toHaveFocus());

    trigger = await openCalendar();
    fireEvent.click(screen.getByRole('button', { name: 'Stäng kalender' }));
    await waitFor(() => expect(trigger).toHaveFocus());

    trigger = await openCalendar();
    const dialog = screen.getByRole('dialog', { name: 'Välj datum' });
    fireEvent.pointerDown(dialog.parentElement as HTMLElement);
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('uses instant reduced-motion transitions when requested', () => {
    render(<TimeSliderPanel variant="desktop" reducedMotion />, { wrapper: Wrapper });

    expect(screen.getByTestId('time-slider-panel')).toHaveAttribute('data-reduced-motion', 'true');
    expect(screen.getByRole('slider', { name: 'Välj tid' })).toBeInTheDocument();
  });

  it('renders desktop planner as date left, slider center, and selected time right', () => {
    render(<TimeSliderPanel variant="desktop" />, { wrapper: Wrapper });

    const panel = screen.getByTestId('time-slider-panel');
    expect(panel).toHaveClass('px-6', 'py-3');
    expect(panel).not.toHaveClass('pt-3');
    expect(Array.from(panel.querySelectorAll('[data-planner-layout-part]')).map((node) =>
      node.getAttribute('data-planner-layout-part'),
    )).toEqual(['date', 'slider', 'time']);
    expect(screen.getByTestId('planner-date-label')).toHaveTextContent('Idag');
    expect(screen.getByTestId('planner-time-label')).toHaveTextContent('12:15');
  });

  // External-review fix: the desktop "next day" control must not be a dead no-op
  // button at the today+3 window end. The mobile shortcut is removed in Story 12.9.
  describe('desktop planner-date-next window boundary remains unchanged', () => {
    it('stays ENABLED from today on desktop', () => {
      render(<TimeSliderPanel variant="desktop" />, { wrapper: Wrapper });
      const nextDay = screen.getByTestId('planner-date-next');
      expect(nextDay).toBeEnabled();
      expect(nextDay).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('is DISABLED + aria-disabled at the today+3 window end on desktop', () => {
      const windowEnd = addDaysToDateKey(stockholmDateKey(new Date(FIXED_NOW)), 3);
      render(<TimeSliderPanel variant="desktop" />, { wrapper: forcedDateWrapper(windowEnd) });

      const nextDay = screen.getByTestId('planner-date-next');
      expect(nextDay).toBeDisabled();
      expect(nextDay).toHaveAttribute('aria-disabled', 'true');
      expect(nextDay.className).toContain('cursor-not-allowed');
    });

    it('stays ENABLED at today+2 on desktop', () => {
      const nearEnd = addDaysToDateKey(stockholmDateKey(new Date(FIXED_NOW)), 2);
      render(<TimeSliderPanel variant="desktop" />, { wrapper: forcedDateWrapper(nearEnd) });

      expect(screen.getByTestId('planner-date-next')).toBeEnabled();
    });
  });
});
