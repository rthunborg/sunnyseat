'use client';

import { useMemo, useState, useEffect, memo } from 'react';
import type { SunWindow } from '@/lib/types/venue';
import type { MiniTimelineVariant, TimelineSegment } from '@/lib/types/timeline';
import {
  generateSegments,
  timeToPosition,
  formatTimeLabel,
  getCardTimeRange,
  generateAriaLabel,
  dateToStockholmMinutes,
} from '@/lib/utils/timeline';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

const BG_MAP: Record<string, string> = {
  sunny: 'bg-sun-sunny',
  partial: 'bg-sun-partial',
  shaded: 'bg-sun-shaded',
  upcoming: 'bg-sun-upcoming',
};

// Detail variant constants
const DETAIL_RANGE_START = 360; // 06:00
const DETAIL_RANGE_END = 1320; // 22:00

interface MiniTimelineProps {
  sunWindows: SunWindow[];
  variant: MiniTimelineVariant;
  now?: Date;
  className?: string;
}

function CloudOverlayIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="opacity-60"
      aria-hidden="true"
    >
      <path
        d="M6 20a4 4 0 0 1 0-8h1a5 5 0 0 1 9.9-1H17a3 3 0 0 1 0 6H6z"
        fill="var(--color-sky-overcast)"
        stroke="var(--color-sky-overcast)"
        strokeWidth="0.5"
      />
    </svg>
  );
}

function getCloudGroups(segments: TimelineSegment[], rangeStart: number, rangeEnd: number) {
  const groups: { startMinute: number; endMinute: number; duration: number }[] = [];
  let current: { startMinute: number; endMinute: number } | null = null;

  for (const seg of segments) {
    if (seg.skyCondition === 'partly-cloudy' || seg.skyCondition === 'overcast') {
      if (current) {
        current.endMinute = seg.endMinute;
      } else {
        current = { startMinute: seg.startMinute, endMinute: seg.endMinute };
      }
    } else {
      if (current) {
        groups.push({ ...current, duration: current.endMinute - current.startMinute });
        current = null;
      }
    }
  }
  if (current) {
    groups.push({ ...current, duration: current.endMinute - current.startMinute });
  }

  // Take top 2 largest groups
  groups.sort((a, b) => b.duration - a.duration);
  return groups.slice(0, 2).map((g) => {
    const midMinute = (g.startMinute + g.endMinute) / 2;
    return timeToPosition(midMinute, rangeStart, rangeEnd);
  });
}

function MiniTimelineInner({ sunWindows, variant, now, className }: MiniTimelineProps) {
  const reducedMotion = useReducedMotion();
  const [autoNow, setAutoNow] = useState(() => new Date());

  // Auto-update "now" every 60 seconds when not controlled via prop
  useEffect(() => {
    if (now) return;
    const id = setInterval(() => setAutoNow(new Date()), 60000);
    return () => clearInterval(id);
  }, [now]);

  const currentNow = now ?? autoNow;

  const nowMinute = useMemo(() => dateToStockholmMinutes(currentNow), [currentNow]);

  const isCard = variant === 'card';
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (isCard) {
      const r = getCardTimeRange(sunWindows, currentNow);
      return { rangeStart: r.start, rangeEnd: r.end };
    }
    return { rangeStart: DETAIL_RANGE_START, rangeEnd: DETAIL_RANGE_END };
  }, [isCard, sunWindows, currentNow]);

  const segments = useMemo(
    () => generateSegments(sunWindows, rangeStart, rangeEnd),
    [sunWindows, rangeStart, rangeEnd]
  );

  const ariaLabel = useMemo(() => generateAriaLabel(segments), [segments]);

  // "Now" indicator position
  const showNow = nowMinute >= rangeStart && nowMinute <= rangeEnd;
  const nowPct = showNow
    ? Math.max(0.5, Math.min(99.5, timeToPosition(nowMinute, rangeStart, rangeEnd)))
    : 0;

  // Cloud overlay positions (detail only)
  const cloudPositions = useMemo(
    () => (!isCard ? getCloudGroups(segments, rangeStart, rangeEnd) : []),
    [isCard, segments, rangeStart, rangeEnd]
  );

  // Bar & container dimensions
  const barHeight = isCard ? 'h-[16px]' : 'h-[24px]';
  const containerHeight = isCard ? 'h-[28px]' : 'h-[38px]';
  const labelStyle = isCard
    ? 'text-[10px] leading-[14px] font-medium text-text-muted'
    : 'text-[12px] leading-[14px] font-medium text-text-muted';

  // Hourly labels for detail variant
  const hourLabels = useMemo(() => {
    if (isCard) return null;
    const labels: { minute: number; text: string; pct: number }[] = [];
    for (let m = DETAIL_RANGE_START; m <= DETAIL_RANGE_END; m += 60) {
      labels.push({
        minute: m,
        text: formatTimeLabel(m),
        pct: timeToPosition(m, DETAIL_RANGE_START, DETAIL_RANGE_END),
      });
    }
    return labels;
  }, [isCard]);

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn(containerHeight, 'w-full flex flex-col', className)}
    >
      {/* Cloud overlay (detail only) */}
      {!isCard && cloudPositions.length > 0 && (
        <div className="relative h-[18px]">
          {cloudPositions.map((pct, i) => (
            <div
              key={i}
              className="absolute"
              style={{ left: `${pct}%`, bottom: '4px', transform: 'translateX(-50%)' }}
            >
              <CloudOverlayIcon size={14} />
            </div>
          ))}
        </div>
      )}

      {/* Bar */}
      <div className={cn('relative w-full flex', barHeight)}>
        {segments.map((seg, i) => {
          const duration = seg.endMinute - seg.startMinute;
          const minWidth = duration <= 20 ? '6px' : undefined;
          return (
            <div
              key={i}
              className={cn(BG_MAP[seg.sunStatus] ?? 'bg-sun-shaded')}
              style={{
                flexGrow: duration,
                minWidth,
              }}
            />
          );
        })}

        {/* "Now" indicator */}
        {showNow && (
          <div
            className="absolute w-[2px] bg-text-primary h-[calc(100%+4px)] -top-[4px]"
            style={{ left: `${nowPct}%`, transform: 'translateX(-50%)' }}
          >
            <div
              className={cn(
                'w-[4px] h-[4px] rounded-full bg-text-primary -translate-x-[1px]',
                !reducedMotion && 'animate-pulse'
              )}
            />
          </div>
        )}
      </div>

      {/* Labels */}
      {isCard ? (
        <div className={cn('flex justify-between w-full', labelStyle)}>
          <span>{formatTimeLabel(rangeStart)}</span>
          <span className="hidden min-[320px]:block">{formatTimeLabel(rangeEnd)}</span>
        </div>
      ) : (
        <div className="relative w-full h-[14px]">
          {hourLabels?.map((l) => (
            <span
              key={l.minute}
              className={cn('absolute', labelStyle)}
              style={{ left: `${l.pct}%`, transform: 'translateX(-50%)' }}
            >
              {l.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export const MiniTimeline = memo(MiniTimelineInner);
