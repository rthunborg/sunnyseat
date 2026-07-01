'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Heart, Sun, X } from 'lucide-react';
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
  getConfidenceDisplayState,
  type ConfidenceDisplayLabels,
} from '@/lib/utils/confidence-display';
import type { SunFreshnessMeta } from '@/lib/types/api';
import { cn } from '@/lib/utils';

export type VenueQuickInfoMode = 'mobile' | 'desktop';
export type VenueQuickInfoDesktopPlacement = 'above' | 'pinned';

export type VenueQuickInfoProps = {
  mode: VenueQuickInfoMode;
  name: string;
  sunTimeRange?: string;
  confidencePercent?: number;
  confidenceMeta?: SunFreshnessMeta;
  sunExposurePercent?: number;
  distanceMeters?: number;
  /** Story 9.5 AC3 (folded into 9.9): the distance is centrum-relative
   * (Gothenburg fallback), not a real personal fix — annotate it honestly.
   * Mirrors `VenueCard.distanceIsApproximate`. */
  distanceIsApproximate?: boolean;
  thumbnail?: {
    alt: string;
    initials: string;
    url?: string;
  };
  isLoadingSunData: boolean;
  position?: { x: number; y: number };
  desktopPlacement?: VenueQuickInfoDesktopPlacement;
  onDismiss: () => void;
  onOpenDetails: () => void;
  onRoute: () => void;
  routeEstimateLabel?: string;
  isRouteLoading?: boolean;
  onFavouriteToggle?: () => void;
  isFavourite?: boolean;
  labels: {
    route: string;
    moreInfo: string;
    close: string;
    photoPlaceholder: string;
    confidence: string;
    confidenceApproximate: string;
    confidenceUnavailable: string;
    distance: string;
    /** Story 9.5 AC3 (folded into 9.9): honest "≈ från centrum" annotation
     * shown alongside the distance value on the Gothenburg-centrum fallback. */
    distanceApproximate?: string;
    loadingSun: string;
    sunUnavailable: string;
    routeLoading: string;
    favouriteAdd: string;
    favouriteRemove: string;
  };
};

const THUMBNAIL_MAX_INITIALS = 3;
const THUMBNAIL_MAX_ALT = 120;

export function VenueQuickInfo({
  mode,
  name,
  sunTimeRange,
  confidencePercent,
  confidenceMeta,
  sunExposurePercent,
  distanceMeters,
  distanceIsApproximate = false,
  thumbnail,
  isLoadingSunData,
  position,
  desktopPlacement = 'above',
  onDismiss,
  onOpenDetails,
  onRoute,
  routeEstimateLabel,
  isRouteLoading = false,
  onFavouriteToggle,
  isFavourite = false,
  labels,
}: VenueQuickInfoProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const isDesktop = mode === 'desktop';
  const isAnchoredMobile = !isDesktop && Boolean(position);
  const confidenceDisplay = getConfidenceDisplayState({
    confidence: confidencePercent,
    meta: confidenceMeta,
    labels: confidenceDisplayLabels(labels),
  });
  // Story 9.5 AC3 (folded into 9.9): the honest centrum-relative annotation.
  // Shown only on the Gothenburg-centrum fallback AND when a label is provided;
  // the real distance number always stays visible — only the label is qualified.
  const approximateDistanceLabel =
    distanceIsApproximate && labels.distanceApproximate
      ? labels.distanceApproximate
      : null;
  const positionedStyle = position
    ? {
        left: position.x,
        top: position.y,
        transformOrigin: 'bottom center',
      }
    : undefined;

  return (
      <motion.aside
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
          compact={isAnchoredMobile}
          forcePlaceholder={isAnchoredMobile}
          isFavourite={isFavourite}
          favouriteLabel={isFavourite ? labels.favouriteRemove : labels.favouriteAdd}
          onFavouriteToggle={onFavouriteToggle}
        />
        <div className={cn(isAnchoredMobile ? 'px-3 pt-2 pb-2.5' : 'p-4')}>
          <AnimatePresence>
            <motion.div
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
                    <p className={isAnchoredMobile ? 'contents' : 'text-label-lg text-amber-dark'}>
                      <span className="text-amber-dark">
                        {sunTimeRange ?? labels.sunUnavailable}
                      </span>
                    </p>
                    <p className={isAnchoredMobile ? 'contents' : 'text-body-sm text-text-body'}>
                      {confidenceDisplay.visibleText && (
                        <>
                          <span className="font-bold text-amber-text">
                            {labels.confidence}: {confidenceDisplay.visibleText}
                            <span className="sr-only"> {confidenceDisplay.accessibleText}</span>
                          </span>
                        </>
                      )}
                      {!confidenceDisplay.visibleText && (
                        <span className="sr-only">{confidenceDisplay.accessibleText}. </span>
                      )}
                      {!isAnchoredMobile && confidenceDisplay.visibleText && ' · '}
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
                            'font-normal text-text-muted',
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
            </motion.div>
          </AnimatePresence>
          <div className={cn('flex gap-2', isAnchoredMobile ? 'mt-2' : 'mt-3')}>
            <RouteButton
              label={labels.route}
              loadingLabel={labels.routeLoading}
              estimateLabel={routeEstimateLabel}
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
      </motion.aside>
  );
}

function VenueThumbnail({
  label,
  thumbnail,
  sunExposurePercent,
  compact = false,
  forcePlaceholder = false,
  isFavourite = false,
  favouriteLabel,
  onFavouriteToggle,
}: {
  label: string;
  thumbnail?: { alt: string; initials: string; url?: string };
  sunExposurePercent?: number;
  compact?: boolean;
  forcePlaceholder?: boolean;
  isFavourite?: boolean;
  favouriteLabel: string;
  onFavouriteToggle?: () => void;
}) {
  const accessibleLabel = normalizeAlt(thumbnail?.alt, label);
  const initials = normalizeInitials(thumbnail?.initials);
  const sunExposureText = formatPercent(sunExposurePercent);
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-t-card border-b border-divider flex items-center justify-center',
        forcePlaceholder ? 'gradient-cta-amber' : 'bg-amber-primary venue-photo-gradient',
        compact ? 'h-18' : 'h-24',
      )}
    >
      {thumbnail?.url && !forcePlaceholder ? (
        <img
          src={thumbnail.url}
          alt={accessibleLabel}
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
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
            'absolute rounded-badge bg-amber-gold/90 backdrop-blur-standard text-amber-cta-text shadow-subtle flex items-center',
            // Story 9.9: on the 72px compact (anchored-mobile) strip, match the
            // reference's small top-left "% Sol" pill (top:8 left:8, tight
            // padding) so it never jams against the favourite heart or the
            // planner slider above the card.
            compact
              ? 'left-2 top-2 gap-1 px-2 py-1 text-label-xs-medium'
              : 'left-3 top-3 gap-1.5 px-3 py-1.5 text-display-sm',
          )}
        >
          <Sun aria-hidden="true" className={compact ? 'size-3' : 'size-4'} />
          {sunExposureText} SOL
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

function confidenceDisplayLabels(
  labels: VenueQuickInfoProps['labels'],
): ConfidenceDisplayLabels {
  return {
    confidence: labels.confidence,
    approximate: labels.confidenceApproximate,
    unavailable: labels.confidenceUnavailable,
  };
}
