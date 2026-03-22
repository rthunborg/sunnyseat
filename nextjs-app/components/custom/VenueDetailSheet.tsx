'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { useSlideAnimation } from '@/lib/hooks/useSlideAnimation';
import { useDragDismiss } from '@/lib/hooks/useDragDismiss';
import VenueDetailPage from '@/components/custom/VenueDetailPage';
import type { SunWindow } from '@/lib/types/venue';
import type { SkyCondition, SunStatus } from '@/lib/types/design-tokens';

const SHEET_DURATION = 300;
const SWIPE_CLOSE_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 300;

interface VenueDetailSheetProps {
  venue: {
    id: string;
    name: string;
    slug: string;
    neighborhood: string;
    lat: number;
    lng: number;
    todayWindows: SunWindow[];
    tomorrowWindows: SunWindow[];
    currentSkyCondition: SkyCondition;
    currentSunStatus: SunStatus;
    is_partner?: boolean;
    booking_url?: string | null;
    website_url?: string | null;
  };
}

export function VenueDetailSheet({ venue }: VenueDetailSheetProps) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const { mounted, style, onTransitionEnd } = useSlideAnimation({
    isOpen: true, // Always open when rendered (parent controls mount)
    direction: 'up',
    duration: SHEET_DURATION,
    reducedMotion,
  });

  const { handlers, dragRef } = useDragDismiss({
    axis: 'y',
    threshold: SWIPE_CLOSE_THRESHOLD,
    velocityThreshold: SWIPE_VELOCITY_THRESHOLD,
    onDismiss: handleClose,
    elasticity: 0.2,
  });

  // Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 lg:flex lg:items-stretch lg:justify-end"
      style={{ opacity: mounted ? 1 : 0, transition: `opacity ${SHEET_DURATION}ms ease` }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={venue.name}
      data-testid="venue-detail-sheet-backdrop"
    >
      {/* Backdrop overlay — mobile: blur + dim; desktop: dim only */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[4px] lg:backdrop-blur-none"
        aria-hidden="true"
      />

      {/* Sheet — mobile: bottom sheet; desktop: side panel */}
      <div
        ref={dragRef}
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-surface-primary rounded-t-card shadow-elevated overflow-y-auto lg:static lg:relative lg:w-[480px] lg:max-h-none lg:rounded-none lg:rounded-l-card"
        style={style}
        onTransitionEnd={onTransitionEnd}
        data-testid="venue-detail-sheet"
        {...handlers}
      >
        {/* Drag handle (mobile) */}
        <div
          className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing lg:hidden"
          aria-hidden="true"
        >
          <div className="w-10 h-1 bg-border-default rounded-full" />
        </div>

        <VenueDetailPage venue={venue} isModal onClose={handleClose} />
      </div>
    </div>
  );
}
