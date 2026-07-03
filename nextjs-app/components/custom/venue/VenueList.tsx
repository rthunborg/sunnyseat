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
        const isObscured = venue.currentSunStatus === 'CloudObscured';
        const confidenceDisplay = getConfidenceDisplayState({
          confidence: venue.confidence,
          meta: confidenceMeta,
          labels: {
            confidence: t('confidence'),
            approximate: t('confidenceApproximate'),
            unavailable: t('confidenceUnavailable'),
          },
        });
        // Story 10.2 (AC4 — obscured phrase EXACTLY once): the obscured card's
        // accessible name is built HERE in ONE place via `cardAriaObscured`
        // (which folds in "sol bakom moln just nu") rather than the plain
        // `cardAria` + an sr-only repeat. Non-obscured cards keep `cardAria`.
        const selectLabel = isObscured
          ? t('cardAriaObscured', {
              name: venue.venueName,
              sun: sunTimeRange ?? t('sunUnavailable'),
              distance: formatDistance(venue.distanceMeters),
            })
          : t('cardAria', {
              name: venue.venueName,
              sun: sunTimeRange ?? t('sunUnavailable'),
              confidence: confidenceDisplay.accessibleText,
              distance: formatDistance(venue.distanceMeters),
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
            isObscured={isObscured}
            visualMetadata={getVenueVisualMetadata(venue, locale)}
            compact={compact}
            showVisibleConfidence={showVisibleConfidence}
            staggerIndex={index}
            animateIn={animateCards}
            labels={{
              select: selectLabel,
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
              statusObscured: t('statusObscured'),
              obscuredPosition: t('obscuredPosition', { percent: '{percent}' }),
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
  // Story 10.2: "amber-sunny" is the geometric sunny/partial tier ONLY. A
  // CloudObscured venue is NOT amber (its rank is derived from solläge below,
  // not the fixed Sunny/Partial rungs), so this stays false for obscured and
  // the card's amber-vs-muted decision is driven off the separate obscured
  // signal, not this predicate.
  if (venue.currentSunStatus === 'CloudObscured') return false;
  return getVenueSunRankForList(venue) > 0;
}

export function getVenueSunRankForList(venue: VenueDataDto): number {
  switch (venue.currentSunStatus) {
    case 'Sunny':
      return 2;
    case 'Partial':
      return 1;
    // Story 10.2 (AC2 + the 10.1 hand-off): a weather-gated CloudObscured
    // venue is geometrically Sunny/Partial underneath, but that tier is not
    // recoverable from `currentSunStatus` once gated. Rank it by the honest
    // geometric solläge (`sunExposurePercent`) that survives the gate, mapped
    // into the same [0, 2] ordering space as Sunny(2)/Partial(1)/Shaded(0):
    // rank = (sunExposurePercent / 100) * 2. So a 95%-solläge obscured venue
    // (→ 1.9) out-ranks a Partial (1) — "Mest sol" still ranks by solläge
    // under an overcast sky — while a low-solläge obscured venue sinks toward
    // Shaded. Non-obscured ordering is unchanged (byte-identical clear-sky
    // list). Assert RELATIVE ordering only (epic-10 re-tune-survives convention).
    case 'CloudObscured': {
      const percent = Number.isFinite(venue.sunExposurePercent)
        ? Math.max(0, Math.min(100, venue.sunExposurePercent))
        : 0;
      return (percent / 100) * 2;
    }
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
