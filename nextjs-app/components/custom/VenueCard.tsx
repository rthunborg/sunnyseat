'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { VenueCardProps } from '@/lib/types/card-states';
import { SkyConditionBadge } from '@/components/composed/SkyConditionBadge';
import { MiniTimeline } from '@/components/custom/MiniTimeline';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { getDetailLineText, getDirectionsUrl } from '@/lib/utils/selectVenueCardVariant';
import { cn } from '@/lib/utils';

const BG_MAP = {
  sunny: 'bg-sun-sunny-bg',
  partial: 'bg-sun-partial-bg',
  shaded: 'bg-sun-shaded-bg',
  upcoming: 'bg-sun-upcoming-bg',
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
  sunWindowStart,
  sunWindowEnd,
}: VenueCardProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const reducedMotion = useReducedMotion();

  const handleCardClick = useCallback(() => {
    router.push(`/v/${slug}`);
  }, [router, slug]);

  const handleDirections = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      window.open(getDirectionsUrl(lat, lng), '_blank', 'noopener');
    },
    [lat, lng]
  );

  const statusLabel = t(STATUS_KEY_MAP[variant]);
  const skyLabel = t(SKY_KEY_MAP[skyCondition] ?? 'sky.unavailable');
  const detailText = getDetailLineText(variant, sunWindows, new Date(), language as 'sv' | 'en');

  const ariaLabel = `${venueName}, ${statusLabel}, ${distanceMeters} meter, ${detailText}, ${skyLabel}`;

  return (
    <div
      role="article"
      aria-label={ariaLabel}
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className={cn(
        'relative flex flex-col justify-between p-4 rounded-card shadow-card cursor-pointer',
        'h-[120px] max-h-[136px] overflow-hidden',
        'transition-all duration-150',
        'active:shadow-active',
        !reducedMotion && 'active:scale-[0.98]',
        'focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
        BG_MAP[variant],
        isPartner && 'ring-2 ring-[var(--color-partner-gold)]',
        highlighted && `border-l-[3px] ${BORDER_MAP[variant]}`,
        highlighted && !reducedMotion && 'animate-highlight-fade'
      )}
    >
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
          {t('venue.distance', { distance: distanceMeters })}
        </span>
        <span className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-secondary truncate min-w-0">
          {neighborhood}
        </span>
        {isPartner && (
          <span className="shrink-0 rounded-full border border-[var(--color-partner-gold)] bg-[var(--color-partner-gold-bg)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--color-partner-gold-dark)]">
            {t('partner.badge')}
          </span>
        )}
        <span className="ml-auto shrink-0">
          <SkyConditionBadge condition={skyCondition} size={16} />
        </span>
      </div>

      {/* Row 2: Venue name */}
      <div className="text-[length:var(--font-size-headline)] leading-[var(--line-height-headline)] font-semibold text-text-primary truncate">
        {venueName}
      </div>

      {/* Row 3: MiniTimeline */}
      <MiniTimeline
        sunWindows={sunWindows}
        variant="card"
      />

      {/* Row 4: Detail line + action */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[length:var(--font-size-body)] leading-[var(--line-height-body)] text-text-primary truncate">
          {detailText}
        </span>
        <Button
          onClick={handleDirections}
          aria-label={t('venue.directionsTo', { name: venueName })}
          className="ml-auto shrink-0 h-[var(--spacing-touch-comfortable)] rounded-button bg-brand-primary text-white hover:bg-brand-primary-dark px-4"
        >
          {t('venue.directions')}
        </Button>
      </div>
    </div>
  );
}
