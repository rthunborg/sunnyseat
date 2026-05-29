'use client';

import { useMemo } from 'react';
import {
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
  reducedMotion = false,
  variant = 'standard',
  className,
}: TimeSliderProps) {
  const valueText = formatPlannerTime(selectedMinutes);
  const percent = progressPercent(selectedMinutes);
  const activeTick = useMemo(() => closestTick(selectedMinutes, ticks), [selectedMinutes, ticks]);
  const isTopPanel = variant === 'topPanel';
  const visibleTicks = isTopPanel
    ? ticks.filter((tick) => [6 * 60, 12 * 60, 18 * 60, 21 * 60].includes(tick.minutes))
    : ticks;

  const adjust = (next: number) => {
    onMinutesChange(snapPlannerMinutes(next));
  };

  return (
    <div className={cn('w-full', className)}>
      <div className={cn('relative flex items-center', isTopPanel ? 'min-h-12 pt-4' : 'min-h-11')}>
        {isTopPanel && (
          <div
            data-testid="time-slider-value-badge"
            aria-hidden="true"
            className={`absolute top-0 z-base min-w-12 -translate-x-1/2 rounded-pill bg-text-primary px-2 py-0.5 text-center text-label-xs text-white shadow-subtle ${
              reducedMotion ? 'transition-none' : 'transition-[left] duration-default ease-spring'
            }`}
            style={{ left: `${percent}%` }}
          >
            {valueText}
          </div>
        )}
        <div
          data-testid="time-slider-track"
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 h-slider-track-h h-[var(--size-slider-track-h)] -translate-y-1/2 overflow-hidden rounded-pill bg-surface-slider-track bg-gradient-to-r from-surface-slider-track via-amber-pale/60 to-amber-dark/40"
        >
          <div
            data-testid="time-slider-progress"
            className="h-full rounded-pill bg-amber-primary bg-gradient-to-r from-amber-pin via-amber-primary to-amber-gold shadow-card"
            style={{ width: `${percent}%` }}
          />
        </div>
        <input
          type="range"
          min={PLANNER_START_MINUTES}
          max={PLANNER_END_MINUTES}
          step={PLANNER_STEP_MINUTES}
          value={selectedMinutes}
          aria-label={ariaLabel}
          aria-valuetext={valueText}
          onChange={(event) => adjust(Number(event.currentTarget.value))}
          onPointerUp={() => onSnap()}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
              event.preventDefault();
              adjust(selectedMinutes + PLANNER_STEP_MINUTES);
            }
            if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
              event.preventDefault();
              adjust(selectedMinutes - PLANNER_STEP_MINUTES);
            }
            if (event.key === 'Home') {
              event.preventDefault();
              adjust(PLANNER_START_MINUTES);
            }
            if (event.key === 'End') {
              event.preventDefault();
              adjust(PLANNER_END_MINUTES);
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
            'absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-pill shadow-subtle',
            reducedMotion ? 'transition-none' : 'transition-[left] duration-default ease-spring',
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
