'use client';

import { useRef, useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { Heart, Share2, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { VenueDetailContent, type VenueDetailContentLabels } from '@/components/composed/venue/VenueDetailContent';
import {
  DURATION_DETAIL_EXIT_S,
  DURATION_FAST_S,
  DURATION_SLOW_S,
  EASE_EXIT,
  EASE_SPRING,
} from '@/lib/constants/animation';
import type { SunFreshnessMeta, VenueDataDto, VenueDetailDto } from '@/lib/types/api';
import { cn } from '@/lib/utils';

export type VenueDetailOverlayLabels = VenueDetailContentLabels & {
  close: string;
  favourite: string;
  share: string;
};

export type VenueDetailOverlayProps = {
  fallbackVenue: VenueDataDto;
  detail?: VenueDetailDto;
  confidenceMeta?: SunFreshnessMeta;
  currentTime: string;
  labels: VenueDetailOverlayLabels;
  isLoading?: boolean;
  reducedMotion?: boolean;
  onDismiss: () => void;
  onRoute: () => void;
  routeDisabled?: boolean;
  mode?: 'mobile' | 'desktop';
};

const DISMISS_DRAG_PX = 140;
const FAST_SWIPE_VELOCITY = 0.55;

export function VenueDetailOverlay({
  fallbackVenue,
  detail,
  confidenceMeta,
  currentTime,
  labels,
  isLoading = false,
  reducedMotion,
  onDismiss,
  onRoute,
  routeDisabled = false,
  mode = 'mobile',
}: VenueDetailOverlayProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const shouldReduceMotion = reducedMotion ?? prefersReducedMotion;
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
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
      <motion.aside
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
          <ChromeButton label={labels.favourite}>
            <Heart aria-hidden="true" className="size-4" />
          </ChromeButton>
          <ChromeButton label={labels.share}>
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
            confidenceMeta={confidenceMeta}
            currentTime={currentTime}
            labels={labels}
            isLoading={isLoading}
            onRoute={onRoute}
            routeDisabled={routeDisabled}
            mode="desktop"
          />
        </div>
      </motion.aside>
    );
  }

  return (
    <motion.aside
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
        <ChromeButton label={labels.favourite}>
          <Heart aria-hidden="true" className="size-5" />
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
          confidenceMeta={confidenceMeta}
          currentTime={currentTime}
          labels={labels}
          isLoading={isLoading}
          onRoute={onRoute}
          routeDisabled={routeDisabled}
          mode="mobile"
        />
      </div>
    </motion.aside>
  );
}

function ChromeButton({
  label,
  children,
  disabled = false,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-pill bg-glass-standard text-text-primary shadow-button-sm backdrop-blur-standard outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:opacity-60"
    >
      {children}
    </button>
  );
}
