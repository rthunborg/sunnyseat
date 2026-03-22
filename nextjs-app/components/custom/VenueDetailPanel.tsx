'use client';

import { useCallback, useEffect } from 'react';
import type { SunExposureResult } from '@/lib/types/venue';
import { VenueProfileContent } from '@/components/composed/VenueProfileContent';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { useSlideAnimation } from '@/lib/hooks/useSlideAnimation';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VenueDetailPanelProps {
  venue: SunExposureResult | null;
  onClose: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * VenueDetailPanel — desktop right-side panel (~400-480px) that slides in
 * when a venue is opened from the MapPopup.
 *
 * Wraps VenueProfileContent with a close button and slide-in animation.
 * The parent layout (HomeScreen) resizes the map to make room.
 */
export function VenueDetailPanel({
  venue,
  onClose,
  className,
}: VenueDetailPanelProps) {
  const reducedMotion = useReducedMotion();
  const { t } = useLanguage();

  const { mounted, style, onTransitionEnd } = useSlideAnimation({
    isOpen: !!venue,
    direction: 'right',
    duration: 300,
    reducedMotion,
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
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard not available
    }
  }, [venue]);

  if (!mounted || !venue) return null;

  return (
    <aside
      data-testid="venue-detail-panel"
      role="complementary"
      aria-label={venue.venue.name}
      style={style}
      onTransitionEnd={onTransitionEnd}
      className={cn(
        'h-full w-[420px] max-w-[50vw] flex-shrink-0',
        'border-l border-gray-200 bg-white',
        'flex flex-col overflow-hidden',
        className,
      )}
    >
      {/* Close button */}
      <div className="flex justify-end px-4 pt-3 pb-0">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('accessibility.closeDialog')}
          data-testid="panel-close-button"
          className="rounded-full p-1.5 text-text-muted hover:bg-gray-100 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <VenueProfileContent
          venue={venue}
          layout="desktop"
          onDirections={handleDirections}
          onShare={handleShare}
          onClose={onClose}
        />
      </div>
    </aside>
  );
}
