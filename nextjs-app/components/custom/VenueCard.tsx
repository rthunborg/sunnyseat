'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { VenueCardProps } from '@/lib/types/card-states';
import { SkyConditionBadge } from '@/components/composed/SkyConditionBadge';
import { MiniTimeline } from '@/components/custom/MiniTimeline';
import { useLanguage } from '@/lib/i18n';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { getDetailLineText } from '@/lib/utils/selectVenueCardVariant';
import { formatDistance } from '@/lib/utils/formatDistance';
import { cn } from '@/lib/utils';

const BG_MAP = {
  sunny: 'bg-sun-sunny-bg/90',
  partial: 'bg-sun-partial-bg/90',
  shaded: 'bg-sun-shaded-bg/90',
  upcoming: 'bg-sun-upcoming-bg/90',
} as const;

const DOT_MAP = {
  sunny: 'bg-sun-sunny',
  partial: 'bg-sun-partial',
  shaded: 'bg-sun-shaded',
  upcoming: 'bg-sun-upcoming',
} as const;

const BORDER_MAP = {
  sunny: 'border-l-sun-sunny',
  partial: 'border-l-sun-partial',
  shaded: 'border-l-sun-shaded',
  upcoming: 'border-l-sun-upcoming',
} as const;

const SHADOW_MAP = {
  sunny: 'shadow-elevated',
  partial: 'shadow-card',
  upcoming: 'shadow-card',
  shaded: 'shadow-sm',
} as const;

const STATUS_KEY_MAP = {
  sunny: 'status.sunny',
  partial: 'status.partial',
  shaded: 'status.shaded',
  upcoming: 'status.upcoming',
} as const;

const SKY_KEY_MAP: Record<string, string> = {
  clear: 'sky.clear',
  'partly-cloudy': 'sky.partlyCloudy',
  overcast: 'sky.overcast',
  rain: 'sky.rain',
  unavailable: 'sky.unavailable',
};

export function VenueCard({
  venueName,
  neighborhood,
  variant,
  distanceMeters,
  skyCondition,
  slug,
  lat,
  lng,
  highlighted = false,
  sunWindows,
  isPartner = false,
  sunWindowStart: _sunWindowStart,
  sunWindowEnd: _sunWindowEnd,
  isBestChoice = false,
  layout = 'compact',
  onMouseEnter,
  onMouseLeave,
}: VenueCardProps & { isBestChoice?: boolean }) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const reducedMotion = useReducedMotion();

  const isExpanded = layout === 'expanded';

  const handleCardClick = useCallback(() => {
    router.push(`/v/${slug}`);
  }, [router, slug]);

  const handleDirectionsClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      '_blank',
      'noopener,noreferrer'
    );
  }, [lat, lng]);

  const statusLabel = t(STATUS_KEY_MAP[variant]);
  const skyLabel = t(SKY_KEY_MAP[skyCondition] ?? 'sky.unavailable');
  const detailText = getDetailLineText(variant, sunWindows, new Date(), language as 'sv' | 'en');
  const distanceLabel = formatDistance(distanceMeters, language as 'sv' | 'en');

  const ariaLabel = `${venueName}, ${statusLabel}, ${distanceLabel}, ${detailText}, ${skyLabel}`;

  return (
    <div
      role="article"
      aria-label={ariaLabel}
      data-testid={`venue-card-${slug}`}
      data-sun-status={variant}
      data-layout={layout}
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'relative flex flex-col justify-between p-4 rounded-card cursor-pointer',
        isExpanded ? 'h-[160px] max-h-[176px]' : 'h-[120px] max-h-[136px]',
        'overflow-hidden',
        'transition-all duration-150',
        'active:shadow-active',
        !reducedMotion && 'active:scale-[0.98]',
        'focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
        isExpanded && 'hover:shadow-elevated',
        BG_MAP[variant],
        SHADOW_MAP[variant],
        'border-l-[3px]',
        BORDER_MAP[variant],
        variant === 'shaded' && 'opacity-85',
        isPartner && variant === 'sunny' && 'ring-2 ring-[var(--color-partner-gold)] bg-gradient-to-r from-[var(--color-partner-gold-bg)] via-transparent',
        isPartner && variant !== 'sunny' && 'ring-2 ring-[var(--color-partner-gold)]',
        highlighted && !reducedMotion && 'animate-highlight-fade'
      )}
    >
      {isBestChoice && (
        <span
          data-testid="best-choice-badge"
          className="absolute top-1 right-2 text-[length:var(--font-size-micro)] leading-[var(--line-height-micro)] font-semibold text-sun-sunny bg-sun-sunny-bg rounded-full px-2 py-0.5"
        >
          {t('venueGroup.bestChoice')}
        </span>
      )}

      {/* Row 1: Status bar */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={cn('w-3 h-3 rounded-full shrink-0', DOT_MAP[variant])}
          aria-hidden="true"
        />
        <span className="text-[length:var(--font-size-caption)] leading-[var(--line-height-caption)] font-semibold text-text-primary shrink-0">
          {statusLabel}
        </span>
        <span className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-primary shrink-0">
          {distanceLabel}
        </span>
        {!isExpanded && (
          <span className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary truncate min-w-0">
            {neighborhood}
          </span>
        )}
        {isPartner && (
          <span
            className="shrink-0 rounded-full border border-[var(--color-partner-gold)] bg-[var(--color-partner-gold-bg)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--color-partner-gold-dark)]"
            data-testid="partner-badge"
          >
            {t('partner.badge')}
          </span>
        )}
        <span className="ml-auto shrink-0">
          <SkyConditionBadge condition={skyCondition} size={16} />
        </span>
      </div>

      {/* Row 2: Venue name + neighborhood (expanded shows neighborhood on its own line) */}
      <div>
        <div className="text-[length:var(--font-size-headline)] leading-[var(--line-height-headline)] font-semibold text-text-primary truncate">
          {venueName}
        </div>
        {isExpanded && (
          <div
            data-testid="expanded-neighborhood"
            className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary truncate"
          >
            {neighborhood}
          </div>
        )}
      </div>

      {/* Row 3: MiniTimeline — detail variant on expanded, card variant on compact */}
      <MiniTimeline
        sunWindows={sunWindows}
        variant={isExpanded ? 'detail' : 'card'}
      />

      {/* Row 4: Detail line + directions button (expanded only) */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-primary truncate">
          {detailText}
        </span>
        {isExpanded && (
          <button
            type="button"
            data-testid="venue-directions-btn"
            onClick={handleDirectionsClick}
            aria-label={t('venue.directionsTo', { name: venueName })}
            className="ml-auto shrink-0 text-[length:var(--font-size-body)] leading-[var(--line-height-body)] font-medium text-brand-primary hover:underline focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 rounded px-2 py-1"
          >
            {t('venue.directions')}
          </button>
        )}
      </div>
    </div>
  );
}
