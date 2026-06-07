'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { VenueCard, VenueCardSkeleton } from '@/components/composed/venue/VenueCard';
import type { VenueListSortMode } from '@/components/composed/venue/VenueListControls';
import type { SunFreshnessMeta, VenueDataDto } from '@/lib/types/api';
import { getConfidenceDisplayState } from '@/lib/utils/confidence-display';
import type { PredictionUncertaintyDisplayLabels } from '@/lib/utils/prediction-uncertainty-display';
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
  onFavouriteToggle,
  isFavourite,
}: VenueListProps) {
  const t = useTranslations('venue.list');
  const tVenue = useTranslations('venue');
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
            sunExposurePercent={venue.sunExposurePercent}
            predictionUncertainty={venue.predictionUncertainty}
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
              sunUnavailable: t('sunUnavailable'),
              statusMostlyShade: t('statusMostlyShade'),
              statusFullSun: t('statusFullSun'),
              statusPartialSun: t('statusPartialSun'),
              uncertainty: predictionUncertaintyLabels(tVenue),
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

function predictionUncertaintyLabels(
  t: ReturnType<typeof useTranslations<'venue'>>,
): PredictionUncertaintyDisplayLabels {
  return {
    description: t('uncertainty.description'),
    accessible: t('uncertainty.accessible', {
      label: '{label}',
      description: '{description}',
    }),
    levels: {
      low: t('uncertainty.levels.low'),
      medium: t('uncertainty.levels.medium'),
      high: t('uncertainty.levels.high'),
    },
    short: {
      building_shadow_coverage: t('uncertainty.short.building_shadow_coverage'),
      obstruction: t('uncertainty.short.obstruction'),
      weather: t('uncertainty.short.weather'),
      other: t('uncertainty.short.other'),
    },
    reasons: {
      building_shadow_coverage: t('uncertainty.reasons.building_shadow_coverage'),
      vegetation: t('uncertainty.reasons.vegetation'),
      awning: t('uncertainty.reasons.awning'),
      umbrella: t('uncertainty.reasons.umbrella'),
      bridge: t('uncertainty.reasons.bridge'),
      temporary_structure: t('uncertainty.reasons.temporary_structure'),
      seasonal_furniture: t('uncertainty.reasons.seasonal_furniture'),
      weather: t('uncertainty.reasons.weather'),
      other: t('uncertainty.reasons.other'),
    },
  };
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
