'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { VenueCard, VenueCardSkeleton } from '@/components/composed/venue/VenueCard';
import type { VenueListSortMode } from '@/components/composed/venue/VenueListControls';
import type { SunFreshnessMeta, VenueDataDto } from '@/lib/types/api';
import { getConfidenceDisplayState } from '@/lib/utils/confidence-display';
import { getVenueVisualMetadata } from '@/lib/utils/venue-visual-metadata';
import { cn } from '@/lib/utils';

export type VenueListMode = 'mobile' | 'desktop';

export type VenueListProps = {
  venues: VenueDataDto[];
  mode: VenueListMode;
  onSelectVenue: (venue: VenueDataDto) => void;
  isLoading?: boolean;
  animateCards?: boolean;
  sortMode?: VenueListSortMode;
  compactCards?: boolean;
  confidenceMeta?: SunFreshnessMeta;
  showVisibleConfidence?: boolean;
  /**
   * Story 9.5 AC3: when the origin is the Gothenburg-centrum fallback (no real
   * personal fix), the distances are centrum-relative, not from the user. The
   * card then annotates each distance "≈ från centrum" so the number is honest
   * rather than implying a true personal distance. The real value is never
   * hidden — only the label changes.
   */
  locationIsApproximate?: boolean;
  onFavouriteToggle?: (venue: VenueDataDto) => void;
  isFavourite?: (id: string) => boolean;
};

export function VenueList({
  venues,
  mode,
  onSelectVenue,
  isLoading = false,
  animateCards = false,
  sortMode = 'sun',
  compactCards,
  confidenceMeta,
  showVisibleConfidence = true,
  locationIsApproximate = false,
  onFavouriteToggle,
  isFavourite,
}: VenueListProps) {
  const t = useTranslations('venue.list');
  const locale = useLocale();
  const sortedVenues = useMemo(() => sortVenuesForList(venues, sortMode), [venues, sortMode]);
  const compact = compactCards ?? mode === 'desktop';

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
        const confidenceDisplay = getConfidenceDisplayState({
          confidence: venue.confidence,
          meta: confidenceMeta,
          labels: {
            confidence: t('confidence'),
            approximate: t('confidenceApproximate'),
            unavailable: t('confidenceUnavailable'),
          },
        });
        return (
          <VenueCard
            key={venue.id}
            name={venue.venueName}
            neighborhood={venue.neighborhood}
            sunTimeRange={sunTimeRange}
            confidencePercent={venue.confidence}
            confidenceMeta={confidenceMeta}
            distanceMeters={venue.distanceMeters}
            distanceIsApproximate={locationIsApproximate}
            sunExposurePercent={venue.sunExposurePercent}
            thumbnail={venue.thumbnail}
            isSunny={isVenueSunnyForList(venue)}
            visualMetadata={getVenueVisualMetadata(venue, locale)}
            compact={compact}
            showVisibleConfidence={showVisibleConfidence}
            staggerIndex={index}
            animateIn={animateCards}
            labels={{
              select: t('cardAria', {
                name: venue.venueName,
                sun: sunTimeRange ?? t('sunUnavailable'),
                confidence: confidenceDisplay.accessibleText,
                distance: formatDistance(venue.distanceMeters),
              }),
              favourite: t('favourite', { name: venue.venueName }),
              favouriteAdd: t('favouriteAdd'),
              favouriteRemove: t('favouriteRemove'),
              sun: t('sun'),
              photoPlaceholder: t('photoPlaceholder'),
              confidence: t('confidence'),
              confidenceApproximate: t('confidenceApproximate'),
              confidenceUnavailable: t('confidenceUnavailable'),
              distance: t('distance'),
              distanceApproximate: t('distanceApproximate'),
              sunUnavailable: t('sunUnavailable'),
              statusMostlyShade: t('statusMostlyShade'),
              statusFullSun: t('statusFullSun'),
              statusPartialSun: t('statusPartialSun'),
            }}
            isFavourite={isFavourite?.(venue.id) ?? false}
            onFavouriteToggle={onFavouriteToggle ? () => onFavouriteToggle(venue) : undefined}
            onSelect={() => onSelectVenue(venue)}
          />
        );
      })}
    </div>
  );
}

export function sortVenuesForSunList(venues: VenueDataDto[]): VenueDataDto[] {
  return sortVenuesForList(venues, 'sun');
}

export function sortVenuesForList(
  venues: VenueDataDto[],
  sortMode: VenueListSortMode,
): VenueDataDto[] {
  return [...venues].sort((a, b) => {
    if (sortMode === 'distance') {
      return sortableDistance(a.distanceMeters) - sortableDistance(b.distanceMeters);
    }
    const sunDelta = getVenueSunRankForList(b) - getVenueSunRankForList(a);
    if (sunDelta !== 0) return sunDelta;
    return sortableDistance(a.distanceMeters) - sortableDistance(b.distanceMeters);
  });
}

export function isVenueSunnyForList(venue: VenueDataDto): boolean {
  return getVenueSunRankForList(venue) > 0;
}

export function getVenueSunRankForList(venue: VenueDataDto): number {
  switch (venue.currentSunStatus) {
    case 'Sunny':
      return 2;
    case 'Partial':
      return 1;
    default:
      return 0;
  }
}

function resolveSunTimeRange(venue: VenueDataDto, sunLabel: string): string | undefined {
  if (!venue.sunWindow) return undefined;
  return `${sunLabel} ${venue.sunWindow.start}-${venue.sunWindow.end}`;
}

function sortableDistance(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : Number.POSITIVE_INFINITY;
}

function formatDistance(meters?: number): string {
  if (!Number.isFinite(meters)) return '-';
  if ((meters ?? 0) >= 1000) return `${((meters ?? 0) / 1000).toFixed(1)} km`;
  return `${Math.round(meters ?? 0)} m`;
}
