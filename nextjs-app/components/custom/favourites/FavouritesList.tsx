'use client';

import { useTranslations } from 'next-intl';
import { VenueList } from '@/components/custom/venue/VenueList';
import type { VenueListSortMode } from '@/components/composed/venue/VenueListControls';
import type { SunFreshnessMeta, VenueDataDto } from '@/lib/types/api';

type FavouritesListProps = {
  favouriteIds: readonly string[];
  venues: VenueDataDto[];
  mode: 'mobile' | 'desktop';
  onSelectVenue: (venue: VenueDataDto) => void;
  onFavouriteToggle: (venue: VenueDataDto) => void;
  isFavourite: (id: string) => boolean;
  sortMode: VenueListSortMode;
  confidenceMeta?: SunFreshnessMeta;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => unknown;
  animateCards?: boolean;
  compactCards?: boolean;
};

export function FavouritesList({
  favouriteIds,
  venues,
  mode,
  onSelectVenue,
  onFavouriteToggle,
  isFavourite,
  confidenceMeta,
  isLoading = false,
  isError = false,
  onRetry,
  animateCards = false,
  compactCards,
}: FavouritesListProps) {
  const t = useTranslations('favourites');
  const favouriteIdSet = new Set(favouriteIds);
  const visibleVenues = venues.filter((venue) => favouriteIdSet.has(venue.id));

  if (isError && !isLoading) {
    return (
      <div
        role="alert"
        className="mx-2 rounded-card bg-surface-cream px-4 py-3 text-body-sm text-text-body shadow-card"
      >
        <p>{t('loadFailed')}</p>
        {onRetry && (
          <button
            type="button"
            onClick={() => {
              void onRetry();
            }}
            className="mt-2 min-h-11 rounded-pill px-4 text-label-lg text-amber-dark outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          >
            {t('retry')}
          </button>
        )}
      </div>
    );
  }

  if (favouriteIds.length === 0 && !isLoading) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-body-sm text-text-body">{t('empty')}</p>
      </div>
    );
  }

  if (!isLoading && visibleVenues.length === 0) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-body-sm text-text-body">{t('empty')}</p>
      </div>
    );
  }

  return (
    <VenueList
      venues={visibleVenues}
      mode={mode}
      sortMode="sun"
      confidenceMeta={confidenceMeta}
      isLoading={isLoading}
      animateCards={animateCards}
      compactCards={compactCards}
      onSelectVenue={onSelectVenue}
      onFavouriteToggle={onFavouriteToggle}
      isFavourite={isFavourite}
    />
  );
}
