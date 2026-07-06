/**
 * COVERAGE-EXPANSION (`*automate`) — Story 11.2 TimeSlider edge paths.
 *
 * GREEN (post-implementation) component tests for the drag/clamp edge paths the ATDD
 * scaffold (`TimeSlider.dragdecouple.atdd.test.tsx`) left open. The ATDD proves the
 * happy drag (one commit on settle), the keyboard contract, and the below-min clamp;
 * these cover the OTHER branches of `endDrag`, `handleChange`, and the `effectiveMin`
 * clamp:
 *   - `pointerUp` / `pointerCancel` WITHOUT a preceding `pointerDown` → the
 *     `!isDragging` branch of `endDrag` fires `onSnap()` only, NO phantom commit.
 *   - `pointerCancel` ends a real drag with exactly one commit (parity with pointerUp).
 *   - an oversized / out-of-range `minMinutes` is clamped into the planner range
 *     (`clampPlannerMinutes`) so the native input `min` never exceeds the max and the
 *     thumb can never be pushed off-track.
 *   - a below-min controlled `selectedMinutes` displays CLAMPED when idle (not dragging).
 *
 * Precedent: mirrors `TimeSlider.test.tsx` / the ATDD sibling — Testing Library +
 * fireEvent, testid/role-driven. No wall-clock.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TimeSlider } from '@/components/composed/time/TimeSlider';
import {
  generatePlannerTicks,
  PLANNER_END_MINUTES,
  PLANNER_START_MINUTES,
} from '@/lib/utils/time-planner';

const TICKS = generatePlannerTicks();

function renderSlider(props: Partial<React.ComponentProps<typeof TimeSlider>> = {}) {
  const onMinutesChange = vi.fn();
  const onSnap = vi.fn();
  render(
    <TimeSlider
      ariaLabel="Välj tid"
      selectedMinutes={14 * 60}
      ticks={TICKS}
      variant="topPanel"
      onMinutesChange={onMinutesChange}
      onSnap={onSnap}
      {...props}
    />,
  );
  return { onMinutesChange, onSnap, slider: screen.getByRole('slider', { name: 'Välj tid' }) };
}

describe('[11.2 automate] TimeSlider — pointer-end without a drag commits nothing (snap only)', () => {
  it('pointerUp with no preceding pointerDown fires onSnap and does NOT commit a value', () => {
    const { onMinutesChange, onSnap, slider } = renderSlider();
    fireEvent.pointerUp(slider);
    expect(onSnap).toHaveBeenCalledTimes(1);
    expect(onMinutesChange).not.toHaveBeenCalled();
  });

  it('pointerCancel with no preceding pointerDown fires onSnap and does NOT commit a value', () => {
    const { onMinutesChange, onSnap, slider } = renderSlider();
    fireEvent.pointerCancel(slider);
    expect(onSnap).toHaveBeenCalledTimes(1);
    expect(onMinutesChange).not.toHaveBeenCalled();
  });

  it('pointerCancel ends a real drag with exactly one commit (parity with pointerUp)', () => {
    const { onMinutesChange, onSnap, slider } = renderSlider({ selectedMinutes: 12 * 60 });
    fireEvent.pointerDown(slider);
    for (const minutes of [12 * 60 + 15, 12 * 60 + 30, 12 * 60 + 45]) {
      fireEvent.change(slider, { target: { value: String(minutes) } });
    }
    // No per-step commit during the drag (the anti-pattern the story kills).
    expect(onMinutesChange).not.toHaveBeenCalled();

    fireEvent.pointerCancel(slider);
    // Exactly one commit on settle, to the dragged-to value; snap fires once.
    expect(onMinutesChange).toHaveBeenCalledTimes(1);
    expect(onMinutesChange).toHaveBeenCalledWith(12 * 60 + 45);
    expect(onSnap).toHaveBeenCalledTimes(1);
  });
});

describe('[11.2 automate] TimeSlider — drag flag is a synchronous ref (same-turn pointerdown→change robustness)', () => {
  it('the FIRST change after pointerDown takes the drag branch (no per-step commit) even before a re-render', () => {
    // Regression guard: the drag flag is backed by a synchronous `isDraggingRef`
    // set in `onPointerDown`, not read off the rendered `dragValue` state. If a
    // browser dispatches the range input's first `change` in the SAME event turn
    // as `pointerdown` (before React commits dragValue null→number), reading the
    // flag off state would take the discrete-tap commit branch and reintroduce
    // the per-step commit. The ref makes the very first change non-committing.
    const { onMinutesChange, slider } = renderSlider({ selectedMinutes: 12 * 60 });
    fireEvent.pointerDown(slider);
    // The immediate first change must NOT commit (drag branch, ref-gated).
    fireEvent.change(slider, { target: { value: String(12 * 60 + 15) } });
    expect(onMinutesChange).not.toHaveBeenCalled();

    // On settle, exactly one commit to the dragged-to value.
    fireEvent.pointerUp(slider);
    expect(onMinutesChange).toHaveBeenCalledTimes(1);
    expect(onMinutesChange).toHaveBeenCalledWith(12 * 60 + 15);
  });
});

describe('[11.2 automate] TimeSlider — effectiveMin clamps an out-of-range minMinutes into the planner range', () => {
  it('clamps an oversized minMinutes down to the planner end (thumb never off-track)', () => {
    const { slider } = renderSlider({ minMinutes: 99 * 60, selectedMinutes: 20 * 60 });
    // External-review fix: the NATIVE `min` is the FULL planner span (so the
    // pointer→value geometry matches the visuals); the EFFECTIVE floor is carried
    // by `aria-valuemin` (clamped to PLANNER_END here) and enforced by the clamp
    // in the handlers + state layer.
    expect(slider).toHaveAttribute('min', String(PLANNER_START_MINUTES));
    expect(slider).toHaveAttribute('aria-valuemin', String(PLANNER_END_MINUTES));
    // The displayed value is still clamped up to the effective min — never below it.
    expect(Number((slider as HTMLInputElement).value)).toBe(PLANNER_END_MINUTES);
  });

  it('clamps a sub-start minMinutes up to the planner start (keeps the full range)', () => {
    const { slider } = renderSlider({ minMinutes: 2 * 60, selectedMinutes: 10 * 60 });
    // Native span is always the full planner range; the effective min collapses to
    // the planner start here, so aria-valuemin equals the native min.
    expect(slider).toHaveAttribute('min', String(PLANNER_START_MINUTES));
    expect(slider).toHaveAttribute('aria-valuemin', String(PLANNER_START_MINUTES));
    // No inert elapsed segment when the effective min collapses to the planner start.
    expect(screen.queryByTestId('time-slider-elapsed')).toBeNull();
  });
});

describe('[external-review] TimeSlider — native track spans the FULL planner range so pointer geometry matches the visuals', () => {
  it('with an active today-min the native input min is PLANNER_START (not the effective min) so the visible thumb maps to the correct time', () => {
    const MIN = 13 * 60; // simulated snapped current wall-clock on `today`
    renderSlider({ minMinutes: MIN, selectedMinutes: 15 * 60 });
    const slider = screen.getByRole('slider', { name: 'Välj tid' });

    // THE FIX: the native <input min> is the FULL planner span. Before, it was the
    // effective min (780), which mapped the pointer x-coordinate against
    // [780, 1260] while the visual thumb/progress render against [360, 1260] — so
    // grabbing the visible thumb selected the wrong time.
    expect(slider).toHaveAttribute('min', String(PLANNER_START_MINUTES));
    expect(slider).toHaveAttribute('max', String(PLANNER_END_MINUTES));

    // The visual thumb position uses the FULL-track formula; for 15:00 that is
    // (900 - 360) / (1260 - 360) = 60%. The native track now shares those bounds,
    // so the pointer coordinate at 60% of the track resolves to 15:00 too.
    const thumb = screen.getByTestId('time-slider-thumb');
    expect(thumb.getAttribute('style')).toContain('left: 60%');
    // aria-valuemin still advertises the reachable floor to AT.
    expect(slider).toHaveAttribute('aria-valuemin', String(MIN));
  });

  it('a drag/tap BELOW the active min still snaps UP to the min (floor preserved despite the full-span native track)', () => {
    const MIN = 13 * 60;
    const { onMinutesChange } = renderSlider({ minMinutes: MIN, selectedMinutes: MIN });
    const slider = screen.getByRole('slider', { name: 'Välj tid' });

    // The native track now reaches down to 06:00, but a below-min change is clamped
    // up to the effective min in the handler (and floored again in the state layer).
    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: String(9 * 60) } });
    fireEvent.pointerUp(slider);
    expect(onMinutesChange.mock.calls.every(([m]) => m >= MIN)).toBe(true);
  });
});

describe('[11.2 automate] TimeSlider — a below-min controlled value displays clamped while idle', () => {
  it('shows the effective min (not the stale below-min prop) when not dragging', () => {
    const MIN = 13 * 60;
    renderSlider({ minMinutes: MIN, selectedMinutes: 9 * 60 }); // controlled value below the min
    const slider = screen.getByRole('slider', { name: 'Välj tid' });
    // Displayed value clamps up to the min; the badge shows the clamped time, not 09:00.
    expect(Number((slider as HTMLInputElement).value)).toBe(MIN);
    expect(screen.getByTestId('time-slider-value-badge')).toHaveTextContent('13:00');
  });
});
