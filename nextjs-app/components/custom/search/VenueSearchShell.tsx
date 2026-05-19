'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Navigation, Settings } from 'lucide-react';
import {
  VenueSearchCombobox,
  type VenueSearchComboboxLabels,
} from '@/components/composed/search/VenueSearchCombobox';
import { useVenueSearch } from '@/hooks/queries/useVenueSearch';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapInstance } from '@/lib/contexts/MapInstanceContext';
import { useMapSelection } from '@/lib/contexts/MapSelectionContext';
import { DURATION_FLY_MS } from '@/lib/constants/animation';
import type { VenueDataDto } from '@/lib/types/api';
import { cn } from '@/lib/utils';

const SEARCH_RADIUS_KM = 1.5;
const MAX_QUERY_LENGTH = 80;
const SEARCH_DEBOUNCE_MS = 200;

export type VenueSearchShellProps = {
  variant: 'mobile' | 'desktop';
  onSearchFocus?: () => void;
  onVenueSelected?: () => void;
  className?: string;
};

export function VenueSearchShell({
  variant,
  onSearchFocus,
  onVenueSelected,
  className,
}: VenueSearchShellProps) {
  const t = useTranslations('venue.search');
  const tNav = useTranslations('common.nav');
  const [query, setQuery] = useState('');
  const geolocation = useGeolocation();
  const { mapInstance } = useMapInstance();
  const { selectVenue } = useMapSelection();
  const trimmedQuery = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState(trimmedQuery);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [trimmedQuery]);

  const venueQuery = useVenueSearch({
    lat: geolocation.coords.lat,
    lng: geolocation.coords.lng,
    radiusKm: SEARCH_RADIUS_KM,
    q: debouncedQuery || undefined,
  });
  const venues = Array.isArray(venueQuery.data?.venues) ? venueQuery.data.venues : [];
  const labels: VenueSearchComboboxLabels = {
    label: t('label'),
    placeholder: t('placeholder'),
    clear: t('clear'),
    loading: t('loading'),
    error: t('error'),
    noResults: (value) => t('noResults', { query: value }),
    resultCount: (count) => t('resultCount', { count }),
  };

  const handleSelectVenue = (venue: VenueDataDto) => {
    selectVenue(venue.id, venue);
    if (mapInstance && hasValidVenueLocation(venue)) {
      mapInstance.easeTo({
        center: [venue.location.lng, venue.location.lat],
        duration: DURATION_FLY_MS,
      });
    }
    setQuery('');
    onVenueSelected?.();
  };

  if (variant === 'mobile') {
    return (
      <div className={cn('flex items-start gap-2 lg:hidden', className)}>
        <VenueSearchCombobox
          venues={venues}
          query={query}
          onQueryChange={setQuery}
          onSelectVenue={handleSelectVenue}
          onSearchFocus={onSearchFocus}
          labels={labels}
          variant="mobile"
          isLoading={venueQuery.isFetching && debouncedQuery.length > 0}
          error={venueQuery.isError && trimmedQuery.length > 0 ? labels.error : undefined}
          filterResults={false}
          maxLength={MAX_QUERY_LENGTH}
          className="min-w-0 flex-1"
        />
        <button
          type="button"
          aria-label={tNav('myLocation')}
          onClick={geolocation.requestLocation}
          className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-glass-standard text-text-primary shadow-button-float backdrop-blur-standard outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        >
          <Navigation aria-hidden="true" className="size-5" />
        </button>
        <button
          type="button"
          aria-label={t('settings')}
          disabled
          className="flex size-11 shrink-0 cursor-not-allowed items-center justify-center rounded-pill bg-glass-standard text-text-primary opacity-60 shadow-button-float backdrop-blur-standard outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        >
          <Settings aria-hidden="true" className="size-5" />
        </button>
      </div>
    );
  }

  return (
    <VenueSearchCombobox
      venues={venues}
      query={query}
      onQueryChange={setQuery}
      onSelectVenue={handleSelectVenue}
      onSearchFocus={onSearchFocus}
      labels={labels}
      variant="desktop"
      isLoading={venueQuery.isFetching && debouncedQuery.length > 0}
      error={venueQuery.isError && trimmedQuery.length > 0 ? labels.error : undefined}
      filterResults={false}
      maxLength={MAX_QUERY_LENGTH}
      className={cn('w-search-desktop', className)}
    />
  );
}

function hasValidVenueLocation(venue: VenueDataDto): boolean {
  return Number.isFinite(venue.location?.lat) && Number.isFinite(venue.location?.lng);
}
