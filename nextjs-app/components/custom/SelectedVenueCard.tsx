'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SunExposureResult } from '@/lib/types/venue';
import type { SunStatus } from '@/lib/types/design-tokens';
import { VenuePhoto } from '@/components/ui/VenuePhoto';
import { SunTimeline } from '@/components/custom/SunTimeline';
import { selectVariant } from '@/lib/utils/selectVenueCardVariant';
import { useLanguage } from '@/lib/i18n';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SelectedVenueCardProps {
  venue: SunExposureResult | null;
  onMoreInfo: () => void;
  onDismiss: () => void;
  className?: string;
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

/**
 * Format today's opening hours from the venue's opening_hours JSONB.
 * Returns e.g. "11:00-22:00" or null if closed / unknown.
 */
function getTodayHours(hours: Record<string, string | null> | null | undefined): string | null {
  if (!hours) return null;
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayKey = days[new Date().getDay()];
  return hours[dayKey] ?? null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SelectedVenueCard — slides up from the bottom when a venue is selected on mobile.
 * Shows venue name, address, opening hours, status, and a SunTimeline bar.
 * Tapping "Mer info" opens the full detail profile.
 * Swiping down or pressing Escape dismisses.
 */
export function SelectedVenueCard({
  venue,
  onMoreInfo,
  onDismiss,
  className,
}: SelectedVenueCardProps) {
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();

  // Escape key dismisses
  useEffect(() => {
    if (!venue) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [venue, onDismiss]);

  const variant = useMemo(() => (venue ? selectVariant(venue) : 'shaded'), [venue]);

  const todayHours = useMemo(
    () => getTodayHours(venue?.venue.opening_hours),
    [venue?.venue.opening_hours],
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
      // Swipe down to dismiss: offset > 50px or high velocity
      if (info.offset.y > 50 || info.velocity.y > 300) {
        onDismiss();
      }
    },
    [onDismiss],
  );

  return (
    <AnimatePresence>
      {venue && (
        <motion.div
          key={venue.venue.id}
          data-testid="selected-venue-card"
          role="region"
          aria-label={`${venue.venue.name} — ${t(STATUS_LABEL_KEY[variant])}`}
          initial={reducedMotion ? { opacity: 0 } : { y: '100%' }}
          animate={reducedMotion ? { opacity: 1 } : { y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.4}
          onDragEnd={handleDragEnd}
          className={cn(
            'absolute inset-x-0 bottom-0 z-30',
            'rounded-t-2xl bg-white shadow-elevated',
            'touch-pan-x',
            className,
          )}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1" aria-hidden="true">
            <div className="h-1 w-10 rounded-full bg-gray-300" />
          </div>

          <div className="px-4 pb-4 space-y-3">
            {/* Top row: photo thumbnail + info */}
            <div className="flex gap-3">
              {/* Small photo */}
              <div className="w-16 shrink-0 rounded-lg overflow-hidden">
                <VenuePhoto
                  src={venue.venue.image_url}
                  venueName={venue.venue.name}
                  aspectRatio="square"
                  sizes="64px"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn('h-2.5 w-2.5 shrink-0 rounded-full', STATUS_DOT[variant])}
                    aria-hidden="true"
                  />
                  <h3 className="truncate text-base font-semibold text-text-primary" data-testid="selected-venue-name">
                    {venue.venue.name}
                  </h3>
                </div>

                {venue.venue.address && (
                  <p className="truncate text-sm text-text-muted mt-0.5" data-testid="selected-venue-address">
                    {venue.venue.address}
                  </p>
                )}

                {/* Opening hours */}
                <p className="text-sm text-text-muted mt-0.5" data-testid="selected-venue-hours">
                  {todayHours
                    ? t('selectedCard.openToday', { hours: todayHours })
                    : venue.venue.opening_hours
                      ? t('selectedCard.closed')
                      : null}
                </p>
              </div>
            </div>

            {/* Sun timeline */}
            <SunTimeline sunWindows={venue.windows} />

            {/* "Mer info" button */}
            <button
              type="button"
              onClick={onMoreInfo}
              data-testid="more-info-button"
              className={cn(
                'w-full rounded-xl py-2.5 text-sm font-semibold',
                'bg-brand-primary text-white',
                'active:scale-[0.98] transition-transform',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
              )}
            >
              {t('selectedCard.moreInfo')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
