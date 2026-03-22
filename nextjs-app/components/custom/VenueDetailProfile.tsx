'use client';

import { useCallback, useEffect } from 'react';
import type { SunExposureResult } from '@/lib/types/venue';
import { VenueProfileContent } from '@/components/composed/VenueProfileContent';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { useSlideAnimation } from '@/lib/hooks/useSlideAnimation';
import { useDragDismiss } from '@/lib/hooks/useDragDismiss';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VenueDetailProfileProps {
  venue: SunExposureResult | null;
  onClose: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * VenueDetailProfile — full-height mobile slide-up overlay showing the
 * complete venue profile. Wraps VenueProfileContent in a scrollable panel
 * with slide-up animation and swipe/back-button dismiss.
 */
export function VenueDetailProfile({
  venue,
  onClose,
  className,
}: VenueDetailProfileProps) {
  const reducedMotion = useReducedMotion();
  const { t } = useLanguage();

  const { mounted, style, onTransitionEnd } = useSlideAnimation({
    isOpen: !!venue,
    direction: 'up',
    duration: 300,
    reducedMotion,
  });

  const { handlers, dragRef } = useDragDismiss({
    axis: 'y',
    threshold: 80,
    velocityThreshold: 400,
    onDismiss: onClose,
    elasticity: 0.3,
  });

  // Escape key to close
  useEffect(() => {
    if (!venue) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [venue, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (!venue) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [venue]);

  const handleDirections = useCallback(() => {
    if (!venue) return;
    const { lat, lng } = venue.venue;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      '_blank',
    );
  }, [venue]);

  const handleShare = useCallback(async () => {
    if (!venue) return;
    const url = `${window.location.origin}/v/${venue.venue.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: venue.venue.name, url });
      } catch {
        // User cancelled or share failed silently
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [venue]);

  if (!mounted || !venue) return null;

  return (
    <>
      {/* Backdrop dim */}
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-300"
        style={{ opacity: mounted ? 1 : 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-up panel */}
      <div
        ref={dragRef}
        data-testid="venue-detail-profile"
        role="dialog"
        aria-modal="true"
        aria-label={venue.venue.name}
        style={style}
        onTransitionEnd={onTransitionEnd}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50',
          'max-h-[95dvh] rounded-t-2xl bg-white shadow-elevated',
          'flex flex-col overflow-hidden',
          className,
        )}
        {...handlers}
      >
        {/* Drag handle + back button */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-white px-4 pt-2 pb-1">
          <div className="flex-1" />
          <div className="h-1 w-10 rounded-full bg-gray-300" aria-hidden="true" />
          <div className="flex-1 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              aria-label={t('accessibility.closeDialog')}
              data-testid="detail-close-button"
              className="rounded-full p-1.5 text-text-muted hover:bg-gray-100 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <VenueProfileContent
            venue={venue}
            layout="mobile"
            onDirections={handleDirections}
            onShare={handleShare}
            onClose={onClose}
          />
        </div>
      </div>
    </>
  );
}
