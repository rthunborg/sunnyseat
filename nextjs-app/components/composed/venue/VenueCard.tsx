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
  favouriteAdd?: string;
  favouriteRemove?: string;
  sun: string;
  photoPlaceholder: string;
  confidence: string;
  confidenceApproximate: string;
  confidenceUnavailable: string;
  distance: string;
  /** Story 9.5 AC3: honest "≈ från centrum" annotation shown alongside the
   * distance when the origin is the Gothenburg-centrum fallback. */
  distanceApproximate?: string;
  sunUnavailable: string;
  statusMostlyShade?: string;
  statusFullSun?: string;
  statusPartialSun?: string;
  /** Story 10.2: the muted "Sol bakom moln" headline shown when the venue's
   * weather-gated state is CloudObscured. Replaces the amber FULL SOL / grey
   * MEST SKUGGA labels for that state. */
  statusObscured?: string;
  /** Story 10.2 (AC2): reframes the geometric % as position-not-weather on an
   * obscured card, e.g. "{percent} solläge · sol här när det klarnar". The
   * `{percent}` placeholder is substituted with the formatted solläge value. */
  obscuredPosition?: string;
};

export type VenueCardProps = {
  name: string;
  neighborhood?: string;
  sunTimeRange?: string;
  confidencePercent?: number;
  confidenceMeta?: SunFreshnessMeta;
  distanceMeters?: number;
  /** Story 9.5 AC3: the distance is centrum-relative (Gothenburg fallback),
   * not a real personal fix — annotate it honestly. */
  distanceIsApproximate?: boolean;
  sunExposurePercent?: number;
  thumbnail?: {
    alt: string;
    initials: string;
    url?: string;
  };
  isSunny: boolean;
  /** Story 10.2 (AC1): the weather-gated "Sol bakom moln" state. Rendered as
   * a muted slate treatment DISTINCT from both the amber sunny path (`isSunny`)
   * and the grey shaded path. `isSunny` is NOT overloaded — an obscured venue
   * is neither amber-sunny nor plain-shaded, so it arrives with `isSunny=false`
   * (no amber chrome) AND `isObscured=true` (muted, not grey-shaded). */
  isObscured?: boolean;
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
  distanceIsApproximate = false,
  sunExposurePercent,
  thumbnail,
  isSunny,
  isObscured = false,
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
  // Story 9.1 de-bloat: the button's accessible name (labels.select) already
  // carries name + sun% + Säkerhet (once) + Avstånd, so we no longer append the
  // prediction-uncertainty paragraph to it.
  const selectLabel = labels.select;
  // Story 10.2 (AC1): the obscured state OVERRIDES both the amber "FULL SOL"/
  // "DELVIS SOL" path AND the grey "MEST SKUGGA" path with the muted "Sol
  // bakom moln" headline. An obscured venue never shows amber sun copy.
  const statusLabel = isObscured
    ? (labels.statusObscured ?? 'SOL BAKOM MOLN')
    : !isSunny
      ? (labels.statusMostlyShade ?? 'MEST SKUGGA')
      : (sunExposurePercent ?? 0) >= 75
        ? (labels.statusFullSun ?? 'FULL SOL')
        : (labels.statusPartialSun ?? 'DELVIS SOL');
  const sunUnitLabel = labels.sun.toLocaleLowerCase();
  // Story 10.2 (AC2): on an obscured card the geometric % is reframed as
  // position-not-weather ("{percent} solläge · sol här när det klarnar") — the
  // value/meaning is unchanged, only the label reframes it. Falls back to the
  // plain "{percent} sol" chip when no obscured-position copy is provided.
  const obscuredPositionLabel =
    isObscured && labels.obscuredPosition
      ? formatLabel(labels.obscuredPosition, { percent: sunPercent })
      : null;
  // Story 9.5 AC3: honest centrum-relative annotation. Shown only on the
  // Gothenburg-centrum fallback; the real distance number stays visible —
  // only the label is qualified ("≈ från centrum").
  // Gated on a finite distance: on the fallbackVenueFromSlug path distanceMeters
  // is NaN (rendered as "–"), and qualifying a non-numeric placeholder with
  // "≈ från centrum" is more confusing than the ambiguity AC3 set out to fix.
  const approximateLabel =
    distanceIsApproximate && labels.distanceApproximate && Number.isFinite(distanceMeters)
      ? labels.distanceApproximate
      : null;

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
        aria-label={selectLabel}
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-card text-left outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
      >
      <VenueCardThumbnail
        thumbnail={thumbnail}
        fallbackLabel={labels.photoPlaceholder}
        sunExposurePercent={sunExposurePercent}
        isSunny={isSunny}
        isObscured={isObscured}
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
              {/* text-body, not text-muted: muted (60% alpha) is ≈3.18:1 on the
                  white card and fails the axe AA contrast gate at label-xs size;
                  the smaller size alone carries the de-emphasis. */}
              {approximateLabel && (
                <span className="ml-1 text-label-xs text-text-body">{approximateLabel}</span>
              )}
            </span>
            <span
              className={cn(
                'mt-1 flex items-center gap-1 text-label-xs',
                isObscured ? 'text-obscured-text' : 'text-amber-dark',
              )}
            >
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
            {/* Story 10.2 (AC1): the non-compact (favourites bottom-sheet) card
                never carried a visible status headline, so mirror the compact
                card's muted "Sol bakom moln" line for the obscured state ONLY —
                additive, no change to the sunny/shaded non-compact layout. */}
            {isObscured && (
              <span className="mt-1 flex items-center gap-1 text-label-xs text-obscured-text">
                <Cloud aria-hidden="true" className="size-3 shrink-0 fill-current" />
                <span>{statusLabel}</span>
              </span>
            )}
            <span className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-body-sm-medium text-text-body">
              <Footprints aria-hidden="true" className="size-3.5 shrink-0 text-amber-dark" />
              <span>{distance}</span>
              {approximateLabel && (
                <span className="text-label-xs text-text-body">{approximateLabel}</span>
              )}
              {visualMetadata && (
                <>
                  <span className="text-text-faint">·</span>
                  <Star aria-hidden="true" className="size-3.5 shrink-0 fill-amber-gold text-amber-gold" />
                  <span className="font-bold text-text-body">{visualMetadata.rating}</span>
                </>
              )}
              <span className="text-text-faint">·</span>
              {isObscured ? (
                // AC1/AC2: no amber sun chip while obscured — muted slate, and
                // the geometric % reframed as position-not-weather.
                <span className="flex items-center gap-1 font-bold text-obscured-text">
                  <Cloud aria-hidden="true" className="size-3 shrink-0 fill-current" />
                  <span>{obscuredPositionLabel ?? `${sunPercent} ${sunUnitLabel}`}</span>
                </span>
              ) : (
                <span className="font-extrabold text-amber-dark">{sunPercent} {sunUnitLabel}</span>
              )}
              {!isObscured && confidenceDisplay.visibleText && showVisibleConfidence && (
                <>
                  <span className="text-text-faint">·</span>
                  <span
                    aria-hidden="true"
                    className="font-extrabold text-label-xs text-amber-text"
                  >
                    {confidenceDisplay.visibleText}
                  </span>
                </>
              )}
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
            {/* Sun window ("Sol HH:MM–HH:MM"): a genuinely-real signal (the sunny
                hours) kept discoverable to screen readers. Story 9.1's de-bloat
                removed the OLD sr-only block because it DUPLICATED the
                confidence + distance already in the button's accessible name —
                but that block also carried the sun window, which is not a
                duplicate and is the core value the favourites view surfaces per
                saved venue. Re-added on its own (sr-only, so the visible card
                stays de-bloated per 9.1) in the NON-COMPACT variant only —
                matching the pre-9.1 placement so the mobile `/favoriter` card
                (bottom sheet at 'mid') exposes it while the always-compact
                desktop-list-panel card does not (keeping a single DOM match). */}
            <span className="sr-only" data-testid="venue-card-sun-window">
              {sunTimeRange ?? labels.sunUnavailable}
            </span>
          </>
        )}
      </span>
      </button>
      <button
        type="button"
        aria-label={
          isFavourite
            ? favouriteButtonLabel(labels.favouriteRemove ?? labels.favourite, name)
            : favouriteButtonLabel(labels.favouriteAdd ?? labels.favourite, name)
        }
        aria-disabled={!onFavouriteToggle}
        aria-pressed={onFavouriteToggle ? isFavourite : undefined}
        disabled={!onFavouriteToggle}
        onClick={(event) => {
          event.stopPropagation();
          onFavouriteToggle?.();
        }}
        className={cn(
          'flex shrink-0 items-center justify-center rounded-pill border border-divider bg-white text-text-faint shadow-subtle outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
          'transition-colors duration-fast ease-default motion-reduce:transition-none',
          'size-11',
          isFavourite && 'border-transparent bg-glass-lavender text-text-primary',
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
  isObscured = false,
  compact,
}: {
  thumbnail?: VenueCardProps['thumbnail'];
  fallbackLabel: string;
  sunExposurePercent?: number;
  isSunny: boolean;
  isObscured?: boolean;
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
            // Story 10.2 (AC1): three distinct badge treatments — amber sunny,
            // muted-slate obscured (white icon on `bg-pin-obscured`, 5.50:1 AA),
            // grey shaded. Obscured is never the amber sun badge.
            isSunny
              ? 'bg-amber-primary text-amber-cta-text'
              : isObscured
                ? 'bg-pin-obscured text-white'
                : 'bg-pin-shaded text-text-body',
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

function favouriteButtonLabel(template: string, name: string): string {
  const label = formatLabel(template, { name });
  return label.includes(name) ? label : `${label}: ${name}`;
}
