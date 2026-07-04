/**
 * ATDD RED-PHASE acceptance scaffolds — Story 11.2 (AC1 + AC2 + AC4)
 * "Time-Slider Drag Fix & Planner Range Rules — the component contract"
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The `<TimeSlider />` component-level acceptance facts for three of the four ACs:
 *
 *   - AC1 / R-004 (thumb-grab hit-testing): the three decorations layered OVER the
 *     `<input type="range">` (value badge, track+progress wrapper, thumb) carry
 *     `pointer-events-none` and stay `aria-hidden`, so the input is the SOLE pointer
 *     target and keeps an adequate (>=44px / `h-11`) touch height. A finger/mouse on
 *     the thumb hits the input, not the decoration. (The REAL touch gesture that only
 *     an e2e can prove lives in `TimeSlider.touch-drag.atdd.spec.ts`.)
 *   - AC2 / R-002 (drag state decoupled — one commit per gesture): during a drag the
 *     per-step `onChange` drives a LOCAL visual value (thumb/progress/badge follow at
 *     full frame rate) while the app-level commit fires AT MOST ONCE on settle via the
 *     existing `onSnap` seam (pointerup/blur). Keyboard arrows/Home/End still commit
 *     per keypress (discrete, not a drag). The "one commit per gesture" signal is a
 *     COUNT of `onMinutesChange`/`onSnap` calls, NOT wall-clock (test-design "assert
 *     behaviour not magic numbers").
 *   - AC4 / R-007 (today-minimum clamp): with a new controlled `minMinutes` prop, a
 *     value / keyboard-arrow / Home below the min snaps UP to the min; the native
 *     `<input min>` and `aria-valuemin` reflect it; the pre-min ("elapsed") segment
 *     renders a distinct inert design-system token. `mode==='future'` (min defaults to
 *     PLANNER_START_MINUTES) keeps the full range.
 *
 * =========================================================================
 * RED PHASE — why every block is `.skip`-ed
 * =========================================================================
 * Against the CURRENT tree these FAIL:
 *   - the decorations do NOT yet have `pointer-events-none` (Task 1);
 *   - `onChange` still commits to the app on EVERY step, so a multi-step drag fires
 *     `onMinutesChange` N times and there is no "single commit on settle" contract
 *     (Task 2);
 *   - `TimeSlider` has NO `minMinutes` prop, no below-min clamp, and no inert-segment
 *     testid (Task 4).
 * The `minMinutes` prop is referenced below AHEAD of its existence — this file is
 * expected to fail to type-check / fail at runtime until Task 4 adds the prop, which is
 * exactly the red-phase intent. Un-skip each block as the matching task goes green.
 *
 * Precedent: mirrors the existing `test/components/TimeSlider.test.tsx` house style
 * (Testing Library + fireEvent, testid-driven, token-class asserts).
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TimeSlider } from '@/components/composed/time/TimeSlider';
import { generatePlannerTicks, PLANNER_STEP_MINUTES } from '@/lib/utils/time-planner';

const TICKS = generatePlannerTicks();

// The three decorations layered over the range input — all must become
// `pointer-events-none` + stay `aria-hidden` (Task 1). Referenced by testid so the
// assertion survives class refactors (selector-resilience).
const DECORATION_TESTIDS = [
  'time-slider-value-badge', // topPanel only
  'time-slider-track',
  'time-slider-thumb',
] as const;

describe.skip('[11.2 AC1] TimeSlider thumb-grab hit-testing (decorations pointer-events-none, input sole target)', () => {
  it('makes every decoration pointer-events-none and aria-hidden so the input is the sole pointer target', () => {
    render(
      <TimeSlider
        ariaLabel="Välj tid"
        selectedMinutes={14 * 60}
        ticks={TICKS}
        variant="topPanel"
        onMinutesChange={() => {}}
        onSnap={() => {}}
      />,
    );

    for (const testid of DECORATION_TESTIDS) {
      const decoration = screen.getByTestId(testid);
      // Root-cause #1: "the decorative thumb eats pointer events". Making the
      // decoration non-interactive leaves the <input> as the ONLY pointer target.
      expect(decoration, `${testid} must not intercept pointer events`).toHaveClass('pointer-events-none');
      expect(decoration).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('keeps the range input as the sole pointer target with an adequate (>=44px) touch height', () => {
    render(
      <TimeSlider
        ariaLabel="Välj tid"
        selectedMinutes={14 * 60}
        ticks={TICKS}
        onMinutesChange={() => {}}
        onSnap={() => {}}
      />,
    );

    const input = screen.getByRole('slider', { name: 'Välj tid' });
    // WCAG 2.5.5 minimum touch target — the fix must NOT shrink the hit area below h-11.
    expect(input).toHaveClass('h-11', 'absolute', 'inset-0');
    // The input, NOT the decoration, is what a pointer lands on.
    expect(input).not.toHaveClass('pointer-events-none');
  });

  it('does not change the reference slider look — thumb/track/progress token classes are unchanged', () => {
    render(
      <TimeSlider
        ariaLabel="Välj tid"
        selectedMinutes={14 * 60}
        ticks={TICKS}
        onMinutesChange={() => {}}
        onSnap={() => {}}
      />,
    );
    // Hit-test-only fix (Design Gate "Visual"): the byte-identical reference look holds.
    expect(screen.getByTestId('time-slider-thumb')).toHaveClass('size-slider-thumb', 'bg-amber-dark', 'border-slider-thumb');
    expect(screen.getByTestId('time-slider-track')).toHaveClass('h-slider-track-h', 'bg-surface-slider-track', 'rounded-pill');
  });
});

describe.skip('[11.2 AC2] drag state decoupled — one app-level commit per gesture, keyboard still per-keypress', () => {
  it('during a drag, per-step onChange drives the LOCAL visual value but commits at most once on release', () => {
    const onMinutesChange = vi.fn();
    const onSnap = vi.fn();
    render(
      <TimeSlider
        ariaLabel="Välj tid"
        selectedMinutes={12 * 60}
        ticks={TICKS}
        variant="topPanel"
        onMinutesChange={onMinutesChange}
        onSnap={onSnap}
      />,
    );

    const slider = screen.getByRole('slider', { name: 'Välj tid' });

    // Simulate a drag as a run of `change` events WITHOUT a settle between them
    // (the browser emits one `input`/`change` per crossed step during a pointer drag).
    fireEvent.pointerDown(slider);
    for (const minutes of [12 * 60 + 15, 12 * 60 + 30, 12 * 60 + 45, 13 * 60]) {
      fireEvent.change(slider, { target: { value: String(minutes) } });
    }

    // THE HEADLINE (AC2): during the drag the app-level commit fires AT MOST ONCE
    // per crossed step is the WRONG contract we are killing. The visual value tracks
    // per step, but the committed value must not be pushed to the app per step —
    // ideally the app sees zero commits until settle. Assert the app was NOT
    // committed-per-step (the current bug commits 4 times).
    expect(
      onMinutesChange.mock.calls.length,
      'per-step drag must NOT commit to the app on every step',
    ).toBeLessThanOrEqual(1);

    // The LOCAL visual value still tracked the last step (thumb/badge follow the
    // pointer at full frame rate) — the badge shows the dragged-to time.
    expect(screen.getByTestId('time-slider-value-badge')).toHaveTextContent('13:00');

    // On settle (pointerup) the app-level commit fires EXACTLY ONCE.
    fireEvent.pointerUp(slider);
    expect(onSnap).toHaveBeenCalledTimes(1);
  });

  it('reconciles the local drag value with the controlled prop on release (no stuck thumb)', () => {
    const { rerender } = render(
      <TimeSlider
        ariaLabel="Välj tid"
        selectedMinutes={12 * 60}
        ticks={TICKS}
        variant="topPanel"
        onMinutesChange={() => {}}
        onSnap={() => {}}
      />,
    );
    const slider = screen.getByRole('slider', { name: 'Välj tid' });

    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: String(15 * 60) } });
    fireEvent.pointerUp(slider);

    // The committed value wins: the parent re-renders with the committed prop and the
    // thumb follows the prop again (no stale-local-value bug where it sticks after
    // release). A later external change (e.g. a clock tick) must move the thumb.
    rerender(
      <TimeSlider
        ariaLabel="Välj tid"
        selectedMinutes={16 * 60}
        ticks={TICKS}
        variant="topPanel"
        onMinutesChange={() => {}}
        onSnap={() => {}}
      />,
    );
    expect(screen.getByTestId('time-slider-value-badge')).toHaveTextContent('16:00');
    expect(slider).toHaveValue(String(16 * 60));
  });

  it('keyboard arrows/Home/End still commit per keypress and blur still snaps (unchanged contract)', () => {
    const onMinutesChange = vi.fn();
    const onSnap = vi.fn();
    render(
      <TimeSlider
        ariaLabel="Välj tid"
        selectedMinutes={14 * 60}
        ticks={TICKS}
        onMinutesChange={onMinutesChange}
        onSnap={onSnap}
      />,
    );
    const slider = screen.getByRole('slider', { name: 'Välj tid' });

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onMinutesChange).toHaveBeenCalledWith(14 * 60 + PLANNER_STEP_MINUTES);
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onMinutesChange).toHaveBeenCalledWith(6 * 60);
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onMinutesChange).toHaveBeenCalledWith(21 * 60);
    fireEvent.blur(slider);
    expect(onSnap.mock.calls.at(-1)).toEqual([]);
  });
});

describe.skip('[11.2 AC4] today-minimum clamp — minMinutes makes earlier positions unreachable, elapsed segment inert', () => {
  // `minMinutes` is a NEW controlled prop (Task 4). It does not exist on
  // `TimeSliderProps` yet, so it is passed via an untyped spread to keep this
  // `.skip`-ed scaffold type-checking green against the current tree; the assertions
  // are red at runtime until Task 4 adds the prop + clamp + inert segment. When Task 4
  // lands, replace `{...withMin(MIN)}` with a typed `minMinutes={MIN}` prop.
  const MIN = 13 * 60; // simulated snapped current wall-clock time on `today`
  const withMin = (minMinutes: number) => ({ minMinutes } as Record<string, unknown>);

  it('reflects the effective minimum in the native input min and aria-valuemin', () => {
    render(
      <TimeSlider
        ariaLabel="Välj tid"
        selectedMinutes={14 * 60}
        ticks={TICKS}
        onMinutesChange={() => {}}
        onSnap={() => {}}
        {...withMin(MIN)}
      />,
    );
    const slider = screen.getByRole('slider', { name: 'Välj tid' });
    expect(slider).toHaveAttribute('min', String(MIN));
    expect(slider).toHaveAttribute('aria-valuemin', String(MIN));
  });

  it('snaps a below-min value / keyboard-arrow-left / Home UP to the effective min', () => {
    const onMinutesChange = vi.fn();
    render(
      <TimeSlider
        ariaLabel="Välj tid"
        selectedMinutes={MIN}
        ticks={TICKS}
        onMinutesChange={onMinutesChange}
        onSnap={() => {}}
        {...withMin(MIN)}
      />,
    );
    const slider = screen.getByRole('slider', { name: 'Välj tid' });

    // Home would jump to PLANNER_START (06:00) but the effective min is 13:00 → clamps up.
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onMinutesChange).toHaveBeenCalledWith(MIN);

    // Arrow-left from the min stays pinned at the min (earlier is unreachable).
    onMinutesChange.mockClear();
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onMinutesChange.mock.calls.every(([m]) => m >= MIN)).toBe(true);

    // A drag/tap change below the min snaps up to the min, never below.
    onMinutesChange.mockClear();
    fireEvent.pointerDown(slider);
    fireEvent.change(slider, { target: { value: String(9 * 60) } });
    fireEvent.pointerUp(slider);
    expect(onMinutesChange.mock.calls.every(([m]) => m >= MIN)).toBe(true);
  });

  it('renders the pre-min (elapsed) segment with a distinct inert design-system token', () => {
    render(
      <TimeSlider
        ariaLabel="Välj tid"
        selectedMinutes={14 * 60}
        ticks={TICKS}
        onMinutesChange={() => {}}
        onSnap={() => {}}
        {...withMin(MIN)}
      />,
    );
    // The inert elapsed segment is a NEW testid Task 4 adds; it must NOT reuse the
    // active progress fill's amber token (visually distinct + inert). frontend-component
    // skill: a design-system token, not an ad-hoc hex/opacity.
    const elapsed = screen.getByTestId('time-slider-elapsed');
    expect(elapsed).toBeInTheDocument();
    expect(elapsed.className).not.toMatch(/amber-primary/);
  });

  it('keeps the FULL range when minMinutes defaults to the planner start (future dates)', () => {
    const onMinutesChange = vi.fn();
    render(
      <TimeSlider
        ariaLabel="Välj tid"
        selectedMinutes={8 * 60}
        ticks={TICKS}
        onMinutesChange={onMinutesChange}
        onSnap={() => {}}
      />,
    );
    const slider = screen.getByRole('slider', { name: 'Välj tid' });
    // No today-clamp on future dates: the input min is the planner start and Home reaches 06:00.
    expect(slider).toHaveAttribute('min', String(6 * 60));
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onMinutesChange).toHaveBeenCalledWith(6 * 60);
    // The inert elapsed segment is absent when nothing is elapsed.
    expect(screen.queryByTestId('time-slider-elapsed')).toBeNull();
  });
});
