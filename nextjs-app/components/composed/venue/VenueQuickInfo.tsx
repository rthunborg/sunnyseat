'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Navigation, Sun, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type VenueQuickInfoMode = 'mobile' | 'desktop';

export type VenueQuickInfoProps = {
  mode: VenueQuickInfoMode;
  name: string;
  sunTimeRange?: string;
  confidencePercent?: number;
  distanceMeters?: number;
  isLoadingSunData: boolean;
  position?: { x: number; y: number };
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
  };
};

const ENTER_MS = 0.2;
const EXIT_MS = 0.15;
const SWAP_MS = 0.15;

export function VenueQuickInfo({
  mode,
  name,
  sunTimeRange,
  confidencePercent,
  distanceMeters,
  isLoadingSunData,
  position,
  onDismiss,
  onOpenDetails,
  onRoute,
  labels,
}: VenueQuickInfoProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const isDesktop = mode === 'desktop';
  const desktopStyle = isDesktop && position
    ? {
        left: position.x,
        top: position.y,
        transformOrigin: 'bottom center',
      }
    : undefined;

  return (
    <AnimatePresence>
      <motion.aside
        role="dialog"
        aria-label={name}
        data-testid="venue-quick-info"
        data-quickinfo="true"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'absolute z-glass-panel bg-surface-cream shadow-card text-text-primary',
          'overflow-hidden rounded-card outline-none',
          isDesktop
            ? 'hidden lg:block w-[280px]'
            : 'left-4 right-4 bottom-[calc(var(--size-mobile-nav-h)+118px)] lg:hidden',
        )}
        style={desktopStyle}
        initial={quickInfoInitial(isDesktop, shouldReduceMotion)}
        animate={quickInfoAnimate(isDesktop)}
        exit={quickInfoExit(isDesktop, shouldReduceMotion)}
        transition={{ duration: ENTER_MS, ease: 'easeOut' }}
      >
        {isDesktop && (
          <button
            type="button"
            aria-label={labels.close}
            onClick={onDismiss}
            className="absolute right-2 top-2 z-base size-11 rounded-pill bg-glass-standard backdrop-blur-[6px] shadow-button-sm flex items-center justify-center text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
        <PlaceholderPhoto label={labels.photoPlaceholder} confidencePercent={confidencePercent} />
        <div className="p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: SWAP_MS, ease: 'easeInOut' }}
            >
              <button
                type="button"
                onClick={onOpenDetails}
                className="min-h-11 w-full text-left text-heading-md text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:rounded-card"
              >
                {name}
              </button>
              <div className="mt-1 min-h-12">
                {isLoadingSunData ? (
                  <div aria-label={labels.loadingSun} className="space-y-2">
                    <Skeleton className="h-5 w-36 bg-surface-muted" />
                    <Skeleton className="h-5 w-44 bg-surface-muted" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-label-lg text-amber-dark">
                      {sunTimeRange}
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
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onRoute}
              className="min-h-11 flex-1 rounded-pill gradient-route-button shadow-route-button px-4 text-label-lg text-amber-cta-text outline-none focus-visible:ring-2 focus-visible:ring-text-primary flex items-center justify-center gap-2"
            >
              <Navigation aria-hidden="true" className="size-4" />
              {labels.route}
            </button>
            <button
              type="button"
              onClick={onOpenDetails}
              className="min-h-11 rounded-pill bg-white px-4 text-label-lg text-text-primary shadow-subtle outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
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
      </motion.aside>
    </AnimatePresence>
  );
}

function PlaceholderPhoto({
  label,
  confidencePercent,
}: {
  label: string;
  confidencePercent?: number;
}) {
  return (
    <div className="relative h-24 overflow-hidden border-b border-divider bg-amber-primary venue-photo-gradient flex items-center justify-center">
      <div
        aria-hidden="true"
        className="absolute left-8 top-8 h-16 w-32 -rotate-6 rounded-venue-image border border-white/40 bg-surface-cream/20 shadow-subtle"
      />
      <div
        aria-hidden="true"
        className="absolute right-8 top-5 h-20 w-20 rotate-12 rounded-badge border border-white/30 bg-amber-pale/35"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-14 bg-surface-cream/20"
      />
      <span className="sr-only">{label}</span>
      {confidencePercent != null && (
        <div className="absolute left-3 top-3 rounded-badge bg-amber-gold/90 backdrop-blur-[6px] px-3 py-1.5 text-display-sm text-amber-cta-text shadow-subtle flex items-center gap-1.5">
          <Sun aria-hidden="true" className="size-4" />
          {Math.round(confidencePercent)}% SOL
        </div>
      )}
    </div>
  );
}

function quickInfoInitial(isDesktop: boolean, shouldReduceMotion: boolean) {
  if (shouldReduceMotion) return { opacity: 0 };
  if (isDesktop) return { opacity: 0, scale: 0.95, x: '-50%', y: 'calc(-100% - 56px)' };
  return {
    opacity: 0,
    y: '100%',
    transition: { duration: EXIT_MS, ease: [0.42, 0, 1, 1] as [number, number, number, number] },
  };
}

function quickInfoAnimate(isDesktop: boolean) {
  if (isDesktop) return { opacity: 1, scale: 1, x: '-50%', y: 'calc(-100% - 56px)' };
  return { opacity: 1, y: 0 };
}

function quickInfoExit(isDesktop: boolean, shouldReduceMotion: boolean) {
  if (shouldReduceMotion) return { opacity: 0 };
  if (isDesktop) return { opacity: 0, scale: 0.95, x: '-50%', y: 'calc(-100% - 56px)' };
  return { opacity: 0, y: '100%' };
}

function formatDistance(meters?: number): string {
  if (!Number.isFinite(meters)) return '–';
  if ((meters ?? 0) >= 1000) return `${((meters ?? 0) / 1000).toFixed(1)} km`;
  return `${Math.round(meters ?? 0)} m`;
}
