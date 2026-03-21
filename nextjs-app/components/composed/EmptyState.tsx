'use client';

import { useLanguage } from '@/lib/i18n';

export type EmptyStateVariant = 'weather' | 'area' | 'location' | 'offline';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  onCta?: () => void;
}

function SunBehindCloudIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="20" cy="16" r="8" fill="var(--color-sky-clear, #FBBF24)" />
      <path
        d="M8 28a8 8 0 0 1 15.5-3A6 6 0 1 1 34 28H8z"
        fill="var(--color-sky-overcast, #94A3B8)"
      />
    </svg>
  );
}

function MapPinQuestionIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20 4C13.4 4 8 9.4 8 16c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z"
        fill="var(--color-sky-overcast, #94A3B8)"
      />
      <text
        x="20"
        y="22"
        textAnchor="middle"
        fill="white"
        fontSize="16"
        fontWeight="bold"
        fontFamily="sans-serif"
      >
        ?
      </text>
    </svg>
  );
}

function LocationDeniedIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20 4C13.4 4 8 9.4 8 16c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z"
        fill="var(--color-sky-overcast, #94A3B8)"
      />
      <line x1="14" y1="11" x2="26" y2="23" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <line x1="26" y1="11" x2="14" y2="23" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function CloudDisconnectIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 26a7 7 0 0 1 13.5-3A5.5 5.5 0 1 1 32 26H10z"
        fill="var(--color-sky-overcast, #94A3B8)"
      />
      <line x1="14" y1="32" x2="26" y2="32" stroke="var(--color-sky-overcast, #94A3B8)" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="29" x2="20" y2="35" stroke="var(--color-sky-overcast, #94A3B8)" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
    </svg>
  );
}

const icons: Record<EmptyStateVariant, () => React.JSX.Element> = {
  weather: SunBehindCloudIcon,
  area: MapPinQuestionIcon,
  location: LocationDeniedIcon,
  offline: CloudDisconnectIcon,
};

const i18nKeys: Record<EmptyStateVariant, { headline: string; body: string; cta: string }> = {
  weather: {
    headline: 'emptyState.weatherHeadline',
    body: 'emptyState.weatherBody',
    cta: 'emptyState.weatherCta',
  },
  area: {
    headline: 'emptyState.areaHeadline',
    body: 'emptyState.areaBody',
    cta: 'emptyState.areaCta',
  },
  location: {
    headline: 'emptyState.locationHeadline',
    body: 'emptyState.locationBody',
    cta: 'emptyState.locationCta',
  },
  offline: {
    headline: 'emptyState.offlineHeadline',
    body: 'emptyState.offlineBody',
    cta: 'emptyState.offlineCta',
  },
};

export function EmptyState({ variant, onCta }: EmptyStateProps) {
  const { t } = useLanguage();
  const Icon = icons[variant];
  const keys = i18nKeys[variant];

  return (
    <div
      data-testid={`empty-state-${variant}`}
      className="flex flex-col items-center justify-center text-center py-8 px-4"
    >
      <div className="mb-3">
        <Icon />
      </div>
      <h2 className="text-[length:var(--font-size-subhead)] leading-[var(--line-height-subhead)] font-semibold text-text-primary mb-1">
        {t(keys.headline)}
      </h2>
      <p className="text-[length:var(--font-size-caption)] leading-[var(--line-height-caption)] text-text-secondary mb-4 max-w-[280px]">
        {t(keys.body)}
      </p>
      {onCta && (
        <button
          type="button"
          onClick={onCta}
          className="min-h-[var(--spacing-touch-min)] px-6 rounded-lg bg-accent-primary text-white font-medium text-[length:var(--font-size-body)] leading-[var(--line-height-body)] hover:opacity-90 transition-opacity"
        >
          {t(keys.cta)}
        </button>
      )}
    </div>
  );
}
