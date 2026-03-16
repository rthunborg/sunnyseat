'use client';

import { useMemo, useState, useEffect } from 'react';
import type { SunWindow } from '@/lib/types/venue';
import { SkyConditionBadge } from '@/components/composed/SkyConditionBadge';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/lib/i18n';
import { convertUtcToStockholm } from '@/lib/solar/timezone-utils';
import { calculateDuration } from '@/lib/utils/timeline';

interface SunWindowsTableProps {
  todayWindows: SunWindow[];
  tomorrowWindows: SunWindow[];
  now?: Date;
  noSunReason?: 'shadow' | 'overcast';
  className?: string;
}

function formatStockholmTime(isoString: string): string {
  const local = convertUtcToStockholm(new Date(isoString));
  const h = String(local.getHours()).padStart(2, '0');
  const m = String(local.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function isNowInWindow(w: SunWindow, now: Date): boolean {
  const start = new Date(w.start);
  const end = new Date(w.end);
  return now >= start && now < end;
}

export function SunWindowsTable({
  todayWindows,
  tomorrowWindows,
  now: nowProp,
  noSunReason,
  className,
}: SunWindowsTableProps) {
  const { t } = useLanguage();
  const [autoNow, setAutoNow] = useState(() => new Date());

  useEffect(() => {
    if (nowProp) return;
    const id = setInterval(() => setAutoNow(new Date()), 60000);
    return () => clearInterval(id);
  }, [nowProp]);

  const currentNow = nowProp ?? autoNow;

  const noSunToday = todayWindows.length === 0;
  const noSunTomorrow = tomorrowWindows.length === 0;
  const noSunBoth = noSunToday && noSunTomorrow;

  const reasonBadgeKey = noSunReason === 'overcast' ? 'venue.noSunReason.overcast' : 'venue.noSunReason.shadow';

  if (noSunBoth) {
    return (
      <div role="table" aria-label={t('venue.noSunExpectedBoth')} className={className}>
        <p className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary">
          {t('venue.noSunExpectedBoth')}{' '}
          <Badge variant="secondary">{t(reasonBadgeKey)}</Badge>
        </p>
      </div>
    );
  }

  return (
    <div role="table" className={className}>
      {/* Today section */}
      <div role="rowgroup">
        <div role="row">
          <span
            role="columnheader"
            className="text-[length:var(--font-size-subhead)] leading-[var(--line-height-subhead)] font-semibold text-text-primary block pb-2"
          >
            {t('time.today')}
          </span>
        </div>
        {noSunToday ? (
          <div role="row" className="py-2">
            <span className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary">
              {t('venue.noSunExpected')}{' '}
              <Badge variant="secondary">{t(reasonBadgeKey)}</Badge>
            </span>
          </div>
        ) : (
          todayWindows.map((w, i) => (
            <WindowRow
              key={i}
              window={w}
              isActive={isNowInWindow(w, currentNow)}
              isTomorrow={false}
              t={t}
            />
          ))
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border-default mt-3 mb-3" style={{ height: '1px' }} />
      <div className="h-[24px]" />

      {/* Tomorrow section */}
      <div role="rowgroup">
        <div role="row">
          <span
            role="columnheader"
            className="text-[length:var(--font-size-subhead)] leading-[var(--line-height-subhead)] font-semibold text-text-primary block pb-2"
          >
            {t('time.tomorrow')}
          </span>
        </div>
        {noSunTomorrow ? (
          <div role="row" className="py-2">
            <span className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary">
              {t('venue.noSunExpected')}{' '}
              <Badge variant="secondary">{t(reasonBadgeKey)}</Badge>
            </span>
          </div>
        ) : (
          tomorrowWindows.map((w, i) => (
            <WindowRow
              key={i}
              window={w}
              isActive={false}
              isTomorrow={true}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface WindowRowProps {
  window: SunWindow;
  isActive: boolean;
  isTomorrow: boolean;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const STATUS_KEY_MAP: Record<string, string> = {
  sunny: 'status.sunny',
  partial: 'status.partial',
  shaded: 'status.shaded',
  upcoming: 'status.upcoming',
};

const SKY_KEY_MAP: Record<string, string> = {
  clear: 'sky.clear',
  'partly-cloudy': 'sky.partlyCloudy',
  overcast: 'sky.overcast',
  rain: 'sky.rain',
  unavailable: 'sky.unavailable',
};

function WindowRow({ window: w, isActive, isTomorrow, t }: WindowRowProps) {
  const startStr = formatStockholmTime(w.start);
  const endStr = formatStockholmTime(w.end);
  const duration = calculateDuration(w.start, w.end);
  const statusLabel = t(STATUS_KEY_MAP[w.sun_status] ?? 'status.shaded');
  const skyLabel = t(SKY_KEY_MAP[w.sky_condition] ?? 'sky.unavailable');

  const rowAriaLabel = t('accessibility.sunWindowRow', {
    status: statusLabel,
    start: startStr,
    end: endStr,
    sky: skyLabel,
    duration,
  });

  // Active highlighting: overcast uses partial-bg, otherwise sunny-bg
  const isOvercast = w.sky_condition === 'overcast';
  const activeBg = isOvercast ? 'bg-sun-partial-bg' : 'bg-sun-sunny-bg';
  const activeBorder = isOvercast ? 'border-l-sun-partial' : 'border-l-sun-sunny';

  return (
    <div
      role="row"
      aria-label={rowAriaLabel}
      aria-current={isActive ? 'true' : undefined}
      className={`flex items-center gap-3 min-h-[var(--spacing-touch-min)] px-3 py-2 ${
        isActive ? `${activeBg} border-l-[3px] ${activeBorder}` : ''
      }`}
    >
      {/* Sun icon */}
      <span role="cell" className="shrink-0">
        <SkyConditionBadge condition={w.sky_condition} size={20} iconOnly />
      </span>

      {/* Time range */}
      <span
        role="cell"
        className="text-[length:var(--font-size-subhead)] leading-[var(--line-height-subhead)] font-semibold text-text-primary"
      >
        {startStr} – {endStr}
      </span>

      {/* Sky condition */}
      <span role="cell" className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary">
        {isTomorrow ? (
          <span className="text-text-muted">
            {t('venue.forecast', { condition: skyLabel })}
          </span>
        ) : (
          <SkyConditionBadge condition={w.sky_condition} size={16} />
        )}
      </span>

      {/* Duration */}
      <span
        role="cell"
        className="ml-auto text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-muted"
      >
        {duration}
      </span>
    </div>
  );
}
