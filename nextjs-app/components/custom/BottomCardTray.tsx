'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useCardTray, SNAP_POINTS } from '@/lib/context/CardTrayContext';
import { useLanguage } from '@/lib/i18n';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { VenueCard } from '@/components/custom/VenueCard';
import { CandidateCard } from '@/components/custom/CandidateCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { cn } from '@/lib/utils';

export function BottomCardTray() {
  const { trayState, setTrayState, venues, isLoading, selectedVenueId } = useCardTray();
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const y = useMotionValue(0);

  const snapHeights = useMemo(() => {
    if (typeof window === 'undefined') return { peeking: 0, 'half-expanded': 0, collapsed: 0 };
    const vh = window.innerHeight;
    return {
      collapsed: vh * (1 - SNAP_POINTS.collapsed / 100),
      peeking: vh * (1 - SNAP_POINTS.peeking / 100),
      'half-expanded': vh * (1 - SNAP_POINTS['half-expanded'] / 100),
    };
  }, []);

  const currentTop = snapHeights[trayState] ?? snapHeights.peeking;

  useEffect(() => {
    if (isDesktop) return;
    if (reducedMotion) {
      y.set(currentTop);
    } else {
      animate(y, currentTop, { stiffness: 300, damping: 30 });
    }
  }, [currentTop, reducedMotion, y, isDesktop]);

  // Scroll to selected venue card
  useEffect(() => {
    if (!selectedVenueId) return;
    const el = cardRefs.current.get(selectedVenueId);
    if (el) {
      el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    }
  }, [selectedVenueId, reducedMotion]);

  const handleDragEnd = useCallback(
    (_: unknown, info: { velocity: { y: number }; point: { y: number } }) => {
      const currentY = y.get();
      const velocity = info.velocity.y;

      // Find nearest snap point
      const points = [snapHeights['half-expanded'], snapHeights.peeking, snapHeights.collapsed];
      let target = currentY;

      if (Math.abs(velocity) > 200) {
        // Velocity-based: flick up or down
        if (velocity < 0) {
          // Swiping up
          target = points.filter((p) => p < currentY).pop() ?? points[0];
        } else {
          // Swiping down
          target = points.find((p) => p > currentY) ?? points[points.length - 1];
        }
      } else {
        // Position-based: snap to nearest
        let minDist = Infinity;
        for (const p of points) {
          const dist = Math.abs(currentY - p);
          if (dist < minDist) {
            minDist = dist;
            target = p;
          }
        }
      }

      // Map target back to state
      if (target === snapHeights['half-expanded']) setTrayState('half-expanded');
      else if (target === snapHeights.peeking) setTrayState('peeking');
      else setTrayState('collapsed');

      if (reducedMotion) {
        y.set(target);
      } else {
        animate(y, target, { stiffness: 300, damping: 30 });
      }
    },
    [snapHeights, setTrayState, y, reducedMotion]
  );

  const venueCount = venues.length;

  const setCardRef = useCallback((venueId: string, el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(venueId, el);
    } else {
      cardRefs.current.delete(venueId);
    }
  }, []);

  // Desktop: side panel
  if (isDesktop) {
    return (
      <aside
        className="w-[380px] h-full bg-surface-primary border-r border-border-default overflow-y-auto shrink-0"
        aria-label="Venue list"
      >
        <div className="p-4" aria-live="polite">
          <p data-testid="venue-count" className="text-[length:var(--font-size-subhead)] leading-[var(--line-height-subhead)] font-semibold text-text-primary mb-3">
            {t('venue.patios', { count: venueCount })}
          </p>
          {renderContent()}
        </div>
      </aside>
    );
  }

  function renderContent() {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-[120px] w-full rounded-card" />
          <Skeleton className="h-[120px] w-full rounded-card" />
          <Skeleton className="h-[120px] w-full rounded-card" />
        </div>
      );
    }

    if (venues.length === 0) {
      return (
        <p data-testid="empty-state" className="text-center text-text-secondary py-8">{t('home.noPatiosFound')}</p>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        {venues.map((result) => (
          <div
            key={result.venue.id}
            ref={(el) => setCardRef(result.venue.id, el)}
          >
            {result.venue.verification_status === 0 ? (
              <CandidateCard
                venueId={result.venue.id}
                venueName={result.venue.name}
                neighborhood={result.venue.neighborhood}
              />
            ) : (
              <VenueCard
                venueId={result.venue.id}
                venueName={result.venue.name}
                neighborhood={result.venue.neighborhood}
                variant={result.current_status}
                sunExposurePercent={result.sun_exposure_percent}
                distanceMeters={result.distance_meters ?? 0}
                skyCondition={result.weather?.sky_condition ?? 'unavailable'}
                confidence={result.confidence}
                slug={result.venue.slug}
                lat={result.venue.lat}
                lng={result.venue.lng}
                highlighted={result.venue.id === selectedVenueId}
                sunWindows={result.windows}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // Mobile: bottom card tray
  return (
    <motion.div
      className={cn(
        'fixed left-0 right-0 z-20',
        'bg-surface-primary rounded-t-card shadow-elevated'
      )}
      style={{ top: y, bottom: 0 }}
      drag="y"
      dragConstraints={{
        top: snapHeights['half-expanded'],
        bottom: snapHeights.collapsed,
      }}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      aria-label="Venue card tray"
    >
      {/* Grab handle */}
      <div
        className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing min-h-[var(--spacing-touch-min)]"
      >
        <div
          className="w-10 h-1 bg-border-default rounded-full"
          aria-hidden="true"
        />
        <p data-testid="venue-count" className="mt-2 text-[length:var(--font-size-caption)] leading-[var(--line-height-caption)] text-text-secondary">
          {t('venue.patios', { count: venueCount })}
        </p>
      </div>

      {/* Card content */}
      <div className="overflow-y-auto px-4 md:px-6 pb-4" aria-live="polite" style={{ maxHeight: 'calc(100% - 56px)' }}>
        {renderContent()}
      </div>
    </motion.div>
  );
}
