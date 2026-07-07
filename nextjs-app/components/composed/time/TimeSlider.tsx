'use client';

import { useMemo, useRef, useState } from 'react';
import {
  clampPlannerMinutes,
  formatPlannerTime,
  PLANNER_END_MINUTES,
  PLANNER_START_MINUTES,
  PLANNER_STEP_MINUTES,
  snapPlannerMinutes,
  type PlannerTick,
} from '@/lib/utils/time-planner';
import { cn } from '@/lib/utils';

export type TimeSliderProps = {
  ariaLabel: string;
  selectedMinutes: number;
  ticks: PlannerTick[];
  onMinutesChange: (minutes: number) => void;
  onSnap: () => void;
  /**
   * Story 11.2 (AC4): the effective slider minimum. On `today` the panel passes
   * the snapped current wall-clock time so earlier positions are unreachable and
   * the pre-min ("elapsed") segment reads inert. Defaults to the planner start
   * (full range) for future dates. Kept a controlled prop — `TimeSlider` never
   * reads `new Date()` (hydration discipline).
   */
  minMinutes?: number;
  reducedMotion?: boolean;
  variant?: 'standard' | 'topPanel';
  className?: string;
};

export function TimeSlider({
  ariaLabel,
  selectedMinutes,
  ticks,
  onMinutesChange,
  onSnap,
  minMinutes = PLANNER_START_MINUTES,
  reducedMotion = false,
  variant = 'standard',
  className,
}: TimeSliderProps) {
  // Story 11.2 (AC4): clamp the effective minimum into the planner range so a
  // stale/oversized value can never push the thumb off-track.
  const effectiveMin = clampPlannerMinutes(minMinutes);

  // Story 11.2 (AC2): during an active pointer drag the slider tracks a LOCAL
  // visual value (thumb/progress/badge follow the pointer at full frame rate)
  // while the app-level commit fires AT MOST ONCE, on settle. When not dragging
  // the controlled `selectedMinutes` prop is the source of truth, so a live-clock
  // tick or any external change still moves the thumb (no stuck-thumb bug).
  const [dragValue, setDragValue] = useState<number | null>(null);
  // Story 11.2 (AC2): the drag flag is backed by a SYNCHRONOUS ref set in
  // `onPointerDown` and read in `handleChange`. If a browser dispatches the
  // range input's first `change` in the same event turn as `pointerdown` (before
  // React commits `dragValue` null→number), reading the flag off rendered state
  // would take the discrete-tap commit branch and reintroduce a per-step commit.
  // The ref decouples the flag from the render cycle entirely; `dragValue` state
  // remains for render (thumb/progress/badge follow).
  const isDraggingRef = useRef(false);
  const isDragging = dragValue !== null;
  const displayMinutes = isDragging ? dragValue : clampMinutes(selectedMinutes, effectiveMin);

  const valueText = formatPlannerTime(displayMinutes);
  const percent = progressPercent(displayMinutes);
  const elapsedPercent = progressPercent(effectiveMin);
  const activeTick = useMemo(() => closestTick(displayMinutes, ticks), [displayMinutes, ticks]);
  const isTopPanel = variant === 'topPanel';
  const visibleTicks = isTopPanel
    ? ticks.filter((tick) => [6 * 60, 12 * 60, 18 * 60, 21 * 60].includes(tick.minutes))
    : ticks;
  const hasElapsedSegment = effectiveMin > PLANNER_START_MINUTES;

  // During an active drag the grabbed thumb must follow the pointer 1:1 (no
  // spring-lag). Programmatic/tick moves and reduced-motion keep the spring/none
  // transition so external changes still ease. (Design Gate "Animation".)
  const followClass = reducedMotion
    ? 'transition-none'
    : isDragging
      ? 'transition-none'
      : 'transition-[left] duration-default ease-spring';
  const badgeFollowClass = reducedMotion
    ? 'transition-none'
    : isDragging
      ? 'transition-none'
      : 'transition-[left] duration-default ease-spring';

  const commit = (next: number) => {
    onMinutesChange(clampMinutes(snapPlannerMinutes(next), effectiveMin));
  };

  const handleChange = (next: number) => {
    const value = clampMinutes(snapPlannerMinutes(next), effectiveMin);
    // Read the SYNCHRONOUS ref (not `isDragging` off rendered state) so a
    // same-turn pointerdown→change ordering still takes the drag branch.
    if (isDraggingRef.current) {
      // Drag in progress: update only the local visual value; do NOT commit
      // per step (the anti-pattern this story kills).
      setDragValue(value);
      return;
    }
    // A discrete (non-drag) change, e.g. a tap that lands without a preceding
    // pointerdown: commit immediately.
    onMinutesChange(value);
  };

  const startDrag = () => {
    isDraggingRef.current = true;
    setDragValue(clampMinutes(selectedMinutes, effectiveMin));
  };

  const endDrag = () => {
    if (!isDraggingRef.current) {
      onSnap();
      return;
    }
    // Commit the dragged-to value exactly once, then settle via the existing
    // snap seam. The controlled prop wins on the next render (reconcile).
    isDraggingRef.current = false;
    onMinutesChange(dragValue ?? clampMinutes(selectedMinutes, effectiveMin));
    setDragValue(null);
    onSnap();
  };

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('relative flex items-center', isTopPanel ? 'min-h-12 pt-4' : 'min-h-11')}>
        {isTopPanel && (
          <div
            data-testid="time-slider-value-badge"
            aria-hidden="true"
            className={`pointer-events-none absolute top-0 z-base min-w-12 -translate-x-1/2 rounded-pill bg-text-primary px-2 py-0.5 text-center text-label-xs text-white shadow-subtle ${badgeFollowClass}`}
            style={{ left: `${percent}%` }}
          >
            {valueText}
          </div>
        )}
        <div
          data-testid="time-slider-track"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 h-slider-track-h h-[var(--size-slider-track-h)] -translate-y-1/2 overflow-hidden rounded-pill bg-surface-slider-track bg-gradient-to-r from-surface-slider-track via-amber-pale/60 to-amber-dark/40"
        >
          <div
            data-testid="time-slider-progress"
            className="h-full rounded-pill bg-amber-primary bg-gradient-to-r from-amber-pin via-amber-primary to-amber-gold shadow-card"
            style={{ width: `${percent}%` }}
          />
          {hasElapsedSegment && (
            // Story 11.2 (AC4): the pre-min ("elapsed") portion reads inert —
            // painted OVER the amber progress so the 0..min band shows a muted,
            // non-amber design token distinct from the active fill.
            <div
              data-testid="time-slider-elapsed"
              className="absolute inset-y-0 left-0 rounded-pill bg-drag-handle"
              style={{ width: `${elapsedPercent}%` }}
            />
          )}
        </div>
        <input
          type="range"
          // External-review fix: the native range input maps the pointer
          // x-coordinate against [min, max]. Keeping `min={effectiveMin}` while the
          // custom thumb/progress render against the FULL 06:00–21:00 track (see
          // `progressPercent`, anchored at PLANNER_START_MINUTES) made the native
          // coordinate mapping disagree with the visuals whenever a today-minimum
          // was active — grabbing the visible thumb selected the WRONG time. Put
          // the native input back on the FULL planner span so its geometry matches
          // the visuals; the below-min FLOOR is enforced by `handleChange`/`commit`
          // (which clamp to `effectiveMin`) AND by the state layer (TimeContext
          // `clampBelowStateMin` in setSelectedMinutes/snapSelectedMinutes), so a
          // below-min selection is still impossible. `aria-valuemin` keeps the
          // effective min so AT reports the true reachable floor.
          min={PLANNER_START_MINUTES}
          max={PLANNER_END_MINUTES}
          step={PLANNER_STEP_MINUTES}
          value={displayMinutes}
          aria-label={ariaLabel}
          aria-valuemin={effectiveMin}
          aria-valuetext={valueText}
          onChange={(event) => handleChange(Number(event.currentTarget.value))}
          onPointerDown={startDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
              event.preventDefault();
              commit(displayMinutes + PLANNER_STEP_MINUTES);
            }
            if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
              event.preventDefault();
              commit(displayMinutes - PLANNER_STEP_MINUTES);
            }
            if (event.key === 'Home') {
              event.preventDefault();
              commit(effectiveMin);
            }
            if (event.key === 'End') {
              event.preventDefault();
              commit(PLANNER_END_MINUTES);
            }
          }}
          onBlur={() => onSnap()}
          className="absolute inset-0 z-base h-11 w-full cursor-grab opacity-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary active:cursor-grabbing"
        />
        <div
          data-testid="time-slider-thumb"
          data-reduced-motion={String(reducedMotion)}
          aria-hidden="true"
          className={[
            'pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-pill shadow-subtle',
            followClass,
            isTopPanel
              ? 'flex size-6 items-center justify-center border-slider-thumb border-amber-primary bg-white shadow-button-sm'
              : 'size-slider-thumb border-slider-thumb border-white bg-amber-dark',
          ].join(' ')}
          style={{ left: `${percent}%` }}
        >
          {isTopPanel && <span className="size-1.5 rounded-pill bg-amber-primary" />}
        </div>
      </div>
      <div className={cn('mt-1 flex justify-between text-text-muted', isTopPanel && 'pr-10')}>
        {visibleTicks.map((tick) => (
          <span
            key={tick.label}
            className={[
              'text-label-xs-medium',
              tick.label === activeTick.label
                ? 'text-amber-dark'
                : !isTopPanel
                  ? 'text-tab-inactive'
                  : '',
            ].filter(Boolean).join(' ')}
          >
            {isTopPanel ? tick.label.slice(0, 2) : tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function clampMinutes(minutes: number, min: number): number {
  return Math.min(PLANNER_END_MINUTES, Math.max(min, minutes));
}

function progressPercent(minutes: number): number {
  return ((minutes - PLANNER_START_MINUTES) / (PLANNER_END_MINUTES - PLANNER_START_MINUTES)) * 100;
}

function closestTick(minutes: number, ticks: PlannerTick[]): PlannerTick {
  return ticks.reduce((closest, tick) => (
    Math.abs(tick.minutes - minutes) < Math.abs(closest.minutes - minutes)
      ? tick
      : closest
  ), ticks[0] ?? { label: formatPlannerTime(minutes), minutes });
}
