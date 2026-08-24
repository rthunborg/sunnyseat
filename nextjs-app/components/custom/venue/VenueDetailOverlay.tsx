'use client';

import { useCallback, useRef, useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { Heart, Share2, X } from 'lucide-react';
import * as m from 'motion/react-m';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { VenueDetailContent, type VenueDetailContentLabels } from '@/components/composed/venue/VenueDetailContent';
import { ShareModal } from '@/components/custom/venue/ShareModal';
import {
  DURATION_DETAIL_EXIT_S,
  DURATION_FAST_S,
  DURATION_SLOW_S,
  EASE_EXIT,
  EASE_SPRING,
} from '@/lib/constants/animation';
import type { VenueDataDto, VenueDetailDto } from '@/lib/types/api';
import { cn } from '@/lib/utils';
import { currentVenueShareUrl, shareVenueNatively } from '@/lib/utils/share';

export type VenueDetailOverlayLabels = VenueDetailContentLabels & {
  close: string;
  favourite: string;
  favouriteAdd?: string;
  favouriteRemove?: string;
  share: string;
  shareText?: string;
};

export type VenueDetailOverlayProps = {
  fallbackVenue: VenueDataDto;
  detail?: VenueDetailDto;
  currentTime: string;
  selectedInstant?: Date;
  isLivePlannerTime?: boolean;
  labels: VenueDetailOverlayLabels;
  isLoading?: boolean;
  reducedMotion?: boolean;
  onDismiss: () => void;
  onRoute: () => void;
  routeEstimateLabel?: string;
  isRouteLoading?: boolean;
  onFavouriteToggle?: () => void;
  isFavourite?: boolean;
  routeDisabled?: boolean;
  mode?: 'mobile' | 'desktop';
  locale?: string;
  /** Story 9.5 AC3: the distance shown on the detail's Avstånd card is
   * centrum-relative (Gothenburg-centrum geolocation fallback), not a real
   * personal fix — thread through so the card qualifies it honestly. */
  distanceIsApproximate?: boolean;
  feedbackSlot?: React.ReactNode;
  reviewSlot?: React.ReactNode;
};

const DISMISS_DRAG_PX = 140;
const FAST_SWIPE_VELOCITY = 0.55;

export function VenueDetailOverlay({
  fallbackVenue,
  detail,
  currentTime,
  selectedInstant,
  isLivePlannerTime = true,
  labels,
  isLoading = false,
  reducedMotion,
  onDismiss,
  onRoute,
  routeEstimateLabel,
  isRouteLoading = false,
  onFavouriteToggle,
  isFavourite = false,
  routeDisabled = false,
  mode = 'mobile',
  locale,
  distanceIsApproximate = false,
  feedbackSlot,
  reviewSlot,
}: VenueDetailOverlayProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const shouldReduceMotion = reducedMotion ?? prefersReducedMotion;
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  const shareSlug = detail?.slug ?? fallbackVenue.slug ?? fallbackVenue.venueSlug;
  const shareTitle = fallbackVenue.venueName;
  const shareText = labels.shareText
    ? // Use a replacer FUNCTION so a venue name containing `$&`/`$1`/`` $` ``/`$'`
      // (String.prototype.replace special replacement patterns) is inserted
      // verbatim rather than being interpreted.
      labels.shareText.replace('{name}', () => shareTitle)
    : undefined;

  // Capability-gated share: native Web Share sheet where available (mobile),
  // otherwise the copy-link + targets modal (desktop). The decision is capability
  // based (does `navigator.share` exist?), never a viewport guess. Client-only:
  // the URL is read from `window.location` at click time, never during render.
  const handleShare = useCallback(async () => {
    const url = currentVenueShareUrl(shareSlug);
    if (!url) return;
    const outcome = await shareVenueNatively({ title: shareTitle, text: shareText, url });
    // `shared`/`cancelled` are terminal (the OS sheet handled it or the user
    // dismissed it). `unsupported`/`failed` fall back to the modal so the button
    // is never dead and no rejection is left unhandled.
    if (outcome === 'unsupported' || outcome === 'failed') {
      setShareUrl(url);
      setShareOpen(true);
    }
  }, [shareSlug, shareTitle, shareText]);
  const enterTransition = {
    duration: shouldReduceMotion ? DURATION_FAST_S : DURATION_SLOW_S,
    ease: shouldReduceMotion ? EASE_EXIT : EASE_SPRING,
  };
  const exitTransition = {
    duration: shouldReduceMotion ? DURATION_FAST_S : DURATION_DETAIL_EXIT_S,
    ease: EASE_EXIT,
  };

  const bindDrag = useDrag(
    ({ event, movement: [, my], velocity: [, vy], direction: [, dy], active, last }) => {
      const target = event.target instanceof Element ? event.target : null;
      const isBodyDrag = Boolean(target?.closest('[data-venue-detail-scroll-body="true"]'));
      const bodyScrollTop = scrollBodyRef.current?.scrollTop ?? 0;
      if (last) setDragY(0);
      if ((isBodyDrag && bodyScrollTop > 0) || my <= 0) return;
      if (active && !shouldReduceMotion) {
        setDragY(Math.min(DISMISS_DRAG_PX, my));
      }
      if (!last) return;

      if (dy > 0 && (my >= DISMISS_DRAG_PX || vy >= FAST_SWIPE_VELOCITY)) {
        onDismiss();
      }
    },
    {
      axis: 'y',
      bounds: { top: 0, bottom: DISMISS_DRAG_PX },
      rubberband: 0.12,
      pointer: { capture: false },
    },
  );

  if (mode === 'desktop') {
    return (
      <m.aside
        role="dialog"
        aria-modal="false"
        aria-label={fallbackVenue.venueName}
        data-testid="desktop-venue-detail-panel"
        data-reduced-motion={String(shouldReduceMotion)}
        className="absolute bottom-0 right-0 top-0 z-bottom-sheet-full hidden w-venue-detail-panel flex-col overflow-hidden bg-surface-cream text-text-primary shadow-card lg:flex"
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: '100%' }}
        animate={shouldReduceMotion ? { opacity: 1, transition: enterTransition } : { opacity: 1, x: 0, transition: enterTransition }}
        exit={shouldReduceMotion ? { opacity: 0, transition: exitTransition } : { opacity: 0, x: '100%', transition: exitTransition }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="absolute right-4 top-4 z-floating-buttons flex gap-2">
          <ChromeButton
            label={
              isFavourite
                ? (labels.favouriteRemove ?? labels.favourite)
                : (labels.favouriteAdd ?? labels.favourite)
            }
            active={isFavourite}
            pressed={onFavouriteToggle ? isFavourite : undefined}
            onClick={onFavouriteToggle}
            disabled={!onFavouriteToggle}
          >
            <Heart aria-hidden="true" className={cn('size-4', isFavourite && 'fill-current')} />
          </ChromeButton>
          <ChromeButton label={labels.share} onClick={handleShare}>
            <Share2 aria-hidden="true" className="size-4" />
          </ChromeButton>
          <ChromeButton label={labels.close} onClick={onDismiss}>
            <X aria-hidden="true" className="size-4" />
          </ChromeButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <VenueDetailContent
            fallbackVenue={fallbackVenue}
            detail={detail}
            currentTime={currentTime}
            selectedInstant={selectedInstant}
            isLivePlannerTime={isLivePlannerTime}
            labels={labels}
            distanceIsApproximate={distanceIsApproximate}
            isLoading={isLoading}
            onRoute={onRoute}
            routeEstimateLabel={routeEstimateLabel}
            isRouteLoading={isRouteLoading}
            routeDisabled={routeDisabled}
            mode="desktop"
            locale={locale}
            feedbackSlot={feedbackSlot}
            reviewSlot={reviewSlot}
          />
        </div>
        <ShareModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          venueName={shareTitle}
          url={shareUrl}
        />
      </m.aside>
    );
  }

  return (
    <m.aside
      role="dialog"
      aria-modal="false"
      aria-label={fallbackVenue.venueName}
      data-testid="mobile-venue-detail-sheet"
      data-reduced-motion={String(shouldReduceMotion)}
      className={cn(
        'absolute inset-x-0 bottom-0 top-12 z-bottom-sheet-full flex flex-col overflow-hidden rounded-t-sheet-full bg-surface-cream text-text-primary shadow-sheet-full-up lg:hidden',
      )}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: '100%' }}
      animate={shouldReduceMotion ? { opacity: 1, transition: enterTransition } : { opacity: 1, y: dragY, transition: enterTransition }}
      exit={shouldReduceMotion ? { opacity: 0, transition: exitTransition } : { opacity: 0, y: '100%', transition: exitTransition }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="absolute right-5 top-16 z-floating-buttons flex gap-3">
        <ChromeButton
          label={
            isFavourite
              ? (labels.favouriteRemove ?? labels.favourite)
              : (labels.favouriteAdd ?? labels.favourite)
          }
          active={isFavourite}
          pressed={onFavouriteToggle ? isFavourite : undefined}
          onClick={onFavouriteToggle}
          disabled={!onFavouriteToggle}
        >
          <Heart aria-hidden="true" className={cn('size-5', isFavourite && 'fill-current')} />
        </ChromeButton>
        <ChromeButton label={labels.share} onClick={handleShare}>
          <Share2 aria-hidden="true" className="size-5" />
        </ChromeButton>
        <ChromeButton label={labels.close} onClick={onDismiss}>
          <X aria-hidden="true" className="size-5" />
        </ChromeButton>
      </div>
      <button
        type="button"
        data-testid="mobile-venue-detail-handle"
        aria-label={labels.close}
        {...bindDrag()}
        onClick={onDismiss}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Escape') {
            event.preventDefault();
            onDismiss();
          }
        }}
        className="flex min-h-11 shrink-0 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        style={{ touchAction: 'none' }}
      >
        <span
          aria-hidden="true"
          className="h-[var(--size-drag-pill-h)] w-[var(--size-drag-pill-w-lg)] rounded-pill bg-drag-handle"
        />
      </button>
      <div
        ref={scrollBodyRef}
        data-venue-detail-scroll-body="true"
        {...bindDrag()}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        style={{ touchAction: 'pan-y' }}
      >
        <VenueDetailContent
          fallbackVenue={fallbackVenue}
          detail={detail}
          currentTime={currentTime}
          selectedInstant={selectedInstant}
          isLivePlannerTime={isLivePlannerTime}
          labels={labels}
          distanceIsApproximate={distanceIsApproximate}
          isLoading={isLoading}
          onRoute={onRoute}
          routeEstimateLabel={routeEstimateLabel}
          isRouteLoading={isRouteLoading}
          routeDisabled={routeDisabled}
          mode="mobile"
          locale={locale}
          feedbackSlot={feedbackSlot}
          reviewSlot={reviewSlot}
        />
      </div>
      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        venueName={shareTitle}
        url={shareUrl}
      />
    </m.aside>
  );
}

function ChromeButton({
  label,
  children,
  disabled = false,
  active = false,
  pressed,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  pressed?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex size-11 items-center justify-center rounded-pill bg-glass-standard text-text-primary shadow-button-sm backdrop-blur-standard outline-none transition-colors duration-fast ease-default focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none disabled:opacity-60',
        active && 'bg-glass-lavender',
      )}
    >
      {children}
    </button>
  );
}
