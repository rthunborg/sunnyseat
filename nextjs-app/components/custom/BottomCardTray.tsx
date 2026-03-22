'use client';

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { useCardTray, SNAP_POINTS } from '@/lib/context/CardTrayContext';
import { useLanguage } from '@/lib/i18n';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { VenueCard } from '@/components/custom/VenueCard';
import { CandidateCard } from '@/components/custom/CandidateCard';
import { VenueCardSkeleton } from '@/components/custom/VenueCardSkeleton';
import { SeasonalBanner } from '@/components/custom/SeasonalBanner';
import { EmptyState } from '@/components/composed/EmptyState';
import type { EmptyStateVariant } from '@/components/composed/EmptyState';
import { useIsDesktop } from '@/lib/hooks/useIsDesktop';
import { groupVenuesByStatus, countByStatus } from '@/lib/utils/groupVenuesByStatus';
import { cn } from '@/lib/utils';

/** Fraction of venues that must be shaded/overcast to trigger cloudy day mode */
export const CLOUDY_DAY_THRESHOLD = 0.8;

const GROUP_BORDER_COLOR = {
  sunny: 'border-l-sun-sunny',
  partial: 'border-l-sun-partial',
  upcoming: 'border-l-sun-upcoming',
  shaded: 'border-l-sun-shaded',
} as const;

const DOT_COLOR = {
  sunny: 'bg-sun-sunny',
  partial: 'bg-sun-partial',
  upcoming: 'bg-sun-upcoming',
  shaded: 'bg-sun-shaded',
} as const;

const SCROLL_FADE_STYLE = {
  maskImage: 'linear-gradient(to bottom, transparent, black 24px, black calc(100% - 24px), transparent)',
  WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 24px, black calc(100% - 24px), transparent)',
} as const;

interface BottomCardTrayProps {
  ambientClass?: string;
  onEmptyCta?: () => void;
  onVenueHover?: (id: string | null) => void;
}

export function BottomCardTray({ ambientClass, onEmptyCta, onVenueHover }: BottomCardTrayProps) {
  const { trayState, setTrayState, venues, isLoading, selectedVenueId, emptyReason, selectVenue } = useCardTray();
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

  const groups = useMemo(() => groupVenuesByStatus(venues), [venues]);
  const counts = useMemo(() => countByStatus(venues), [venues]);

  // Cloudy day mode: >80% of venues are shaded or overcast
  const isCloudyDay = useMemo(() => {
    if (venues.length === 0) return false;
    const shadedCount = venues.filter(
      (v) => v.current_status === 'shaded' || v.weather?.sky_condition === 'overcast'
    ).length;
    return shadedCount / venues.length > CLOUDY_DAY_THRESHOLD;
  }, [venues]);

  // Track first sunny venue for "best choice" badge
  const firstSunnyVenueId = useMemo(() => {
    const sunnyGroup = groups.find((g) => g.status === 'sunny');
    if (!sunnyGroup || sunnyGroup.venues.length === 0) return null;
    const first = sunnyGroup.venues[0];
    // Only mark verified venues as best choice
    if (first.venue.verification_status === 0) return null;
    return first.venue.id;
  }, [groups]);

  // Keyboard navigation: Escape to deselect
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && selectedVenueId) {
      selectVenue(null);
    }
  }, [selectedVenueId, selectVenue]);

  function renderSummary() {
    if (venueCount === 0) return null;

    const parts: React.ReactNode[] = [];

    // Total count
    parts.push(
      <span key="total">{t('venue.patios', { count: venueCount })}</span>
    );

    // Sunny count
    if (counts.sunny > 0) {
      parts.push(
        <span key="sunny" className="inline-flex items-center gap-1">
          <span className={cn('w-2 h-2 rounded-full inline-block', DOT_COLOR.sunny)} aria-hidden="true" />
          {t('venueGroup.summaryDot', { count: counts.sunny })}
        </span>
      );
    }

    // Upcoming count
    if (counts.upcoming > 0) {
      parts.push(
        <span key="upcoming" className="inline-flex items-center gap-1">
          <span className={cn('w-2 h-2 rounded-full inline-block', DOT_COLOR.upcoming)} aria-hidden="true" />
          {t('venueGroup.summarySoon', { count: counts.upcoming })}
        </span>
      );
    }

    return (
      <p
        data-testid="venue-summary"
        className="text-[length:var(--font-size-caption)] leading-[var(--line-height-caption)] text-text-secondary flex flex-wrap items-center gap-x-2 gap-y-1"
        aria-live="polite"
      >
        {parts.map((part, i) => (
          <span key={i} className="inline-flex items-center">
            {i > 0 && <span className="mr-2" aria-hidden="true">·</span>}
            {part}
          </span>
        ))}
      </p>
    );
  }

  function renderCloudyDayHeader() {
    if (!isCloudyDay) return null;
    return (
      <p
        data-testid="cloudy-day-header"
        className="text-[length:var(--font-size-subhead)] leading-[var(--line-height-subhead)] text-text-secondary px-2 py-2"
        role="status"
      >
        {t('seasonalBanner.cloudyDayMessage')}
      </p>
    );
  }

  function renderGroupedContent() {
    return (
      <div className="flex flex-col gap-3" data-testid="venue-groups" onKeyDown={handleKeyDown}>
        {renderCloudyDayHeader()}
        {groups.map((group) => (
          <div key={group.status} data-testid={`venue-group-${group.status}`}>
            <div
              role="heading"
              aria-level={3}
              data-testid={`group-header-${group.status}`}
              className={cn(
                'sticky top-0 z-5 py-2 px-2 mb-2',
                'text-[length:var(--font-size-subhead)] leading-[var(--line-height-subhead)] font-semibold text-text-primary',
                'border-l-[3px] bg-white/90 backdrop-blur-md',
                GROUP_BORDER_COLOR[group.status]
              )}
            >
              {t(`venueGroup.${group.status}`)}
            </div>
            <div className="flex flex-col gap-2">
              {group.venues.map((result) => {
                const emphasize = isCloudyDay && (result.current_status === 'sunny' || result.current_status === 'partial');
                return (
                <div
                  key={result.venue.id}
                  ref={(el) => setCardRef(result.venue.id, el)}
                  className={cn(emphasize && 'ring-2 ring-sun-sunny/40 rounded-card')}
                  data-cloudy-emphasis={emphasize ? 'true' : undefined}
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
                      isBestChoice={result.venue.id === firstSunnyVenueId}
                      layout={isDesktop ? 'expanded' : 'compact'}
                      onMouseEnter={isDesktop ? () => onVenueHover?.(result.venue.id) : undefined}
                      onMouseLeave={isDesktop ? () => onVenueHover?.(null) : undefined}
                    />
                  )}
                </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function getEmptyVariant(): EmptyStateVariant | null {
    if (venues.length === 0) {
      if (emptyReason === 'location') return 'location';
      if (emptyReason === 'offline') return 'offline';
      return 'area';
    }
    // All venues shaded → weather variant
    if (venues.every((v) => v.current_status === 'shaded')) return 'weather';
    return null;
  }

  function renderContent() {
    if (isLoading) {
      return <VenueCardSkeleton />;
    }

    const emptyVariant = getEmptyVariant();
    if (emptyVariant) {
      return <EmptyState variant={emptyVariant} onCta={onEmptyCta} />;
    }

    return renderGroupedContent();
  }

  // Desktop: side panel
  if (isDesktop) {
    return (
      <aside
        className={cn(
          'w-[380px] xl:w-[440px] h-full bg-surface-primary border-r border-border-default overflow-y-auto shrink-0',
          ambientClass
        )}
        style={venues.length > 0 ? SCROLL_FADE_STYLE : undefined}
        aria-label="Venue list"
        data-testid="scroll-fade-container"
      >
        <SeasonalBanner />
        {/* Side panel header */}
        <div className="px-4 pt-4 pb-3 border-b border-border-default" data-testid="side-panel-header">
          <div className="text-[length:var(--font-size-headline)] leading-[var(--line-height-headline)] font-bold text-text-primary">
            SunnySeat
          </div>
          <div data-testid="venue-count" className="mt-2">
            {renderSummary()}
          </div>
          <div
            data-testid="sort-filter-placeholder"
            className="mt-2 text-[length:var(--font-size-caption)] leading-[var(--line-height-caption)] text-text-muted"
            aria-hidden="true"
          />
        </div>

        <div className="p-4" aria-live="polite">
          {renderContent()}
        </div>
      </aside>
    );
  }

  // Mobile: bottom card tray
  return (
    <motion.div
      className={cn(
        'fixed left-0 right-0 z-40',
        'bg-white/90 backdrop-blur-md rounded-t-card shadow-elevated',
        ambientClass
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
      <SeasonalBanner />
      {/* Grab handle — tap to cycle state */}
      <div
        className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing min-h-[var(--spacing-touch-min)]"
        onClick={() => {
          if (trayState === 'collapsed') setTrayState('peeking');
          else if (trayState === 'peeking') setTrayState('half-expanded');
          else setTrayState('peeking');
        }}
        role="button"
        aria-label={trayState === 'collapsed' ? 'Visa uteplatser' : trayState === 'peeking' ? 'Visa fler' : 'Minimera'}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (trayState === 'collapsed') setTrayState('peeking');
            else if (trayState === 'peeking') setTrayState('half-expanded');
            else setTrayState('peeking');
          }
        }}
      >
        <div
          className="w-10 h-1 bg-border-default rounded-full"
          aria-hidden="true"
        />
        <div data-testid="venue-count" className="mt-2">
          {renderSummary()}
        </div>
      </div>

      {/* Card content with scroll fade */}
      <div
        className="overflow-y-auto px-4 md:px-6 pb-4"
        aria-live="polite"
        style={{
          maxHeight: 'calc(100% - 56px)',
          ...(venues.length > 0 ? SCROLL_FADE_STYLE : {}),
        }}
        data-testid="scroll-fade-container"
      >
        {renderContent()}
      </div>
    </motion.div>
  );
}
