'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Command } from 'cmdk';
import * as m from 'motion/react-m';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Clock, Search, X } from 'lucide-react';
import {
  DURATION_DEFAULT_S,
  DURATION_FAST_S,
  EASE_ENTER,
  EASE_EXIT,
} from '@/lib/constants/animation';
import type { VenueDataDto } from '@/lib/types/api';
import type { VenueAvailabilityState } from '@/lib/utils/opening-hours';
import { cn } from '@/lib/utils';

export type VenueSearchComboboxLabels = {
  label: string;
  placeholder: string;
  clear: string;
  loading: string;
  error: string;
  noResults: (query: string) => string;
  resultCount: (count: number) => string;
};

export type VenueSearchComboboxProps = {
  venues: VenueDataDto[];
  query: string;
  onQueryChange: (query: string) => void;
  onSelectVenue: (venue: VenueDataDto) => void;
  onSearchFocus?: () => void;
  labels: VenueSearchComboboxLabels;
  variant: 'mobile' | 'desktop';
  isLoading?: boolean;
  error?: string;
  filterResults?: boolean;
  availabilityByVenueId?: Record<string, VenueAvailabilityState>;
  closedAtSelectedTimeLabel?: string;
  maxLength?: number;
  className?: string;
};

export function VenueSearchCombobox({
  venues,
  query,
  onQueryChange,
  onSelectVenue,
  onSearchFocus,
  labels,
  variant,
  isLoading = false,
  error,
  filterResults = true,
  availabilityByVenueId,
  closedAtSelectedTimeLabel,
  maxLength,
  className,
}: VenueSearchComboboxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const [hasHydrated, setHasHydrated] = useState(false);
  const shouldReduceMotion = hasHydrated && prefersReducedMotion === true;
  const trimmedQuery = query.trim();
  const [open, setOpen] = useState(() => trimmedQuery.length > 0);
  const visibleVenues = useMemo(
    () => (filterResults ? filterVenuesForQuery(venues, trimmedQuery) : venues),
    [filterResults, trimmedQuery, venues],
  );
  const shouldShowResults = open && trimmedQuery.length > 0;

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (!target || rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (!target || rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  const handleSelectVenue = (venue: VenueDataDto) => {
    setOpen(false);
    inputRef.current?.blur();
    onSelectVenue(venue);
  };

  const handleClear = () => {
    onQueryChange('');
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <Command
      ref={rootRef}
      label={labels.label}
      shouldFilter={false}
      role="search"
      aria-label={labels.label}
      className={cn('relative text-text-primary', className)}
    >
      <div
        className={cn(
          'flex min-h-11 items-center gap-2 rounded-pill bg-surface-muted px-4 text-body-sm text-text-body shadow-subtle',
          'focus-within:ring-2 focus-within:ring-text-primary',
          variant === 'mobile' && 'bg-glass-standard backdrop-blur-standard shadow-button-float',
        )}
      >
        <Search aria-hidden="true" className="size-5 shrink-0 text-text-muted" />
        <Command.Input
          ref={inputRef}
          value={query}
          onValueChange={(nextQuery) => {
            const boundedQuery = maxLength === undefined
              ? nextQuery
              : Array.from(nextQuery).slice(0, maxLength).join('');
            onQueryChange(boundedQuery);
            setOpen(boundedQuery.trim().length > 0);
          }}
          onFocus={() => {
            onSearchFocus?.();
            if (trimmedQuery.length > 0) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          aria-label={labels.label}
          placeholder={labels.placeholder}
          maxLength={maxLength}
          className="min-h-11 min-w-0 flex-1 bg-transparent text-body-sm text-text-body outline-none placeholder:text-text-muted"
        />
        {query.length > 0 && (
          <button
            type="button"
            aria-label={labels.clear}
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleClear}
            className="flex size-11 shrink-0 items-center justify-center rounded-pill text-text-body outline-none transition-colors duration-fast ease-default hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-text-primary"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      <m.div
        aria-hidden={!shouldShowResults}
        initial={false}
        animate={
          shouldShowResults
            ? { display: 'block', opacity: 1, y: 0 }
            : {
                opacity: 0,
                y: shouldReduceMotion ? 0 : -4,
                transitionEnd: { display: 'none' },
              }
        }
        transition={{
          duration: shouldReduceMotion ? DURATION_FAST_S : DURATION_DEFAULT_S,
          ease: shouldShowResults ? EASE_ENTER : EASE_EXIT,
        }}
        className="absolute left-0 right-0 top-full z-glass-panel mt-2 overflow-hidden rounded-card border border-divider bg-surface-cream shadow-card"
      >
        <Command.List
          data-testid="venue-search-results"
          data-reduced-motion={String(shouldReduceMotion)}
          aria-label={labels.resultCount(visibleVenues.length)}
          className="max-h-72 overflow-y-auto p-2"
        >
          {shouldShowResults && isLoading && (
            <div
              role="status"
              className="px-3 py-3 text-body-sm text-text-muted"
            >
              {labels.loading}
            </div>
          )}
          {shouldShowResults && !isLoading && error && (
            <div
              role="alert"
              className="px-3 py-3 text-body-sm text-error"
            >
              {error}
            </div>
          )}
          {shouldShowResults && !isLoading && !error && visibleVenues.length === 0 && (
            <Command.Empty className="px-3 py-3 text-body-sm text-text-body">
              {labels.noResults(trimmedQuery)}
            </Command.Empty>
          )}
          {shouldShowResults && !isLoading && !error && visibleVenues.map((venue) => {
            const isClosed = availabilityByVenueId?.[venue.id] === 'closed';
            const optionLabel = [
              venue.venueName,
              venue.neighborhood,
              isClosed ? closedAtSelectedTimeLabel : undefined,
            ].filter(Boolean).join(', ');
            return (
              <Command.Item
                key={venue.id}
                value={venue.id}
                keywords={[venue.venueName, venue.neighborhood]}
                aria-label={optionLabel}
                onSelect={() => handleSelectVenue(venue)}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-venue-image px-3 py-2 text-body-sm text-text-body outline-none data-[selected=true]:bg-surface-muted',
                  isClosed && 'bg-surface-muted/60',
                )}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-badge bg-amber-primary text-label-xs text-amber-cta-text">
                  {initialsForVenue(venue)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm-medium text-text-primary">
                    {venue.venueName}
                  </span>
                  <span className="block truncate text-label-xs-medium text-text-muted">
                    {venue.neighborhood}
                  </span>
                  {isClosed && closedAtSelectedTimeLabel && (
                    <span className="mt-1 flex items-center gap-1 text-label-xs-medium text-text-body">
                      <Clock aria-hidden="true" className="size-3 shrink-0" />
                      <span>{closedAtSelectedTimeLabel}</span>
                    </span>
                  )}
                </span>
              </Command.Item>
            );
          })}
        </Command.List>
      </m.div>
    </Command>
  );
}

function filterVenuesForQuery(venues: VenueDataDto[], query: string): VenueDataDto[] {
  if (!query) return venues;
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return venues;
  return venues.filter((venue) => {
    const searchable = normalizeSearchText([
      venue.venueName,
      venue.neighborhood,
    ].join(' '));
    return terms.every((term) => searchable.includes(term));
  });
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase('sv-SE');
}

function initialsForVenue(venue: VenueDataDto): string {
  const fallback = venue.thumbnail?.initials || venue.venueName;
  return Array.from(fallback.trim() || 'SS').slice(0, 2).join('').toUpperCase();
}
