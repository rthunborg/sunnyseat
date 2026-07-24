import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TimeSlider } from '@/components/composed/time/TimeSlider';
import { generatePlannerTicks } from '@/lib/utils/time-planner';

describe('<TimeSlider />', () => {
  function withElementRects(rectFor: (element: HTMLElement) => DOMRectInit, run: () => void) {
    const original = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
      const rect = rectFor(this as HTMLElement);
      if (rect.width !== undefined || rect.height !== undefined) {
        return DOMRect.fromRect(rect);
      }
      return original.call(this);
    };
    try {
      run();
    } finally {
      HTMLElement.prototype.getBoundingClientRect = original;
    }
  }

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
    expect(onSnap.mock.calls.at(-1)).toEqual([]);
    fireEvent.blur(slider);
    expect(onSnap.mock.calls.at(-1)).toEqual([]);
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

  it('renders the compact top-panel slider with token geometry and separate badge/thumb lanes', () => {
    withElementRects((element) => {
      const testId = element.getAttribute('data-testid');
      if (testId === 'time-slider-value-badge') return { x: 132, y: 0, width: 48, height: 18 };
      if (testId === 'time-slider-thumb') return { x: 149, y: 26, width: 14.1, height: 14.1 };
      if (testId === 'time-slider-track') return { x: 0, y: 32, width: 300, height: 6 };
      if (element instanceof HTMLInputElement && element.type === 'range') {
        return { x: 0, y: 0, width: 300, height: 44 };
      }
      return {};
    }, () => {
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

      const slider = screen.getByRole('slider', { name: 'Välj tid' });
      const badge = screen.getByTestId('time-slider-value-badge');
      const track = screen.getByTestId('time-slider-track');
      const thumb = screen.getByTestId('time-slider-thumb');
      const badgeBox = badge.getBoundingClientRect();
      const thumbBox = thumb.getBoundingClientRect();
      const trackBox = track.getBoundingClientRect();
      const inputBox = slider.getBoundingClientRect();

      expect(badge).toHaveTextContent('14:00');
      expect(track).toHaveClass('h-slider-track-h', 'h-[var(--size-slider-track-h)]');
      expect(trackBox.height).toBe(6);
      expect(thumb).toHaveClass('size-slider-thumb', 'bg-white', 'border-amber-primary');
      expect(thumb).not.toHaveClass('size-6');
      expect(thumbBox.width).toBeCloseTo(14.1, 1);
      expect(thumbBox.height).toBeCloseTo(14.1, 1);
      expect(inputBox.width).toBeGreaterThanOrEqual(44);
      expect(inputBox.height).toBeGreaterThanOrEqual(44);
      expect(badgeBox.bottom).toBeLessThan(thumbBox.top);
      expect(thumbBox.top - badgeBox.bottom).toBeGreaterThanOrEqual(4);
      expect(screen.queryByText('06')).not.toBeInTheDocument();
    });
  });
});
