'use client';

import { useMemo, useState, useEffect, memo } from 'react';
import type { SunWindow } from '@/lib/types/venue';
import type { SkyCondition } from '@/lib/types/design-tokens';
import type { TimelineSegment } from '@/lib/types/timeline';
import {
  generateSegments,
  timeToPosition,
  formatTimeLabel,
  dateToStockholmMinutes,
} from '@/lib/utils/timeline';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RANGE_START = 360; // 06:00
const RANGE_END = 1320; // 22:00

const BAR_BG: Record<string, string> = {
  sunny: 'bg-sun-sunny',
  partial: 'bg-sun-partial',
  shaded: 'bg-sun-shaded',
  upcoming: 'bg-sun-upcoming',
};

// ---------------------------------------------------------------------------
// Weather icons (inline SVGs matching SkyConditionBadge style)
// ---------------------------------------------------------------------------

function WeatherIcon({ condition, size = 14 }: { condition: SkyCondition; size?: number }) {
  if (condition === 'clear') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="5" fill="var(--color-sky-clear)" />
        <g stroke="var(--color-sky-clear)" strokeWidth="1.5" strokeLinecap="round">
          <line x1="12" y1="1" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="23" />
          <line x1="1" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="23" y2="12" />
        </g>
      </svg>
    );
  }
  if (condition === 'partly-cloudy') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="16" cy="8" r="4" fill="var(--color-sky-clear)" />
        <path
          d="M6 20a4 4 0 0 1 0-8h1a5 5 0 0 1 9.9-1H17a3 3 0 0 1 0 6H6z"
          fill="var(--color-sky-partly-cloudy)"
          stroke="var(--color-sky-partly-cloudy)"
          strokeWidth="0.5"
        />
      </svg>
    );
  }
  if (condition === 'overcast') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 20a4 4 0 0 1 0-8h1a5 5 0 0 1 9.9-1H17a3 3 0 0 1 0 6H6z"
          fill="var(--color-sky-overcast)"
        />
      </svg>
    );
  }
  if (condition === 'rain') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6 14a4 4 0 0 1 0-8h1a5 5 0 0 1 9.9-1H17a3 3 0 0 1 0 6H6z"
          fill="var(--color-sky-rain)"
        />
        <g stroke="var(--color-sky-rain)" strokeWidth="1.5" strokeLinecap="round">
          <line x1="8" y1="16" x2="7" y2="19" />
          <line x1="12" y1="16" x2="11" y2="19" />
          <line x1="16" y1="16" x2="15" y2="19" />
        </g>
      </svg>
    );
  }
  return null; // unavailable — no icon
}

/**
 * Pick the dominant weather condition for a 1-hour bucket of segments.
 */
function dominantCondition(segments: TimelineSegment[]): SkyCondition {
  const counts: Record<string, number> = {};
  for (const s of segments) {
    const c = s.skyCondition;
    if (c !== 'unavailable') counts[c] = (counts[c] ?? 0) + 1;
  }
  let best: SkyCondition = 'unavailable';
  let max = 0;
  for (const [cond, n] of Object.entries(counts)) {
    if (n > max) { max = n; best = cond as SkyCondition; }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SunTimelineProps {
  sunWindows: SunWindow[];
  /** Controlled "now" for testing; auto-updates every 60s otherwise */
  now?: Date;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SunTimelineInner({ sunWindows, now, className }: SunTimelineProps) {
  const reducedMotion = useReducedMotion();
  const [autoNow, setAutoNow] = useState(() => new Date());

  useEffect(() => {
    if (now) return;
    const id = setInterval(() => setAutoNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [now]);

  const currentNow = now ?? autoNow;
  const nowMinute = useMemo(() => dateToStockholmMinutes(currentNow), [currentNow]);

  const segments = useMemo(
    () => generateSegments(sunWindows, RANGE_START, RANGE_END),
    [sunWindows],
  );

  // Hour labels + weather icons per hour
  const hours = useMemo(() => {
    const result: { minute: number; label: string; pct: number; condition: SkyCondition }[] = [];
    for (let m = RANGE_START; m <= RANGE_END; m += 60) {
      const hourSegs = segments.filter(
        (s) => s.startMinute >= m && s.startMinute < m + 60,
      );
      result.push({
        minute: m,
        label: formatTimeLabel(m),
        pct: timeToPosition(m, RANGE_START, RANGE_END),
        condition: dominantCondition(hourSegs),
      });
    }
    return result;
  }, [segments]);

  // Now indicator
  const showNow = nowMinute >= RANGE_START && nowMinute <= RANGE_END;
  const nowPct = showNow
    ? Math.max(0.5, Math.min(99.5, timeToPosition(nowMinute, RANGE_START, RANGE_END)))
    : 0;

  return (
    <div
      role="img"
      aria-label="Solprognos tidslinje"
      data-testid="sun-timeline"
      className={cn('w-full flex flex-col gap-0.5', className)}
    >
      {/* Weather condition icons row */}
      <div className="relative h-5" data-testid="weather-icons-row">
        {hours.map((h) =>
          h.condition !== 'unavailable' ? (
            <div
              key={h.minute}
              className="absolute -translate-x-1/2"
              style={{ left: `${h.pct}%` }}
            >
              <WeatherIcon condition={h.condition} size={14} />
            </div>
          ) : null,
        )}
      </div>

      {/* Timeline bar */}
      <div className="relative w-full flex h-6 rounded-sm overflow-hidden" data-testid="timeline-bar">
        {segments.map((seg, i) => {
          const duration = seg.endMinute - seg.startMinute;
          return (
            <div
              key={i}
              className={cn(BAR_BG[seg.sunStatus] ?? 'bg-sun-shaded')}
              style={{ flexGrow: duration, minWidth: duration <= 20 ? '4px' : undefined }}
            />
          );
        })}

        {/* Now indicator */}
        {showNow && (
          <div
            className="absolute w-[2px] bg-text-primary h-[calc(100%+6px)] -top-[3px]"
            style={{ left: `${nowPct}%`, transform: 'translateX(-50%)' }}
            data-testid="now-indicator"
          >
            <div
              className={cn(
                'w-[6px] h-[6px] rounded-full bg-text-primary -translate-x-[2px]',
                !reducedMotion && 'animate-pulse',
              )}
            />
          </div>
        )}
      </div>

      {/* Hour labels */}
      <div className="relative w-full h-4" data-testid="hour-labels">
        {hours
          .filter((_, i) => i % 2 === 0) // Show every 2 hours to avoid crowding
          .map((h) => (
            <span
              key={h.minute}
              className="absolute text-[10px] leading-none font-medium text-text-muted -translate-x-1/2"
              style={{ left: `${h.pct}%` }}
            >
              {h.label}
            </span>
          ))}
      </div>
    </div>
  );
}

export const SunTimeline = memo(SunTimelineInner);
