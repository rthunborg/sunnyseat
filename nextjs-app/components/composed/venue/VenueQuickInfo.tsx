'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Navigation, Sun, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DURATION_DEFAULT_S,
  DURATION_FAST_S,
  EASE_DEFAULT,
  EASE_ENTER,
  EASE_EXIT,
} from '@/lib/constants/animation';
import { cn } from '@/lib/utils';

export type VenueQuickInfoMode = 'mobile' | 'desktop';
export type VenueQuickInfoDesktopPlacement = 'above' | 'pinned';

export type VenueQuickInfoProps = {
  mode: VenueQuickInfoMode;
  name: string;
  sunTimeRange?: string;
  confidencePercent?: number;
  distanceMeters?: number;
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
  labels: {
    route: string;
    moreInfo: string;
    close: string;
    photoPlaceholder: string;
    confidence: string;
    distance: string;
    loadingSun: string;
    sunUnavailable: string;
  };
};

const THUMBNAIL_MAX_INITIALS = 3;
const THUMBNAIL_MAX_ALT = 120;

export function VenueQuickInfo({
  mode,
  name,
  sunTimeRange,
  confidencePercent,
  distanceMeters,
  thumbnail,
  isLoadingSunData,
  position,
  desktopPlacement = 'above',
  onDismiss,
  onOpenDetails,
  onRoute,
  labels,
}: VenueQuickInfoProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const isDesktop = mode === 'desktop';
  const isAnchoredMobile = !isDesktop && Boolean(position);
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
              ? '-right-4 -top-4 bg-text-primary/70 text-white'
              : 'right-2 top-2 bg-glass-standard text-text-primary',
          )}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
        <VenueThumbnail
          label={labels.photoPlaceholder}
          thumbnail={thumbnail}
          confidencePercent={confidencePercent}
          compact={isAnchoredMobile}
          forcePlaceholder={isAnchoredMobile}
        />
        <div className={cn(isAnchoredMobile ? 'px-3 pt-2 pb-3' : 'p-4')}>
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
                className={cn(
                  'min-h-11 w-full text-heading-md text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:rounded-card',
                  isAnchoredMobile ? 'text-center' : 'text-left',
                )}
              >
                {name}
              </button>
              <div className={cn('mt-1 min-h-12', isAnchoredMobile && 'hidden')}>
                {isLoadingSunData ? (
                  <div aria-label={labels.loadingSun} className="space-y-2">
                    <Skeleton className="h-5 w-36 bg-surface-muted" />
                    <Skeleton className="h-5 w-44 bg-surface-muted" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-label-lg text-amber-dark">
                      {sunTimeRange ?? labels.sunUnavailable}
                    </p>
                    <p className="text-body-sm text-text-body">
                      <span className="font-bold">{labels.confidence}:</span>{' '}
                      {Math.round(confidencePercent ?? 0)}% ·{' '}
                      <span className="font-bold">{labels.distance}:</span>{' '}
                      {formatDistance(distanceMeters)}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
          <div className={cn('flex gap-2', isAnchoredMobile ? 'mt-2' : 'mt-3')}>
            <button
              type="button"
              onClick={onRoute}
              className="min-h-11 flex-1 rounded-pill gradient-route-button shadow-route-button px-4 text-label-lg uppercase text-amber-cta-text outline-none focus-visible:ring-2 focus-visible:ring-text-primary flex items-center justify-center gap-2"
            >
              <Navigation aria-hidden="true" className="size-4" />
              {labels.route}
            </button>
            <button
              type="button"
              onClick={onOpenDetails}
              className="min-h-11 rounded-card border border-drag-handle-map bg-white px-4 text-label-lg text-text-primary shadow-subtle outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
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
  confidencePercent,
  compact = false,
  forcePlaceholder = false,
}: {
  label: string;
  thumbnail?: { alt: string; initials: string; url?: string };
  confidencePercent?: number;
  compact?: boolean;
  forcePlaceholder?: boolean;
}) {
  const accessibleLabel = normalizeAlt(thumbnail?.alt, label);
  const initials = normalizeInitials(thumbnail?.initials);
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-t-card border-b border-divider bg-amber-primary venue-photo-gradient flex items-center justify-center',
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
        </div>
      )}
      {confidencePercent != null && (
        <div className="absolute left-3 top-3 rounded-badge bg-amber-gold/90 backdrop-blur-standard px-3 py-1.5 text-display-sm text-amber-cta-text shadow-subtle flex items-center gap-1.5">
          <Sun aria-hidden="true" className="size-4" />
          {Math.round(confidencePercent)}% SOL
        </div>
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
  if (shouldReduceMotion) return { opacity: 0 };
  if (isDesktop) return { opacity: 0, scale: 0.95, ...desktopTransform(desktopPlacement) };
  if (isAnchoredMobile) return { opacity: 0, scale: 0.95, x: '-50%', y: 'calc(-100% - 56px)' };
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
  if (shouldReduceMotion) return { opacity: 1 };
  if (isDesktop) return { opacity: 1, scale: 1, ...desktopTransform(desktopPlacement) };
  if (isAnchoredMobile) return { opacity: 1, scale: 1, x: '-50%', y: 'calc(-100% - 56px)' };
  return { opacity: 1, y: 0 };
}

function quickInfoExit(
  isDesktop: boolean,
  isAnchoredMobile: boolean,
  shouldReduceMotion: boolean,
  desktopPlacement: VenueQuickInfoDesktopPlacement,
) {
  const transition = { duration: DURATION_FAST_S, ease: EASE_EXIT };
  if (shouldReduceMotion) return { opacity: 0, transition };
  if (isDesktop) {
    return { opacity: 0, scale: 0.95, ...desktopTransform(desktopPlacement), transition };
  }
  if (isAnchoredMobile) {
    return { opacity: 0, scale: 0.95, x: '-50%', y: 'calc(-100% - 56px)', transition };
  }
  return { opacity: 0, y: '100%', transition };
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
