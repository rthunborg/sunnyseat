'use client';

import type { SkyCondition } from '@/lib/types/design-tokens';
import { useLanguage } from '@/lib/i18n';

interface SkyConditionBadgeProps {
  condition: SkyCondition;
  size?: number;
  iconOnly?: boolean;
}

function SunIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" fill="var(--color-sky-clear)" />
      <g stroke="var(--color-sky-clear)" strokeWidth="1.5" strokeLinecap="round">
        <line x1="12" y1="1" x2="12" y2="4" />
        <line x1="12" y1="20" x2="12" y2="23" />
        <line x1="1" y1="12" x2="4" y2="12" />
        <line x1="20" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
        <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
        <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
        <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
      </g>
    </svg>
  );
}

function SunCloudIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="16" cy="8" r="4" fill="var(--color-sky-clear)" />
      <g stroke="var(--color-sky-clear)" strokeWidth="1.5" strokeLinecap="round">
        <line x1="16" y1="1" x2="16" y2="3" />
        <line x1="21.66" y1="5.34" x2="23" y2="4" />
        <line x1="23" y1="8" x2="21" y2="8" />
      </g>
      <path
        d="M6 20a4 4 0 0 1 0-8h1a5 5 0 0 1 9.9-1H17a3 3 0 0 1 0 6H6z"
        fill="var(--color-sky-partly-cloudy)"
        stroke="var(--color-sky-partly-cloudy)"
        strokeWidth="0.5"
      />
    </svg>
  );
}

function CloudIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
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

function RainIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
      aria-hidden="true"
    >
      <path
        d="M6 14a4 4 0 0 1 0-8h1a5 5 0 0 1 9.9-1H17a3 3 0 0 1 0 6H6z"
        fill="var(--color-sky-rain)"
        stroke="var(--color-sky-rain)"
        strokeWidth="0.5"
      />
      <g stroke="var(--color-sky-rain)" strokeWidth="1.5" strokeLinecap="round">
        <line x1="8" y1="16" x2="7" y2="19" />
        <line x1="12" y1="16" x2="11" y2="19" />
        <line x1="16" y1="16" x2="15" y2="19" />
      </g>
    </svg>
  );
}

const SKY_I18N_MAP: Record<Exclude<SkyCondition, 'unavailable'>, string> = {
  clear: 'sky.clear',
  'partly-cloudy': 'sky.partlyCloudy',
  overcast: 'sky.overcast',
  rain: 'sky.rain',
};

const SKY_COLOR_MAP: Record<Exclude<SkyCondition, 'unavailable'>, string> = {
  clear: 'text-sky-clear',
  'partly-cloudy': 'text-sky-partly-cloudy',
  overcast: 'text-sky-overcast',
  rain: 'text-sky-rain',
};

const SKY_ICON_MAP: Record<Exclude<SkyCondition, 'unavailable'>, React.FC<{ size?: number }>> = {
  clear: SunIcon,
  'partly-cloudy': SunCloudIcon,
  overcast: CloudIcon,
  rain: RainIcon,
};

export function SkyConditionBadge({ condition, size = 16, iconOnly = false }: SkyConditionBadgeProps) {
  const { t } = useLanguage();

  if (condition === 'unavailable') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[length:var(--font-size-caption)] leading-[var(--line-height-caption)] font-[var(--font-weight-caption)] text-text-muted"
        role="img"
        aria-label={t('sky.weatherCondition', { condition: t('sky.unavailable') })}
      >
        {!iconOnly && <span>{t('sky.unavailable')}</span>}
      </span>
    );
  }

  const Icon = SKY_ICON_MAP[condition];
  const label = t(SKY_I18N_MAP[condition]);
  const colorClass = SKY_COLOR_MAP[condition];

  return (
    <span
      className={`inline-flex items-center gap-1 text-[length:var(--font-size-caption)] leading-[var(--line-height-caption)] font-[var(--font-weight-caption)] ${colorClass}`}
      role="img"
      aria-label={t('sky.weatherCondition', { condition: label })}
    >
      <Icon size={size} />
      {!iconOnly && <span>{label}</span>}
    </span>
  );
}
