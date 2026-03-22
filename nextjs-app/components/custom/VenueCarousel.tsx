'use client';

import { useCallback, useRef, useEffect } from 'react';
import type { SunExposureResult } from '@/lib/types/venue';
import type { SunStatus } from '@/lib/types/design-tokens';
import { VenuePhotoCard } from '@/components/custom/VenuePhotoCard';
import { VenueCardSkeleton } from '@/components/custom/VenueCardSkeleton';
import { groupVenuesByStatus } from '@/lib/utils/groupVenuesByStatus';
import { selectVariant } from '@/lib/utils/selectVenueCardVariant';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VenueCarouselProps {
  venues: SunExposureResult[];
  selectedVenueId: string | null;
  isLoading?: boolean;
  onVenueSelect: (venueId: string) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Status group label i18n keys
// ---------------------------------------------------------------------------

const STATUS_LABEL_KEY: Record<SunStatus, string> = {
  sunny: 'status.sunny',
  partial: 'status.partial',
  upcoming: 'status.upcoming',
  shaded: 'status.shaded',
};

const STATUS_DOT: Record<SunStatus, string> = {
  sunny: 'bg-sun-sunny',
  partial: 'bg-sun-partial',
  upcoming: 'bg-sun-upcoming',
  shaded: 'bg-sun-shaded',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * VenueCarousel — horizontal scrollable card strip pinned at the bottom
 * of the mobile viewport. Groups cards by sun status (sunny first).
 * Syncs with map selection: tapping a card fires onVenueSelect, and
 * external selection scrolls the matching card into view.
 */
export function VenueCarousel({
  venues,
  selectedVenueId,
  isLoading = false,
  onVenueSelect,
  className,
}: VenueCarouselProps) {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Group venues for display
  const groups = groupVenuesByStatus(venues);

  // Scroll to selected card when selection changes (e.g. marker tap)
  useEffect(() => {
    if (!selectedVenueId) return;
    const card = cardRefs.current.get(selectedVenueId);
    const container = scrollRef.current;
    if (!card || !container) return;

    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const scrollLeft =
      card.offsetLeft - container.offsetLeft - containerRect.width / 2 + cardRect.width / 2;

    container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
  }, [selectedVenueId]);

  const registerCard = useCallback((venueId: string, el: HTMLElement | null) => {
    if (el) cardRefs.current.set(venueId, el);
    else cardRefs.current.delete(venueId);
  }, []);

  // Handle keyboard navigation within the carousel
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, venueId: string, index: number, allIds: string[]) => {
      let targetIndex = -1;
      if (e.key === 'ArrowRight') targetIndex = Math.min(index + 1, allIds.length - 1);
      if (e.key === 'ArrowLeft') targetIndex = Math.max(index - 1, 0);

      if (targetIndex >= 0 && targetIndex !== index) {
        e.preventDefault();
        const targetId = allIds[targetIndex];
        const targetEl = cardRefs.current.get(targetId);
        if (targetEl) {
          (targetEl.querySelector('[data-testid="venue-photo-card"]') as HTMLElement)?.focus();
        }
        onVenueSelect(targetId);
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onVenueSelect(venueId);
      }
    },
    [onVenueSelect],
  );

  // Build flat list of venue IDs for keyboard navigation
  const allVenueIds = groups.flatMap((g) => g.venues.map((v) => v.venue.id));

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide',
          className,
        )}
        data-testid="venue-carousel"
        aria-label={t('carousel.loading')}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-40 shrink-0">
            <VenueCardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (venues.length === 0) {
    return null; // Parent handles empty state
  }

  return (
    <div
      ref={scrollRef}
      role="listbox"
      aria-label={t('carousel.label')}
      data-testid="venue-carousel"
      className={cn(
        'flex items-end gap-3 overflow-x-auto px-4 py-3',
        'scroll-smooth snap-x snap-mandatory',
        'scrollbar-hide',
        className,
      )}
    >
      {groups.map((group) => (
        <div key={group.status} role="group" aria-label={t(STATUS_LABEL_KEY[group.status])} className="contents">
          {/* Status group separator dot (visible between groups) */}
          {group.status !== groups[0].status && (
            <div className="flex shrink-0 items-center px-1" aria-hidden="true">
              <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[group.status])} />
            </div>
          )}

          {group.venues.map((venue) => {
            const venueId = venue.venue.id;
            const variant = selectVariant(venue);
            const flatIndex = allVenueIds.indexOf(venueId);

            return (
              <div
                key={venueId}
                ref={(el) => registerCard(venueId, el)}
                className="snap-center"
                role="option"
                aria-selected={selectedVenueId === venueId}
              >
                <VenuePhotoCard
                  venueId={venueId}
                  venueName={venue.venue.name}
                  neighborhood={venue.venue.neighborhood}
                  imageUrl={venue.venue.image_url}
                  sunStatus={variant}
                  distanceMeters={venue.distance_meters}
                  isPartner={venue.venue.is_partner}
                  highlighted={selectedVenueId === venueId}
                  variant="carousel"
                  onClick={() => onVenueSelect(venueId)}
                  onKeyDown={(e) => handleKeyDown(e, venueId, flatIndex, allVenueIds)}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
