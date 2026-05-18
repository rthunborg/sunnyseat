'use client';

import { Sun } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  VENUE_CARD_FADE_MS,
  VENUE_CARD_STAGGER_STEP_MS,
} from '@/lib/constants/animation';
import { cn } from '@/lib/utils';

export type VenueCardLabels = {
  select: string;
  sun: string;
  photoPlaceholder: string;
  confidence: string;
  distance: string;
  sunUnavailable: string;
};

export type VenueCardProps = {
  name: string;
  sunTimeRange?: string;
  confidencePercent?: number;
  distanceMeters?: number;
  thumbnail?: {
    alt: string;
    initials: string;
    url?: string;
  };
  isSunny: boolean;
  labels: VenueCardLabels;
  onSelect: () => void;
  compact?: boolean;
  staggerIndex?: number;
  animateIn?: boolean;
};

const THUMBNAIL_MAX_INITIALS = 3;

export function VenueCard({
  name,
  sunTimeRange,
  confidencePercent,
  distanceMeters,
  thumbnail,
  isSunny,
  labels,
  onSelect,
  compact = false,
  staggerIndex = 0,
  animateIn = false,
}: VenueCardProps) {
  return (
    <button
      type="button"
      aria-label={labels.select}
      data-testid="venue-card"
      onClick={onSelect}
      className={cn(
        'group flex min-h-[88px] w-full items-center gap-3 rounded-card border border-divider/70 bg-white p-2 text-left shadow-subtle outline-none',
        'focus-visible:ring-2 focus-visible:ring-text-primary',
        'transition-colors duration-fast ease-default hover:bg-surface-muted',
        animateIn && 'motion-safe:animate-in motion-safe:fade-in',
        compact && 'min-h-20 gap-2 p-2',
      )}
      style={
        animateIn
          ? {
              animationDelay: `${staggerIndex * VENUE_CARD_STAGGER_STEP_MS}ms`,
              animationDuration: `${VENUE_CARD_FADE_MS}ms`,
            }
          : undefined
      }
    >
      <VenueCardThumbnail
        thumbnail={thumbnail}
        fallbackLabel={labels.photoPlaceholder}
        confidencePercent={confidencePercent}
        compact={compact}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-heading-md text-text-primary">
          {name}
        </span>
        <span className="mt-1 flex items-center gap-1 text-label-lg text-amber-dark">
          <Sun aria-hidden="true" className="size-4 shrink-0" />
          <span>{sunTimeRange ?? labels.sunUnavailable}</span>
        </span>
        <span className="mt-1 block text-body-sm text-text-body">
          <span className="text-amber-dark">
            <span className="font-bold">{labels.confidence}:</span>{' '}
            {formatConfidence(confidencePercent)}%
          </span>{' '}
          · <span className="font-bold">{labels.distance}:</span>{' '}
          {formatDistance(distanceMeters)}
        </span>
      </span>
      <span
        className={cn(
          'flex size-badge-sm shrink-0 items-center justify-center rounded-badge border-2 border-surface-cream shadow-subtle',
          isSunny ? 'bg-amber-primary text-amber-cta-text' : 'bg-pin-shaded text-text-body',
        )}
      >
        <Sun aria-hidden="true" className="size-4" />
        <span className="sr-only">{isSunny ? labels.sun : labels.sunUnavailable}</span>
      </span>
    </button>
  );
}

export function VenueCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-testid="venue-card-skeleton"
      className={cn(
        'flex min-h-[88px] w-full items-center gap-3 rounded-card border border-divider/70 bg-white p-2 shadow-subtle',
        compact && 'min-h-20 gap-2',
      )}
    >
      <Skeleton className="h-[72px] w-[87px] rounded-venue-image bg-surface-muted" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-32 bg-surface-muted" />
        <Skeleton className="h-4 w-40 bg-surface-muted" />
        <Skeleton className="h-4 w-28 bg-surface-muted" />
      </div>
    </div>
  );
}

function VenueCardThumbnail({
  thumbnail,
  fallbackLabel,
  confidencePercent,
  compact,
}: {
  thumbnail?: VenueCardProps['thumbnail'];
  fallbackLabel: string;
  confidencePercent?: number;
  compact: boolean;
}) {
  const initials = normalizeInitials(thumbnail?.initials);
  const label = thumbnail?.alt?.trim() || fallbackLabel;
  return (
    <span
      className={cn(
        'relative block h-[72px] w-[87px] shrink-0 overflow-hidden rounded-venue-image bg-amber-primary venue-photo-gradient',
        compact && 'h-16 w-16',
      )}
    >
      {thumbnail?.url ? (
        <img
          src={thumbnail.url}
          alt={label}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <span
          role="img"
          aria-label={label}
          className="flex size-full items-center justify-center text-display-sm text-amber-cta-text"
        >
          {initials}
        </span>
      )}
      {confidencePercent != null && (
        <span className="absolute -right-1 -top-1 flex size-badge-sm items-center justify-center rounded-badge border-2 border-surface-cream bg-amber-primary text-amber-cta-text shadow-subtle">
          <Sun aria-hidden="true" className="size-4" />
        </span>
      )}
    </span>
  );
}

function normalizeInitials(value: string | undefined): string {
  const trimmed = value?.trim() || 'SS';
  return Array.from(trimmed).slice(0, THUMBNAIL_MAX_INITIALS).join('').toUpperCase();
}

function formatDistance(meters?: number): string {
  if (!Number.isFinite(meters)) return '-';
  if ((meters ?? 0) >= 1000) return `${((meters ?? 0) / 1000).toFixed(1)} km`;
  return `${Math.round(meters ?? 0)} m`;
}

function formatConfidence(value?: number): number {
  return Number.isFinite(value) ? Math.round(value ?? 0) : 0;
}
