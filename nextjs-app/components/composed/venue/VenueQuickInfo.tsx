'use client';

import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { Cloud, Heart, Sun, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { RouteButton } from '@/components/composed/routing/RouteButton';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DURATION_DEFAULT_S,
  DURATION_FAST_S,
  EASE_DEFAULT,
  EASE_ENTER,
  EASE_EXIT,
} from '@/lib/constants/animation';
import {
  isObscuredSunStatus,
  skyConditionCopy,
} from '@/lib/utils/sun-status-presentation';
import type { VenueSunStatus, VenueThumbnailDto, WeatherGateState } from '@/lib/types/api';
import { isVenuePubliclySunny, normalizeWeatherGateState } from '@/lib/utils/public-sun';
import { selectVenueCardImageUrl } from '@/lib/utils/venue-media';
import { cn } from '@/lib/utils';

export type VenueQuickInfoMode = 'mobile' | 'desktop';
export type VenueQuickInfoDesktopPlacement = 'above' | 'pinned';

export type VenueQuickInfoProps = {
  mode: VenueQuickInfoMode;
  name: string;
  sunExposurePercent?: number;
  /**
   * Story 11.4 (AC1) / 11.9 (AC2): the venue's DERIVED opening-hours display for
   * the CURRENT Stockholm weekday, computed by the caller (MapView) from the
   * list-DTO per-weekday `openingHours` via
   * `lib/utils/opening-hours.ts#formatOpeningHours`. The component stays
   * presentational — it renders `display` verbatim as a single line under the
   * name. ABSENT (`undefined`) or `{ display: undefined }` (closed today / no
   * hours) → renders NOTHING — never a fabricated value.
   */
  openingHours?: { display?: string; closesAt?: string };
  /** Story 10.2 (AC1): the venue's weather-gated headline state. When
   * `'CloudObscured'` the card mutes the amber "% SOL" badge + headline into
   * the "Sol bakom moln" treatment while keeping the geometric layer (AC2). */
  currentSunStatus?: VenueSunStatus;
  weatherGateState?: WeatherGateState;
  /** Story 10.2 (AC3): serialized DTO sky field (`'clear' | 'partly-cloudy' |
   * 'overcast' | 'unavailable'`) — surfaced as plain-language copy. Absent /
   * 'unavailable' renders no sky line (never fabricate). */
  skyCondition?: string;
  distanceMeters?: number;
  /** Story 9.5 AC3 (folded into 9.9): the distance is centrum-relative
   * (Gothenburg fallback), not a real personal fix — annotate it honestly.
   * Mirrors `VenueCard.distanceIsApproximate`. */
  distanceIsApproximate?: boolean;
  thumbnail?: VenueThumbnailDto;
  isLoadingSunData: boolean;
  position?: { x: number; y: number };
  desktopPlacement?: VenueQuickInfoDesktopPlacement;
  onDismiss: () => void;
  onOpenDetails: () => void;
  onRoute: () => void;
  isRouteLoading?: boolean;
  onFavouriteToggle?: () => void;
  isFavourite?: boolean;
  labels: {
    route: string;
    moreInfo: string;
    close: string;
    photoPlaceholder: string;
    distance: string;
    /** Story 9.5 AC3 (folded into 9.9): honest "≈ från centrum" annotation
     * shown alongside the distance value on the Gothenburg-centrum fallback. */
    distanceApproximate?: string;
    loadingSun: string;
    routeLoading: string;
    favouriteAdd: string;
    favouriteRemove: string;
    /** Story 10.2 (AC1): the muted "Sol bakom moln" headline shown when the
     * venue is CloudObscured. */
    obscuredHeadline?: string;
    weatherUnavailable?: string;
    notSunnyVerdict?: string;
    /** Story 10.2 (AC3): plain-language sky descriptors. When absent, no sky
     * line renders. Story 10.4 (AC2): adds the rain descriptor. */
    sky?: {
      clear: string;
      partlyCloudy: string;
      overcast: string;
      rain: string;
    };
  };
};

const THUMBNAIL_MAX_INITIALS = 3;
const THUMBNAIL_MAX_ALT = 120;

export function VenueQuickInfo({
  mode,
  name,
  sunExposurePercent,
  openingHours,
  currentSunStatus,
  weatherGateState,
  skyCondition,
  distanceMeters,
  distanceIsApproximate = false,
  thumbnail,
  isLoadingSunData,
  position,
  desktopPlacement = 'above',
  onDismiss,
  onOpenDetails,
  onRoute,
  isRouteLoading = false,
  onFavouriteToggle,
  isFavourite = false,
  labels,
}: VenueQuickInfoProps) {
  const shouldReduceMotion = useReducedMotion();
  const isDesktop = mode === 'desktop';
  const isAnchoredMobile = !isDesktop && Boolean(position);
  // Story 9.5 AC3 (folded into 9.9): the honest centrum-relative annotation.
  // Shown only on the Gothenburg-centrum fallback AND when a label is provided;
  // the real distance number always stays visible — only the label is qualified.
  const approximateDistanceLabel =
    distanceIsApproximate && labels.distanceApproximate && Number.isFinite(distanceMeters)
      ? labels.distanceApproximate
      : null;
  // Story 10.2: the muted "Sol bakom moln" state + the plain-language sky line.
  const isObscured = isObscuredSunStatus(currentSunStatus);
  const normalizedWeatherGateState = normalizeWeatherGateState(weatherGateState);
  const isPublicSunny = isVenuePubliclySunny({
    sunExposurePercent: sunExposurePercent ?? 0,
    weatherGateState: normalizedWeatherGateState,
  });
  const publicVerdictQualification = isPublicSunny
    ? normalizedWeatherGateState === 'unknown'
      ? labels.weatherUnavailable
      : undefined
    : labels.notSunnyVerdict;
  const skyLine = labels.sky
    ? skyConditionCopy(skyCondition, labels.sky)
    : null;
  const positionedStyle = position
    ? {
        left: position.x,
        top: position.y,
        transformOrigin: 'bottom center',
      }
    : undefined;

  return (
      <m.aside
        role="dialog"
        aria-label={name}
        data-testid="venue-quick-info"
        data-quickinfo="true"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'absolute z-glass-panel bg-surface-cream shadow-card text-text-primary',
          'rounded-card outline-none max-h-[calc(100dvh-2rem)]',
          position ? 'overflow-visible' : 'overflow-hidden',
          isDesktop
            ? 'hidden lg:block w-70'
            : isAnchoredMobile
            ? 'w-[var(--size-quick-info-mobile-w)] lg:hidden'
            : 'left-4 right-4 bottom-[calc(var(--size-mobile-nav-h)+var(--spacing)*74)] lg:hidden',
        )}
        style={positionedStyle}
        initial={quickInfoInitial(isDesktop, isAnchoredMobile, shouldReduceMotion, desktopPlacement)}
        animate={quickInfoAnimate(isDesktop, isAnchoredMobile, shouldReduceMotion, desktopPlacement)}
        exit={quickInfoExit(isDesktop, isAnchoredMobile, shouldReduceMotion, desktopPlacement)}
        transition={{ duration: DURATION_DEFAULT_S, ease: EASE_ENTER }}
      >
        <button
          type="button"
          aria-label={labels.close}
          onClick={onDismiss}
          className={cn(
            'absolute z-base size-11 rounded-pill backdrop-blur-standard shadow-button-sm flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-text-primary',
            isAnchoredMobile
              ? // Story 9.9: match the reference (`src-free/QuickInfo.jsx`
                // close at top:-14 right:-10) — a floating pill nudged just
                // above the card's top-right corner, not partway down the side.
                '-right-3 -top-3 bg-text-primary/65 text-white'
              : cn(
                  onFavouriteToggle ? 'left-2 top-2' : 'right-2 top-2',
                  'bg-glass-standard text-text-primary',
                ),
          )}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
        <VenueThumbnail
          label={labels.photoPlaceholder}
          thumbnail={thumbnail}
          sunExposurePercent={sunExposurePercent}
          isPublicSunny={isPublicSunny}
          compact={isAnchoredMobile}
          forcePlaceholder={isAnchoredMobile}
          isFavourite={isFavourite}
          favouriteLabel={isFavourite ? labels.favouriteRemove : labels.favouriteAdd}
          onFavouriteToggle={onFavouriteToggle}
        />
        <div className={cn(isAnchoredMobile ? 'px-3 pt-2 pb-2.5' : 'p-4')}>
          <AnimatePresence>
            <m.div
              key={name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION_FAST_S, ease: EASE_DEFAULT }}
            >
              <button
                type="button"
                onClick={onOpenDetails}
                className={
                  isAnchoredMobile
                    ? // Story 9.9: centered name row matching the reference
                      // (fontSize 13 / weight 700 / centered). `min-h-12`
                      // preserves the tap target; padding is tightened to the
                      // reference's compact rhythm.
                      'min-h-12 w-full px-2 py-1 text-heading-md text-text-primary text-center outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:rounded-card'
                    : 'min-h-11 w-full text-heading-md text-text-primary text-left outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:rounded-card'
                }
              >
                {name}
              </button>
              {/* Story 10.2 (AC1/AC3): the muted "Sol bakom moln" headline + the
                  plain-language sky line, shown ABOVE the preserved geometric
                  layer. Rendered only for the obscured state so clear-sky cards
                  are byte-identical. `skyLine` is null when the DTO sky is
                  unavailable → no sky line (never fabricate). */}
              {isObscured && !isLoadingSunData && (
                <div
                  data-testid="quick-info-obscured"
                  className={cn(
                    'mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-obscured-text',
                    isAnchoredMobile
                      ? 'justify-center text-center text-label-xs-medium'
                      : 'text-label-md',
                  )}
                >
                  <Cloud aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="font-bold">
                    {labels.obscuredHeadline ?? 'Sol bakom moln'}
                  </span>
                  {skyLine && (
                    <>
                      <span aria-hidden="true" className="text-obscured-text/50">·</span>
                      <span>{skyLine}</span>
                    </>
                  )}
                </div>
              )}
              <div className={cn('mt-1', isAnchoredMobile ? 'min-h-5' : 'min-h-12')}>
                {isLoadingSunData ? (
                  <div aria-label={labels.loadingSun} className="space-y-2">
                    <Skeleton className="h-5 w-36 bg-surface-muted" />
                    <Skeleton className="h-5 w-44 bg-surface-muted" />
                  </div>
                ) : (
                  <div
                    className={
                      isAnchoredMobile
                        ? 'flex flex-wrap justify-center gap-x-1 gap-y-0.5 text-center text-label-xs-medium text-text-body'
                        : 'space-y-1'
                    }
                  >
                    {publicVerdictQualification && (
                      <p
                        data-testid="quick-info-public-verdict"
                        className={cn(
                          'text-text-body',
                          isAnchoredMobile
                            ? 'basis-full text-label-xs-medium'
                            : 'text-body-sm',
                        )}
                      >
                        {publicVerdictQualification}
                      </p>
                    )}
                    {/* Story 11.4 (AC1): the single honest opening-hours line, in
                        the slot vacated by the removed confidence chip and the
                        "Sol HH:mm–HH:mm" window line. Rendered ONLY when the store
                        carries opening hours; ABSENT → nothing (never fabricated,
                        never a closesAt-only fallback). Uses `text-text-body` (not
                        the 60%-alpha `text-muted`) so it clears the axe AA gate on
                        the cream card, mirroring the distance line. */}
                    {openingHours?.display && (
                      <p
                        data-testid="quick-info-opening-hours"
                        className={cn(
                          isAnchoredMobile ? 'contents' : 'text-label-lg',
                          'font-bold text-text-body',
                        )}
                      >
                        <span>{openingHours.display}</span>
                      </p>
                    )}
                    <p className={isAnchoredMobile ? 'contents' : 'text-body-sm text-text-body'}>
                      {/* Story 12.13: no visible or sr-only confidence number is
                          emitted here. Distance/opening hours/weather remain. */}
                      <span className="font-bold">
                        {isAnchoredMobile && (
                          <span className="sr-only">
                            {labels.distance}: {formatDistance(distanceMeters)}
                          </span>
                        )}
                        <span aria-hidden={isAnchoredMobile ? true : undefined}>
                          {isAnchoredMobile
                            ? formatDistance(distanceMeters)
                            : `${labels.distance}: ${formatDistance(distanceMeters)}`}
                        </span>
                      </span>
                      {approximateDistanceLabel && (
                        <span
                          aria-hidden={isAnchoredMobile ? true : undefined}
                          className={cn(
                            // text-body, not text-muted: muted (60% alpha) fails
                            // the axe AA contrast gate on the white card at this size.
                            'font-normal text-text-body',
                            isAnchoredMobile ? 'text-label-xs' : 'ml-1 text-label-xs',
                          )}
                        >
                          {isAnchoredMobile ? ' ' : ''}
                          {approximateDistanceLabel}
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </m.div>
          </AnimatePresence>
          <div className={cn('flex gap-2', isAnchoredMobile ? 'mt-2' : 'mt-3')}>
            {/* Story 11.4 (AC2): the quick-info route CTA reads only "VISA RUTT"
                (+ icon) at full legibility — NO truncated ETA. The ETA lives on
                only in the detail/route surface. `RouteButton` already omits the
                estimate span (and falls back to just `label` for its accessible
                name) when `estimateLabel` is undefined, so no component edit is
                needed — the call site simply stops passing one. */}
            <RouteButton
              label={labels.route}
              loadingLabel={labels.routeLoading}
              isLoading={isRouteLoading}
              compact={isAnchoredMobile}
              onClick={onRoute}
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={onOpenDetails}
              className={
                isAnchoredMobile
                  ? 'min-h-11 shrink-0 rounded-card border border-drag-handle-map bg-white px-3 text-label-md text-text-primary shadow-subtle outline-none focus-visible:ring-2 focus-visible:ring-text-primary whitespace-nowrap'
                  : 'min-h-11 rounded-card border border-drag-handle-map bg-white px-4 text-label-lg text-text-primary shadow-subtle outline-none focus-visible:ring-2 focus-visible:ring-text-primary'
              }
            >
              {labels.moreInfo}
            </button>
          </div>
        </div>
        {isDesktop && (
          <div
            aria-hidden="true"
            className="absolute left-1/2 -bottom-2 size-4 -translate-x-1/2 rotate-45 bg-surface-cream shadow-card"
          />
        )}
        {isAnchoredMobile && (
          <div
            aria-hidden="true"
            className="absolute left-1/2 -bottom-2 size-4 -translate-x-1/2 rotate-45 bg-surface-cream shadow-card"
          />
        )}
      </m.aside>
  );
}

function VenueThumbnail({
  label,
  thumbnail,
  sunExposurePercent,
  isPublicSunny,
  compact = false,
  forcePlaceholder = false,
  isFavourite = false,
  favouriteLabel,
  onFavouriteToggle,
}: {
  label: string;
  thumbnail?: VenueThumbnailDto;
  sunExposurePercent?: number;
  isPublicSunny: boolean;
  compact?: boolean;
  forcePlaceholder?: boolean;
  isFavourite?: boolean;
  favouriteLabel: string;
  onFavouriteToggle?: () => void;
}) {
  const accessibleLabel = normalizeAlt(thumbnail?.alt, label);
  const initials = normalizeInitials(thumbnail?.initials);
  const sunExposureText = formatPercent(sunExposurePercent);
  const [imageFailed, setImageFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageUrl = forcePlaceholder ? undefined : selectVenueCardImageUrl(thumbnail);
  const shouldRenderImage = Boolean(imageUrl) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [forcePlaceholder, imageUrl]);

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
  }, [imageUrl, shouldRenderImage]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-t-card border-b border-divider flex items-center justify-center',
        forcePlaceholder ? 'gradient-cta-amber' : 'bg-amber-primary venue-photo-gradient',
        compact ? 'h-18' : 'h-24',
      )}
    >
      {shouldRenderImage ? (
        <img
          data-testid="venue-quick-info-photo"
          ref={imageRef}
          src={imageUrl}
          alt={accessibleLabel}
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          data-testid="venue-quick-info-photo-fallback"
          role="img"
          aria-label={accessibleLabel}
          className="absolute inset-0 flex items-center justify-center"
        >
          {forcePlaceholder ? (
            <>
              <div
                aria-hidden="true"
                className="absolute right-6 top-3 size-16 rounded-badge bg-surface-cream/20"
              />
              <div
                aria-hidden="true"
                className="absolute left-5 bottom-3 h-10 w-24 rounded-pill bg-amber-pale/30"
              />
            </>
          ) : (
            <>
              <div
                aria-hidden="true"
                className="absolute left-8 top-8 h-16 w-32 -rotate-6 rounded-venue-image border border-surface-cream/40 bg-surface-cream/20 shadow-subtle"
              />
              <div
                aria-hidden="true"
                className="absolute right-8 top-5 h-20 w-20 rotate-12 rounded-badge border border-surface-cream/40 bg-amber-pale/35"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-14 bg-surface-cream/20"
              />
              <span
                aria-hidden="true"
                className="relative rounded-badge border border-surface-cream/40 bg-surface-cream/80 px-3 py-2 text-label-lg text-amber-cta-text shadow-subtle"
              >
                {initials}
              </span>
            </>
          )}
        </div>
      )}
      {sunExposureText && (
        <div
          className={cn(
            'absolute rounded-badge backdrop-blur-standard shadow-subtle flex items-center',
            isPublicSunny
              ? 'bg-amber-gold/90 text-amber-cta-text'
              : 'bg-pin-shaded text-text-body',
            // Story 9.9: on the 72px compact (anchored-mobile) strip, match the
            // reference's small top-left "% Sol" pill (top:8 left:8, tight
            // padding) so it never jams against the favourite heart or the
            // planner slider above the card.
            compact
              ? 'left-2 top-2 gap-1 px-2 py-1 text-label-xs-medium'
              : 'left-3 top-3 gap-1.5 px-3 py-1.5 text-display-sm',
          )}
        >
          {isPublicSunny ? (
            <Sun aria-hidden="true" className={compact ? 'size-3' : 'size-4'} />
          ) : (
            <Cloud aria-hidden="true" className={compact ? 'size-3' : 'size-4'} />
          )}
          {isPublicSunny && `${sunExposureText} SOL`}
        </div>
      )}
      {onFavouriteToggle && (
        <button
          type="button"
          aria-label={favouriteLabel}
          aria-pressed={isFavourite}
          onClick={(event) => {
            event.stopPropagation();
            onFavouriteToggle();
          }}
          className={cn(
            // Keep the 44px accessible tap target (WCAG) on both strips; only
            // the edge inset tightens toward the reference (top:8 right:8) on
            // the compact anchored-mobile strip.
            'absolute flex size-11 items-center justify-center rounded-pill bg-glass-standard text-text-primary shadow-button-sm backdrop-blur-standard outline-none transition-colors duration-fast ease-default focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none',
            compact ? 'right-2 top-2' : 'right-3 top-3',
            isFavourite && 'bg-glass-lavender',
          )}
        >
          <Heart aria-hidden="true" className={cn('size-5', isFavourite && 'fill-current')} />
        </button>
      )}
    </div>
  );
}

function quickInfoInitial(
  isDesktop: boolean,
  isAnchoredMobile: boolean,
  shouldReduceMotion: boolean,
  desktopPlacement: VenueQuickInfoDesktopPlacement,
) {
  if (shouldReduceMotion) {
    return { opacity: 0, ...quickInfoPositionTransform(isDesktop, isAnchoredMobile, desktopPlacement) };
  }
  if (isDesktop) return { opacity: 0, scale: 0.95, ...desktopTransform(desktopPlacement) };
  if (isAnchoredMobile) return { opacity: 0, scale: 0.95, x: '-50%', y: 'calc(-100% - 40px)' };
  return {
    opacity: 0,
    y: '100%',
  };
}

function quickInfoAnimate(
  isDesktop: boolean,
  isAnchoredMobile: boolean,
  shouldReduceMotion: boolean,
  desktopPlacement: VenueQuickInfoDesktopPlacement,
) {
  if (shouldReduceMotion) {
    return { opacity: 1, ...quickInfoPositionTransform(isDesktop, isAnchoredMobile, desktopPlacement) };
  }
  if (isDesktop) return { opacity: 1, scale: 1, ...desktopTransform(desktopPlacement) };
  if (isAnchoredMobile) return { opacity: 1, scale: 1, x: '-50%', y: 'calc(-100% - 40px)' };
  return { opacity: 1, y: 0 };
}

function quickInfoExit(
  isDesktop: boolean,
  isAnchoredMobile: boolean,
  shouldReduceMotion: boolean,
  desktopPlacement: VenueQuickInfoDesktopPlacement,
) {
  const transition = { duration: DURATION_FAST_S, ease: EASE_EXIT };
  if (shouldReduceMotion) {
    return {
      opacity: 0,
      ...quickInfoPositionTransform(isDesktop, isAnchoredMobile, desktopPlacement),
      transition,
    };
  }
  if (isDesktop) {
    return { opacity: 0, scale: 0.95, ...desktopTransform(desktopPlacement), transition };
  }
  if (isAnchoredMobile) {
    return { opacity: 0, scale: 0.95, x: '-50%', y: 'calc(-100% - 40px)', transition };
  }
  return { opacity: 0, y: '100%', transition };
}

function quickInfoPositionTransform(
  isDesktop: boolean,
  isAnchoredMobile: boolean,
  desktopPlacement: VenueQuickInfoDesktopPlacement,
) {
  if (isDesktop) return desktopTransform(desktopPlacement);
  if (isAnchoredMobile) return { x: '-50%', y: 'calc(-100% - 40px)' };
  return {};
}

function desktopTransform(placement: VenueQuickInfoDesktopPlacement) {
  if (placement === 'pinned') return { x: '-50%', y: 0 };
  return { x: '-50%', y: 'calc(-100% - 56px)' };
}

function normalizeAlt(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return Array.from(trimmed).slice(0, THUMBNAIL_MAX_ALT).join('');
}

function normalizeInitials(value: string | undefined): string {
  const trimmed = value?.trim() || 'SS';
  return Array.from(trimmed).slice(0, THUMBNAIL_MAX_INITIALS).join('').toUpperCase();
}

function formatDistance(meters?: number): string {
  if (!Number.isFinite(meters)) return '–';
  if ((meters ?? 0) >= 1000) return `${((meters ?? 0) / 1000).toFixed(1)} km`;
  return `${Math.round(meters ?? 0)} m`;
}

function formatPercent(value: number | undefined): string | null {
  if (!Number.isFinite(value)) return null;
  return `${Math.max(0, Math.min(100, Math.round(value ?? 0)))}%`;
}
