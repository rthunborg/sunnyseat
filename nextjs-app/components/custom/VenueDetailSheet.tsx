'use client';

import { useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import VenueDetailPage from '@/components/custom/VenueDetailPage';
import type { SunWindow } from '@/lib/types/venue';
import type { SkyCondition, SunStatus } from '@/lib/types/design-tokens';

const SHEET_DURATION = 0.3;
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
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleBackdropKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: { velocity: { y: number }; offset: { y: number } }) => {
      if (
        info.offset.y > SWIPE_CLOSE_THRESHOLD ||
        info.velocity.y > SWIPE_VELOCITY_THRESHOLD
      ) {
        handleClose();
      }
    },
    [handleClose]
  );

  const sheetVariants = {
    hidden: { y: '100%' },
    visible: { y: 0 },
    exit: { y: '100%' },
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const animationTransition = reducedMotion
    ? { duration: 0 }
    : { duration: SHEET_DURATION, ease: [0.32, 0.72, 0, 1] as const };

  return (
    <motion.div
      className="fixed inset-0 z-50 lg:flex lg:items-stretch lg:justify-end"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={animationTransition}
      onClick={handleBackdropClick}
      onKeyDown={handleBackdropKeyDown}
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
      <motion.div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-white/90 backdrop-blur-md rounded-t-card shadow-elevated overflow-y-auto lg:static lg:relative lg:w-[480px] lg:max-h-none lg:rounded-none lg:rounded-l-card"
        variants={sheetVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={animationTransition}
        drag={reducedMotion ? false : 'y'}
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        data-testid="venue-detail-sheet"
      >
        {/* Drag handle (mobile) */}
        <div
          className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing lg:hidden"
          aria-hidden="true"
        >
          <div className="w-10 h-1 bg-border-default rounded-full" />
        </div>

        <VenueDetailPage venue={venue} isModal onClose={handleClose} />
      </motion.div>
    </motion.div>
  );
}
