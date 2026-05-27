'use client';

import { Cloud, Footprints, Heart, ImageIcon, Star, Sun } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  VENUE_CARD_FADE_MS,
  VENUE_CARD_STAGGER_STEP_MS,
} from '@/lib/constants/animation';
import {
  formatVenueDistance,
  formatVenueSunPercent,
  type VenueVisualMetadata,
} from '@/lib/utils/venue-visual-metadata';
import {
  getConfidenceDisplayState,
  type ConfidenceDisplayLabels,
} from '@/lib/utils/confidence-display';
import type { SunFreshnessMeta } from '@/lib/types/api';
import { cn } from '@/lib/utils';

export type VenueCardLabels = {
  select: string;
  favourite: string;
  sun: string;
  photoPlaceholder: string;
  confidence: string;
  confidenceApproximate: string;
  confidenceUnavailable: string;
  distance: string;
  sunUnavailable: string;
};

export type VenueCardProps = {
  name: string;
  neighborhood?: string;
  sunTimeRange?: string;
  confidencePercent?: number;
  confidenceMeta?: SunFreshnessMeta;
  distanceMeters?: number;
  sunExposurePercent?: number;
  thumbnail?: {
    alt: string;
    initials: string;
    url?: string;
  };
  isSunny: boolean;
  visualMetadata?: VenueVisualMetadata;
  labels: VenueCardLabels;
  onSelect: () => void;
  onFavouriteToggle?: () => void;
  isFavourite?: boolean;
  compact?: boolean;
  showVisibleConfidence?: boolean;
  staggerIndex?: number;
  animateIn?: boolean;
};

const THUMBNAIL_MAX_INITIALS = 3;

export function VenueCard({
  name,
  neighborhood,
  sunTimeRange,
  confidencePercent,
  confidenceMeta,
  distanceMeters,
  sunExposurePercent,
  thumbnail,
  isSunny,
  visualMetadata,
  labels,
  onSelect,
  onFavouriteToggle,
  isFavourite = false,
  compact = false,
  showVisibleConfidence = true,
  staggerIndex = 0,
  animateIn = false,
}: VenueCardProps) {
  const sunPercent = formatVenueSunPercent(sunExposurePercent);
  const distance = formatVenueDistance(distanceMeters);
  const confidenceDisplay = getConfidenceDisplayState({
    confidence: confidencePercent,
    meta: confidenceMeta,
    labels: confidenceDisplayLabels(labels),
  });
  const statusLabel = !isSunny
    ? 'MEST SKUGGA'
    : (sunExposurePercent ?? 0) >= 75
      ? 'FULL SOL'
      : 'DELVIS SOL';
  const sunUnitLabel = labels.sun.toLocaleLowerCase();

  return (
    <article
      data-testid="venue-card"
      className={cn(
        'group flex w-full items-center gap-3 text-left',
        animateIn && 'motion-safe:animate-in motion-safe:fade-in',
        compact
          ? 'min-h-20 rounded-card border border-divider/70 bg-white p-2 shadow-subtle transition-colors duration-fast ease-default hover:bg-surface-muted'
          : 'min-h-venue-card border-b border-divider/70 bg-transparent px-0 py-2',
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
      <button
        type="button"
        aria-label={labels.select}
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-card text-left outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
      >
      <VenueCardThumbnail
        thumbnail={thumbnail}
        fallbackLabel={labels.photoPlaceholder}
        sunExposurePercent={sunExposurePercent}
        isSunny={isSunny}
        compact={compact}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-heading-md text-text-primary">
          {name}
        </span>
        {compact ? (
          <>
            <span className="mt-1 block truncate text-body-sm-medium text-text-body">
              {neighborhood ? `${neighborhood} · ` : ''}
              {distance}
            </span>
            <span className="mt-1 flex items-center gap-1 text-label-xs text-amber-dark">
              {isSunny ? (
                <Sun aria-hidden="true" className="size-3 shrink-0 fill-current" />
              ) : (
                <Cloud aria-hidden="true" className="size-3 shrink-0 fill-current" />
              )}
              <span>{statusLabel}</span>
            </span>
          </>
        ) : (
          <>
            <span className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-body-sm-medium text-text-body">
              <Footprints aria-hidden="true" className="size-3.5 shrink-0 text-amber-dark" />
              <span>{distance}</span>
              {visualMetadata && (
                <>
                  <span className="text-text-faint">·</span>
                  <Star aria-hidden="true" className="size-3.5 shrink-0 fill-amber-gold text-amber-gold" />
                  <span className="font-bold text-text-body">{visualMetadata.rating}</span>
                </>
              )}
              <span className="text-text-faint">·</span>
              <span className="font-extrabold text-amber-dark">{sunPercent} {sunUnitLabel}</span>
              {confidenceDisplay.visibleText && (
                showVisibleConfidence ? (
                  <>
                    <span className="text-text-faint">·</span>
                    <span className="font-extrabold text-label-xs text-amber-text">
                      <span className="sr-only">
                        {labels.confidence}: {confidenceDisplay.visibleText}{' '}
                        {confidenceDisplay.accessibleText}
                      </span>
                      <span aria-hidden="true">{confidenceDisplay.visibleText}</span>
                    </span>
                  </>
                ) : (
                  <span className="sr-only">
                    {labels.confidence}: {confidenceDisplay.visibleText}{' '}
                    {confidenceDisplay.accessibleText}
                  </span>
                )
              )}
            </span>{' '}
            <span className="sr-only">
              {sunTimeRange ?? labels.sunUnavailable}. {confidenceDisplay.accessibleText}.{' '}
              {labels.distance}: {distance}.
            </span>
            {visualMetadata && (
              <span className="mt-2 flex flex-wrap gap-1">
                {visualMetadata.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-pill bg-surface-sand px-2 py-0.5 text-label-xs-medium text-amber-dark"
                  >
                    {tag}
                  </span>
                ))}
              </span>
            )}
          </>
        )}
      </span>
      </button>
      <button
        type="button"
        aria-label={formatLabel(labels.favourite, { name })}
        aria-disabled={!onFavouriteToggle}
        aria-pressed={onFavouriteToggle ? isFavourite : undefined}
        disabled={!onFavouriteToggle}
        onClick={(event) => {
          event.stopPropagation();
          onFavouriteToggle?.();
        }}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-pill border border-divider bg-white text-text-faint shadow-subtle outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
          'size-11',
          isFavourite && 'border-transparent bg-amber-primary text-amber-cta-text',
          !onFavouriteToggle && 'cursor-not-allowed opacity-60',
        )}
      >
        <Heart
          aria-hidden="true"
          className={cn('size-5', isFavourite && 'fill-current')}
        />
      </button>
    </article>
  );
}

export function VenueCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-testid="venue-card-skeleton"
      className={cn(
        'flex min-h-venue-card-skeleton w-full items-center gap-3 rounded-card border border-divider/70 bg-white p-2 shadow-subtle',
        compact && 'min-h-20 gap-2',
      )}
    >
      <Skeleton className="h-venue-card-skeleton-image-h w-venue-card-skeleton-image-w rounded-venue-image bg-surface-muted" />
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
  sunExposurePercent,
  isSunny,
  compact,
}: {
  thumbnail?: VenueCardProps['thumbnail'];
  fallbackLabel: string;
  sunExposurePercent?: number;
  isSunny: boolean;
  compact: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const initials = normalizeInitials(thumbnail?.initials);
  const label = thumbnail?.alt?.trim() || fallbackLabel;
  const imageUrl = thumbnail?.url;
  const shouldRenderImage = Boolean(imageUrl) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image || !shouldRenderImage) return undefined;
    const handleError = () => setImageFailed(true);
    if (image.complete && image.naturalWidth === 0) {
      handleError();
      return undefined;
    }
    image.addEventListener('error', handleError);
    return () => image.removeEventListener('error', handleError);
  }, [shouldRenderImage, imageUrl]);

  return (
    <span
      data-testid="venue-card-thumbnail"
      className={cn(
        'relative block shrink-0 overflow-hidden rounded-venue-image border border-dashed border-amber-dark/35 bg-surface-sand venue-photo-gradient shadow-subtle',
        compact && 'h-venue-card-thumb-compact w-venue-card-thumb-compact',
        !compact && 'h-venue-card-thumb w-venue-card-thumb',
      )}
    >
      {shouldRenderImage ? (
        <img
          ref={imageRef}
          src={imageUrl}
          alt={label}
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <>
          <span
            role="img"
            aria-label={label}
            className="flex size-full items-center justify-center text-display-lg text-amber-dark/55"
          >
            {initials.slice(0, 1)}
          </span>
          <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-md bg-surface-cream/90 text-text-muted shadow-subtle">
            <ImageIcon aria-hidden="true" className="size-3" />
          </span>
        </>
      )}
      {sunExposurePercent != null && (
        <span
          className={cn(
            'absolute bottom-1 left-1 flex size-6 items-center justify-center rounded-badge border-2 border-surface-cream shadow-subtle',
            isSunny ? 'bg-amber-primary text-amber-cta-text' : 'bg-pin-shaded text-text-body',
          )}
        >
          {isSunny ? (
            <Sun aria-hidden="true" className="size-3.5 fill-current" />
          ) : (
            <Cloud aria-hidden="true" className="size-3.5 fill-current" />
          )}
        </span>
      )}
    </span>
  );
}

function normalizeInitials(value: string | undefined): string {
  const trimmed = value?.trim() || 'SS';
  return Array.from(trimmed).slice(0, THUMBNAIL_MAX_INITIALS).join('').toUpperCase();
}

function confidenceDisplayLabels(labels: VenueCardLabels): ConfidenceDisplayLabels {
  return {
    confidence: labels.confidence,
    approximate: labels.confidenceApproximate,
    unavailable: labels.confidenceUnavailable,
  };
}

function formatLabel(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (label, [key, value]) => label.replaceAll(`{${key}}`, value),
    template,
  );
}
