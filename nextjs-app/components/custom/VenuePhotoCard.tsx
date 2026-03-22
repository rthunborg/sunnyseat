'use client';

import { useCallback } from 'react';
import type { SunStatus, SkyCondition } from '@/lib/types/design-tokens';
import { VenuePhoto } from '@/components/ui/VenuePhoto';
import { formatDistance } from '@/lib/utils/formatDistance';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VenuePhotoCardVariant = 'carousel' | 'popup';

export interface VenuePhotoCardProps {
  venueId: string;
  venueName: string;
  neighborhood: string;
  imageUrl?: string | null;
  sunStatus: SunStatus;
  skyCondition?: SkyCondition;
  distanceMeters?: number;
  isPartner?: boolean;
  /** 'carousel' = tall square-ish card for horizontal scroll; 'popup' = wider landscape for map popup */
  variant?: VenuePhotoCardVariant;
  highlighted?: boolean;
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Status styling maps
// ---------------------------------------------------------------------------

const STATUS_DOT_CLASS: Record<SunStatus, string> = {
  sunny: 'bg-sun-sunny',
  partial: 'bg-sun-partial',
  shaded: 'bg-sun-shaded',
  upcoming: 'bg-sun-upcoming',
};

const STATUS_RING_CLASS: Record<SunStatus, string> = {
  sunny: 'ring-sun-sunny/30',
  partial: 'ring-sun-partial/30',
  shaded: 'ring-sun-shaded/30',
  upcoming: 'ring-sun-upcoming/30',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * VenuePhotoCard — image-forward venue card used in the mobile carousel
 * and desktop map popups.
 *
 * Carousel variant: ~160×200 portrait card for horizontal scroll.
 * Popup variant: ~280×auto landscape card for MapLibre popups.
 */
export function VenuePhotoCard({
  venueId,
  venueName,
  neighborhood,
  imageUrl,
  sunStatus,
  skyCondition,
  distanceMeters,
  isPartner = false,
  variant = 'carousel',
  highlighted = false,
  onClick,
  onKeyDown,
  className,
}: VenuePhotoCardProps) {
  const { t, language } = useLanguage();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (onKeyDown) {
        onKeyDown(e);
        return;
      }
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick();
      }
    },
    [onClick, onKeyDown],
  );

  const isCarousel = variant === 'carousel';

  const statusLabel =
    sunStatus === 'sunny'
      ? t('status.sunny')
      : sunStatus === 'partial'
        ? t('status.partial')
        : sunStatus === 'upcoming'
          ? t('status.upcoming')
          : t('status.shaded');

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${venueName}, ${statusLabel}`}
      data-testid="venue-photo-card"
      data-venue-id={venueId}
      data-variant={variant}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        // Base
        'group relative flex cursor-pointer overflow-hidden rounded-2xl bg-white',
        'transition-shadow transition-transform duration-200 ease-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        // Variant sizing
        isCarousel
          ? 'w-40 shrink-0 flex-col shadow-card'
          : 'w-[280px] flex-col shadow-elevated',
        // Highlighted state
        highlighted && 'ring-2 ring-offset-2 scale-[1.03]',
        highlighted && STATUS_RING_CLASS[sunStatus],
        // Partner glow
        isPartner && sunStatus === 'sunny' && 'ring-1 ring-amber-400/50',
        className,
      )}
    >
      {/* Photo section */}
      <VenuePhoto
        src={imageUrl}
        venueName={venueName}
        aspectRatio={isCarousel ? '4:3' : '16:9'}
        sizes={isCarousel ? '160px' : '280px'}
        className="w-full"
      />

      {/* Gradient scrim over photo bottom for name readability */}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0',
          isCarousel ? 'top-1/3' : 'top-1/2',
          'bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent',
        )}
        aria-hidden="true"
      />

      {/* Status indicator dot — top-right of photo */}
      <span
        className={cn(
          'absolute top-2 right-2 h-3 w-3 rounded-full border-2 border-white shadow-sm',
          STATUS_DOT_CLASS[sunStatus],
        )}
        aria-hidden="true"
        data-testid="status-dot"
      />

      {/* Partner badge */}
      {isPartner && (
        <span
          className="absolute top-2 left-2 rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 shadow-sm"
          data-testid="partner-badge"
        >
          Partner
        </span>
      )}

      {/* Text overlay — positioned at bottom of photo */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 px-3 pb-2.5 pt-6">
        {/* Venue name */}
        <h3
          className={cn(
            'truncate font-semibold text-white',
            isCarousel ? 'text-sm' : 'text-base',
          )}
          data-testid="venue-name"
        >
          {venueName}
        </h3>

        {/* Info line: neighborhood + distance */}
        <p
          className={cn(
            'flex items-center gap-1.5 text-white/80',
            isCarousel ? 'text-[11px]' : 'text-xs',
          )}
          data-testid="venue-info-line"
        >
          {neighborhood && (
            <span className="truncate">{neighborhood}</span>
          )}
          {neighborhood && distanceMeters != null && (
            <span aria-hidden="true">·</span>
          )}
          {distanceMeters != null && (
            <span className="shrink-0">
              {formatDistance(distanceMeters, language)}
            </span>
          )}
        </p>
      </div>
    </article>
  );
}
