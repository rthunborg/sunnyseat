'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { VenueCard, VenueCardSkeleton } from '@/components/composed/venue/VenueCard';
import type { VenueDataDto } from '@/lib/types/api';
import { cn } from '@/lib/utils';

export type VenueListMode = 'mobile' | 'desktop';

export type VenueListProps = {
  venues: VenueDataDto[];
  mode: VenueListMode;
  onSelectVenue: (venue: VenueDataDto) => void;
  isLoading?: boolean;
  animateCards?: boolean;
};

export function VenueList({
  venues,
  mode,
  onSelectVenue,
  isLoading = false,
  animateCards = false,
}: VenueListProps) {
  const t = useTranslations('venue.list');
  const sortedVenues = useMemo(() => sortVenuesForSunList(venues), [venues]);
  const compact = mode === 'desktop';

  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={t('loading')}
        className={cn('space-y-3', compact && 'space-y-2')}
      >
        {[0, 1, 2].map((item) => (
          <VenueCardSkeleton key={item} compact={compact} />
        ))}
      </div>
    );
  }

  if (sortedVenues.length === 0) {
    return (
      <p className="px-2 py-8 text-center text-body-sm text-text-body">
        {t('empty')}
      </p>
    );
  }

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {sortedVenues.map((venue, index) => {
        const sunTimeRange = resolveSunTimeRange(venue, t('sun'));
        return (
          <VenueCard
            key={venue.id}
            name={venue.venueName}
            sunTimeRange={sunTimeRange}
            confidencePercent={venue.confidence}
            distanceMeters={venue.distanceMeters}
            thumbnail={venue.thumbnail}
            isSunny={isVenueSunnyForList(venue)}
            compact={compact}
            staggerIndex={index}
            animateIn={animateCards}
            labels={{
              select: t('cardAria', {
                name: venue.venueName,
                sun: sunTimeRange ?? t('sunUnavailable'),
                confidence: formatConfidence(venue.confidence),
                distance: formatDistance(venue.distanceMeters),
              }),
              sun: t('sun'),
              photoPlaceholder: t('photoPlaceholder'),
              confidence: t('confidence'),
              distance: t('distance'),
              sunUnavailable: t('sunUnavailable'),
            }}
            onSelect={() => onSelectVenue(venue)}
          />
        );
      })}
    </div>
  );
}

export function sortVenuesForSunList(venues: VenueDataDto[]): VenueDataDto[] {
  return [...venues].sort((a, b) => {
    const sunDelta = Number(isVenueSunnyForList(b)) - Number(isVenueSunnyForList(a));
    if (sunDelta !== 0) return sunDelta;
    return (a.distanceMeters ?? Number.POSITIVE_INFINITY) -
      (b.distanceMeters ?? Number.POSITIVE_INFINITY);
  });
}

export function isVenueSunnyForList(venue: VenueDataDto): boolean {
  return venue.currentSunStatus === 'Sunny';
}

function resolveSunTimeRange(venue: VenueDataDto, sunLabel: string): string | undefined {
  if (!venue.sunWindow) return undefined;
  return `${sunLabel} ${venue.sunWindow.start}-${venue.sunWindow.end}`;
}

function formatDistance(meters?: number): string {
  if (!Number.isFinite(meters)) return '-';
  if ((meters ?? 0) >= 1000) return `${((meters ?? 0) / 1000).toFixed(1)} km`;
  return `${Math.round(meters ?? 0)} m`;
}

function formatConfidence(value?: number): number {
  return Number.isFinite(value) ? Math.round(value ?? 0) : 0;
}
