'use client';

import Image from 'next/image';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

/** Deterministic color based on venue name, used for fallback gradient */
const FALLBACK_COLORS = [
  ['from-emerald-400', 'to-teal-600'],
  ['from-sky-400', 'to-indigo-600'],
  ['from-amber-400', 'to-orange-600'],
  ['from-rose-400', 'to-pink-600'],
  ['from-violet-400', 'to-purple-600'],
  ['from-lime-400', 'to-green-600'],
] as const;

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export type VenuePhotoAspectRatio = '4:3' | '16:9' | 'square';

export interface VenuePhotoProps {
  /** URL of the venue photo. If null/undefined, shows fallback. */
  src?: string | null;
  /** Venue name — used for alt text and fallback initial */
  venueName: string;
  /** Aspect ratio of the container */
  aspectRatio?: VenuePhotoAspectRatio;
  /** Additional CSS classes for the outer container */
  className?: string;
  /** Image sizes hint for Next.js Image (responsive widths) */
  sizes?: string;
  /** Priority loading (above-the-fold images) */
  priority?: boolean;
}

const ASPECT_CLASSES: Record<VenuePhotoAspectRatio, string> = {
  '4:3': 'aspect-[4/3]',
  '16:9': 'aspect-video',
  'square': 'aspect-square',
};

/**
 * VenuePhoto — consistent image display with fallback.
 * Shows the venue photo with lazy loading, or a colored gradient
 * with the venue's first letter when no photo is available.
 */
export function VenuePhoto({
  src,
  venueName,
  aspectRatio = '4:3',
  className,
  sizes = '(max-width: 768px) 50vw, 280px',
  priority = false,
}: VenuePhotoProps) {
  const [imgError, setImgError] = useState(false);
  const showFallback = !src || imgError;

  const fallback = useMemo(() => {
    const index = hashString(venueName) % FALLBACK_COLORS.length;
    return {
      colors: FALLBACK_COLORS[index],
      initial: venueName.charAt(0).toUpperCase() || '?',
    };
  }, [venueName]);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-muted',
        ASPECT_CLASSES[aspectRatio],
        className,
      )}
      data-testid="venue-photo"
    >
      {showFallback ? (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-gradient-to-br',
            fallback.colors[0],
            fallback.colors[1],
          )}
          data-testid="venue-photo-fallback"
          aria-hidden="true"
        >
          <span className="text-3xl font-bold text-white/90 select-none">
            {fallback.initial}
          </span>
        </div>
      ) : (
        <Image
          src={src}
          alt={venueName}
          fill
          className="object-cover"
          sizes={sizes}
          priority={priority}
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}
