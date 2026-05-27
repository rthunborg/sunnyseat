import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TimeSlider } from '@/components/composed/time/TimeSlider';
import { generatePlannerTicks } from '@/lib/utils/time-planner';

describe('<TimeSlider />', () => {
  it('renders token-backed track, thumb, tick labels, and active tick', () => {
    render(
      <TimeSlider
        ariaLabel="Välj tid"
        selectedMinutes={14 * 60}
        ticks={generatePlannerTicks()}
        onMinutesChange={() => {}}
        onSnap={() => {}}
      />,
    );

    expect(screen.getByRole('slider', { name: 'Välj tid' })).toHaveAttribute('aria-valuetext', '14:00');
    expect(screen.getByTestId('time-slider-track')).toHaveClass('h-slider-track-h', 'bg-surface-slider-track', 'rounded-pill');
    expect(screen.getByTestId('time-slider-thumb')).toHaveClass('size-slider-thumb', 'bg-amber-dark', 'border-slider-thumb');
    expect(screen.getByText('06:00')).toHaveClass('text-label-xs-medium');
    expect(screen.getByText('06:00').parentElement).toHaveClass('text-text-muted');
    expect(screen.getByText('15:00')).toHaveClass('text-amber-dark');
  });

  it('supports keyboard adjustment and snaps on release', () => {
    const onMinutesChange = vi.fn();
    const onSnap = vi.fn();
    render(
      <TimeSlider
        ariaLabel="Välj tid"
        selectedMinutes={14 * 60}
        ticks={generatePlannerTicks()}
        onMinutesChange={onMinutesChange}
        onSnap={onSnap}
      />,
    );

    const slider = screen.getByRole('slider', { name: 'Välj tid' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onMinutesChange).toHaveBeenCalledWith(14 * 60 + 15);
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onMinutesChange).toHaveBeenCalledWith(6 * 60);
    fireEvent.pointerUp(slider);
    expect(onSnap).toHaveBeenCalled();
  });

  it('marks reduced-motion snapping as instant', () => {
    render(
      <TimeSlider
        ariaLabel="Välj tid"
        selectedMinutes={14 * 60}
        ticks={generatePlannerTicks()}
        reducedMotion
        onMinutesChange={() => {}}
        onSnap={() => {}}
      />,
    );

    expect(screen.getByTestId('time-slider-thumb')).toHaveAttribute('data-reduced-motion', 'true');
  });

  it('supports the compact top-panel visual variant', () => {
    render(
      <TimeSlider
        ariaLabel="Välj tid"
        selectedMinutes={14 * 60}
        ticks={generatePlannerTicks()}
        variant="topPanel"
        onMinutesChange={() => {}}
        onSnap={() => {}}
      />,
    );

    expect(screen.getByTestId('time-slider-value-badge')).toHaveTextContent('14:00');
    expect(screen.getByTestId('time-slider-thumb')).toHaveClass('size-6', 'bg-white', 'border-amber-primary');
    expect(screen.getByText('06')).toBeInTheDocument();
    expect(screen.queryByText('09:00')).not.toBeInTheDocument();
  });
});
