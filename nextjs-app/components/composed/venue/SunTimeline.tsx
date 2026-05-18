'use client';

import { motion, useReducedMotion } from 'motion/react';
import { DURATION_DEFAULT_S, EASE_ENTER } from '@/lib/constants/animation';
import type { VenueSunTimelineDto, VenueSunTimelineWindowDto } from '@/lib/types/api';
import { cn } from '@/lib/utils';

export type SunTimelineLabels = {
  ariaLabel: string;
  currentTime: string;
  sunnyWindow: string;
  partialWindow: string;
  shadedWindow: string;
};

export type SunTimelineProps = {
  timeline: VenueSunTimelineDto;
  currentTime: string;
  labels: SunTimelineLabels;
  className?: string;
  reducedMotion?: boolean;
};

const TICK_COUNT = 4;

export function SunTimeline({
  timeline,
  currentTime,
  labels,
  className,
  reducedMotion,
}: SunTimelineProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const shouldReduceMotion = reducedMotion ?? prefersReducedMotion;
  const rangeStart = minutesFromTime(timeline.range.start);
  const rangeEnd = minutesFromTime(timeline.range.end);
  const current = clamp(minutesFromTime(currentTime), rangeStart, rangeEnd);
  const currentPercent = percentBetween(current, rangeStart, rangeEnd);
  const ticks = timelineTicks(rangeStart, rangeEnd);
  const revealClip = `inset(0 ${100 - currentPercent}% 0 0)`;

  return (
    <div
      aria-label={labels.ariaLabel}
      className={cn('space-y-3', className)}
      role="group"
    >
      <div className="relative pt-6 pb-7">
        <div className="relative h-timeline-h overflow-hidden rounded-pill bg-divider">
          <motion.div
            data-testid="timeline-progress"
            data-reduced-motion={String(shouldReduceMotion)}
            aria-hidden="true"
            className="absolute inset-0"
            initial={{ clipPath: shouldReduceMotion ? revealClip : 'inset(0 100% 0 0)' }}
            animate={{ clipPath: revealClip }}
            transition={{
              duration: shouldReduceMotion ? 0 : DURATION_DEFAULT_S * 2,
              ease: EASE_ENTER,
            }}
          >
            {timeline.windows.map((window) => (
              <TimelineWindow
                key={`${window.start}-${window.end}-${window.status}-progress`}
                window={window}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                labels={labels}
                decorative
              />
            ))}
          </motion.div>
          {timeline.windows.map((window) => (
            <TimelineWindow
              key={`${window.start}-${window.end}-${window.status}`}
              window={window}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              labels={labels}
            />
          ))}
        </div>
        <div
          aria-label={formatLabel(labels.currentTime, { time: currentTime })}
          className="absolute top-4 flex -translate-x-1/2 flex-col items-center gap-1"
          style={{ left: `${currentPercent}%` }}
        >
          <span className="size-4 rounded-pill border-2 border-white bg-amber-dark shadow-subtle" />
          <span className="text-time text-amber-dark">{currentTime}</span>
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-12 flex justify-between text-label-xs-medium text-text-body"
        >
          {ticks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineWindow({
  window,
  rangeStart,
  rangeEnd,
  labels,
  decorative = false,
}: {
  window: VenueSunTimelineWindowDto;
  rangeStart: number;
  rangeEnd: number;
  labels: SunTimelineLabels;
  decorative?: boolean;
}) {
  const start = clamp(minutesFromTime(window.start), rangeStart, rangeEnd);
  const end = clamp(minutesFromTime(window.end), rangeStart, rangeEnd);
  const left = percentBetween(start, rangeStart, rangeEnd);
  const width = Math.max(0, percentBetween(end, rangeStart, rangeEnd) - left);

  return (
    <span
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : windowLabel(window, labels)}
      className={cn(
        'absolute top-0 h-timeline-h rounded-pill',
        decorative && 'opacity-100',
        !decorative && 'opacity-25',
        window.status === 'Sunny' && 'gradient-timeline-bar',
        window.status === 'Partial' && 'bg-amber-gold/50',
        window.status === 'Shaded' && 'bg-transparent',
      )}
      style={{ left: `${left}%`, width: `${width}%` }}
    />
  );
}

function windowLabel(window: VenueSunTimelineWindowDto, labels: SunTimelineLabels): string {
  const template =
    window.status === 'Sunny'
      ? labels.sunnyWindow
      : window.status === 'Partial'
        ? labels.partialWindow
        : labels.shadedWindow;
  return formatLabel(template, { start: window.start, end: window.end });
}

function minutesFromTime(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}

function timeFromMinutes(value: number): string {
  const hours = Math.floor(value / 60);
  const minutes = Math.round(value % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function timelineTicks(start: number, end: number): string[] {
  if (end <= start) return [timeFromMinutes(start)];
  const step = (end - start) / (TICK_COUNT - 1);
  return Array.from({ length: TICK_COUNT }, (_, index) =>
    timeFromMinutes(start + step * index),
  );
}

function percentBetween(value: number, start: number, end: number): number {
  if (end <= start) return 0;
  return ((value - start) / (end - start)) * 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatLabel(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (label, [key, value]) => label.replaceAll(`{${key}}`, value),
    template,
  );
}
