import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { TimeSliderPanel } from '@/components/custom/time/TimeSliderPanel';
import { TimeProvider } from '@/lib/contexts/TimeContext';
import venueMessages from '@/messages/sv/venue.json';

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="sv" messages={{ venue: venueMessages }}>
      <TimeProvider
        initialNowIso="2026-05-20T10:15:00.000Z"
        clock={() => new Date('2026-05-20T10:15:00.000Z')}
      >
        {children}
      </TimeProvider>
    </NextIntlClientProvider>
  );
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
});
