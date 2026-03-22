'use client';

import { useMemo } from 'react';
import type { SunExposureResult } from '@/lib/types/venue';
import type { SunStatus } from '@/lib/types/design-tokens';
import { VenuePhoto } from '@/components/ui/VenuePhoto';
import { SunTimeline } from '@/components/custom/SunTimeline';
import { SkyConditionBadge } from '@/components/composed/SkyConditionBadge';
import { selectVariant } from '@/lib/utils/selectVenueCardVariant';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VenueProfileContentProps {
  venue: SunExposureResult;
  layout: 'mobile' | 'desktop';
  onDirections: () => void;
  onShare?: () => void;
  onClose?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_DOT: Record<SunStatus, string> = {
  sunny: 'bg-sun-sunny',
  partial: 'bg-sun-partial',
  shaded: 'bg-sun-shaded',
  upcoming: 'bg-sun-upcoming',
};

const STATUS_LABEL_KEY: Record<SunStatus, string> = {
  sunny: 'status.sunny',
  partial: 'status.partial',
  shaded: 'status.shaded',
  upcoming: 'status.upcoming',
};

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS_SV: Record<string, string> = {
  mon: 'Mån', tue: 'Tis', wed: 'Ons', thu: 'Tor', fri: 'Fre', sat: 'Lör', sun: 'Sön',
};
const DAY_LABELS_EN: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

function getTodayDayKey(): string {
  const jsDay = new Date().getDay(); // 0=Sun
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][jsDay];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * VenueProfileContent — shared content sections rendered inside both
 * the mobile VenueDetailProfile overlay and the desktop VenueDetailPanel.
 *
 * Sections: Hero photo → Name + address → Status → Opening hours →
 *           Sun forecast timeline → Action buttons
 */
export function VenueProfileContent({
  venue,
  layout,
  onDirections,
  onShare,
  onClose,
}: VenueProfileContentProps) {
  const { t, language } = useLanguage();
  const v = venue.venue;
  const variant = useMemo(() => selectVariant(venue), [venue]);
  const todayKey = getTodayDayKey();
  const dayLabels = language === 'sv' ? DAY_LABELS_SV : DAY_LABELS_EN;
  const isMobile = layout === 'mobile';

  return (
    <div data-testid="venue-profile-content" className="flex flex-col">
      {/* Hero photo */}
      <VenuePhoto
        src={v.image_url}
        venueName={v.name}
        aspectRatio="16:9"
        sizes={isMobile ? '100vw' : '480px'}
        priority
        className="w-full"
      />

      {/* Content body */}
      <div className={cn('flex flex-col gap-5 px-5 pt-4 pb-6', !isMobile && 'px-6')}>
        {/* Close button (desktop only — positioned top-right by wrapper) */}

        {/* Name + address + status */}
        <div>
          <div className="flex items-center gap-2">
            <span
              className={cn('h-3 w-3 shrink-0 rounded-full', STATUS_DOT[variant])}
              aria-hidden="true"
            />
            <span className="text-xs font-medium text-text-muted">
              {t(STATUS_LABEL_KEY[variant])}
            </span>
            {venue.weather?.sky_condition && venue.weather.sky_condition !== 'unavailable' && (
              <SkyConditionBadge condition={venue.weather.sky_condition} size={14} iconOnly />
            )}
          </div>
          <h2
            className="mt-1 text-xl font-bold text-text-primary"
            data-testid="profile-venue-name"
          >
            {v.name}
          </h2>
          {v.address && (
            <p className="mt-0.5 text-sm text-text-muted" data-testid="profile-venue-address">
              {v.address}
            </p>
          )}
          {v.neighborhood && (
            <p className="text-sm text-text-muted">{v.neighborhood}</p>
          )}
        </div>

        {/* Opening hours */}
        {v.opening_hours && (
          <section aria-label={t('selectedCard.openingHours')} data-testid="opening-hours-section">
            <h3 className="text-sm font-semibold text-text-primary mb-2">
              {t('selectedCard.openingHours')}
            </h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {DAY_KEYS.map((day) => {
                const isToday = day === todayKey;
                const hours = v.opening_hours?.[day];
                return (
                  <div key={day} className="contents">
                    <dt
                      className={cn(
                        'text-text-muted',
                        isToday && 'font-semibold text-text-primary',
                      )}
                    >
                      {dayLabels[day]}
                    </dt>
                    <dd
                      className={cn(
                        'text-text-muted',
                        isToday && 'font-semibold text-text-primary',
                      )}
                    >
                      {hours ?? t('selectedCard.closed')}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        )}

        {/* Sun forecast timeline */}
        <section aria-label={t('venueDetail.sunTimeline')} data-testid="sun-forecast-section">
          <h3 className="text-sm font-semibold text-text-primary mb-2">
            {t('venueDetail.sunTimeline')}
          </h3>
          <SunTimeline sunWindows={venue.windows} />
        </section>

        {/* Action buttons */}
        <div className="flex gap-3" data-testid="action-buttons">
          <button
            type="button"
            onClick={onDirections}
            aria-label={t('venue.directionsTo', { name: v.name })}
            data-testid="directions-button"
            className={cn(
              'flex-1 rounded-xl py-3 text-sm font-semibold',
              'bg-brand-primary text-white',
              'active:scale-[0.98] transition-transform',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
            )}
          >
            {t('venue.directions')}
          </button>
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              data-testid="share-button"
              className={cn(
                'rounded-xl px-5 py-3 text-sm font-semibold',
                'border border-gray-200 text-text-primary bg-white',
                'active:scale-[0.98] transition-transform',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              )}
            >
              {t('venueDetail.share')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
