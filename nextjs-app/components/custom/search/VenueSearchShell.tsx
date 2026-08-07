'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Navigation, Settings } from 'lucide-react';
import {
  VenueSearchCombobox,
  type VenueSearchComboboxLabels,
} from '@/components/composed/search/VenueSearchCombobox';
import { useVenueSearch } from '@/hooks/queries/useVenueSearch';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapInstance } from '@/lib/contexts/MapInstanceContext';
import { useMapSelection } from '@/lib/contexts/MapSelectionContext';
import { useSettings } from '@/lib/contexts/SettingsContext';
import { useTimeContext } from '@/lib/contexts/TimeContext';
import { usePathname, useRouter } from '@/i18n/navigation';
import { DURATION_FLY_MS } from '@/lib/constants/animation';
import type { VenueDataDto } from '@/lib/types/api';
import {
  getVenueAvailabilityAt,
  type VenueAvailabilityState,
} from '@/lib/utils/opening-hours';
import { stockholmInstantFromDateTime } from '@/lib/utils/time-planner';
import { venuePlannerQueryArgs } from '@/lib/utils/venue-query-planner';
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
  const searchParams = useSearchParams();
  const forcedVisualSearch = initialForcedSearchQuery(searchParams);
  const [query, setQuery] = useState(forcedVisualSearch);
  const geolocation = useGeolocation();
  const { mapInstance } = useMapInstance();
  const { selectVenue } = useMapSelection();
  const { openSettings } = useSettings();
  const plannerTime = useTimeContext();
  const router = useRouter();
  const pathname = usePathname();
  const trimmedQuery = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState(trimmedQuery);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [trimmedQuery]);

  // External-review fix (R-001): derive the planner args via the SHARED
  // `venuePlannerQueryArgs` (same shape MapView + DesktopNavBar pass) so this
  // search query keys IDENTICALLY on live-today and never flips `list`→`planner`
  // on the first scrub away from live (which would fire a hidden /api/venues
  // request mid-scrub). The raw `plannerQuery` is undefined on live-today.
  const plannerArgs = venuePlannerQueryArgs({
    isLiveNow: plannerTime.isLiveNow,
    plannerQuery: plannerTime.plannerQuery,
    selectedDate: plannerTime.selectedDate,
    selectedTime: plannerTime.selectedTime,
  });
  const venueQuery = useVenueSearch({
    lat: geolocation.coords.lat,
    lng: geolocation.coords.lng,
    radiusKm: SEARCH_RADIUS_KM,
    q: debouncedQuery || undefined,
    ...plannerArgs,
  });
  const isDebouncingSearch = trimmedQuery.length > 0 && trimmedQuery !== debouncedQuery;
  const queriedVenues = !isDebouncingSearch && Array.isArray(venueQuery.data?.venues)
    ? venueQuery.data.venues
    : [];
  const selectedInstant = useMemo(
    () =>
      stockholmInstantFromDateTime(plannerTime.selectedDate, plannerTime.selectedTime) ??
      plannerTime.currentTime,
    [plannerTime.currentTime, plannerTime.selectedDate, plannerTime.selectedTime],
  );
  const availabilityByVenueId = useMemo<Record<string, VenueAvailabilityState>>(() => {
    const entries = queriedVenues.map((venue) => [
      venue.id,
      getVenueAvailabilityAt(venue.openingHours, selectedInstant).state,
    ] as const);
    return Object.fromEntries(entries) as Record<string, VenueAvailabilityState>;
  }, [queriedVenues, selectedInstant]);
  const normalizedQuery = normalizeSearchText(trimmedQuery);
  const venues = useMemo(
    () =>
      queriedVenues.filter((venue) => {
        const availability = availabilityByVenueId[venue.id];
        if (availability !== 'closed') return true;
        return normalizedQuery.length > 0 &&
          normalizeSearchText(venue.venueName) === normalizedQuery;
      }),
    [availabilityByVenueId, normalizedQuery, queriedVenues],
  );
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
    if (availabilityByVenueId[venue.id] === 'closed') {
      const slug = venueDetailSlug(venue);
      if (!slug) return;
      router.push({
        pathname,
        query: {
          ...queryWithout(searchParams, ['venue', '_state']),
          venue: slug,
        },
      });
      setQuery('');
      onVenueSelected?.();
      return;
    }
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
          isLoading={trimmedQuery.length > 0 && (isDebouncingSearch || venueQuery.isFetching)}
          error={venueQuery.isError && trimmedQuery.length > 0 ? labels.error : undefined}
          filterResults={false}
          availabilityByVenueId={availabilityByVenueId}
          closedAtSelectedTimeLabel={t('closedAtSelectedTime')}
          maxLength={MAX_QUERY_LENGTH}
          className="min-w-0 flex-1"
        />
        {/* Story 9.6: this is the single surviving mobile locate control (the
            floating MapControls duplicate was removed). Story 9.5 AC4(a)'s
            locate-reliability feedback was RELOCATED here from that removed
            button: `pending` sets `aria-busy` + pulses the icon; `fallback`
            (denied / timeout / unavailable) is surfaced via `data-locate-state`
            while the button stays clickable so the user can re-request instead
            of silently sitting on the centrum fallback. The success fly-to still
            lives in MapControls' shared effect (same `useGeolocation` context). */}
        <button
          type="button"
          aria-label={tNav('myLocation')}
          aria-busy={geolocation.status === 'pending' || undefined}
          data-locate-state={geolocation.status}
          data-testid="search-shell-my-location"
          onClick={geolocation.requestLocation}
          className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-glass-standard text-text-primary shadow-button-float backdrop-blur-standard outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        >
          <Navigation
            aria-hidden="true"
            className={cn(
              'size-5',
              geolocation.status === 'pending' && 'motion-safe:animate-pulse',
            )}
          />
        </button>
        <button
          type="button"
          aria-label={t('settings')}
          data-testid="search-shell-settings"
          onClick={openSettings}
          className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-glass-standard text-text-primary shadow-button-float backdrop-blur-standard outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
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
      isLoading={trimmedQuery.length > 0 && (isDebouncingSearch || venueQuery.isFetching)}
      error={venueQuery.isError && trimmedQuery.length > 0 ? labels.error : undefined}
      filterResults={false}
      availabilityByVenueId={availabilityByVenueId}
      closedAtSelectedTimeLabel={t('closedAtSelectedTime')}
      maxLength={MAX_QUERY_LENGTH}
      className={cn('w-search-desktop', className)}
    />
  );
}

function hasValidVenueLocation(venue: VenueDataDto): boolean {
  return Number.isFinite(venue.location?.lat) && Number.isFinite(venue.location?.lng);
}

function initialForcedSearchQuery(params: Pick<URLSearchParams, 'get'> | null): string {
  if (process.env.NODE_ENV === 'production') return '';
  if (!params) return '';
  if (params.get('_state') !== 'map-selected-time-closed') return '';
  const raw = params.get('_search') ?? '';
  return Array.from(raw.trim()).slice(0, MAX_QUERY_LENGTH).join('');
}

function venueDetailSlug(venue: Pick<VenueDataDto, 'slug' | 'venueSlug'>): string | null {
  const slug = (venue.slug || venue.venueSlug || '').trim();
  if (!slug || /[\u0000-\u001F\u007F-\u009F]/u.test(slug)) return null;
  return slug;
}

function queryWithout(
  params: Pick<URLSearchParams, 'forEach'>,
  excludedKeys: string[],
): Record<string, string | string[]> {
  const excluded = new Set(excludedKeys);
  const query: Record<string, string | string[]> = {};

  params.forEach((value, key) => {
    if (excluded.has(key)) return;
    const current = query[key];
    if (current === undefined) {
      query[key] = value;
      return;
    }
    query[key] = Array.isArray(current) ? [...current, value] : [current, value];
  });

  return query;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('sv-SE');
}
