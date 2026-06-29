'use client';

import { WifiOff } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { DURATION_DEFAULT_S, EASE_DEFAULT } from '@/lib/constants/animation';

/**
 * Top-of-screen "Ingen anslutning" banner for the offline shell
 * (Story 7.3 Tasks 3, 9). Rendered above the cached map background while the
 * device is offline (or the dev `map-primary-offline` state is forced) so the
 * app communicates that connectivity is required (AC3) and dismisses on
 * reconnect (AC4).
 *
 * Kept permanently mounted by its caller so `AnimatePresence` can play both
 * the appear (offline) and dismiss (reconnect) transitions — a short
 * slide-down + fade on the `duration-default` token, gated by
 * `prefers-reduced-motion`. As a polite live region the message is announced
 * once when it mounts; it carries an icon (decorative) plus the localized
 * text so meaning never rests on colour alone.
 */
export function OfflineBanner({ visible = true }: { visible?: boolean }) {
  const t = useTranslations('common');
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="offline-banner"
          data-testid="offline-banner"
          role="status"
          aria-live="polite"
          initial={reduceMotion ? false : { y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { y: '-100%', opacity: 0 }}
          transition={{ duration: DURATION_DEFAULT_S, ease: EASE_DEFAULT }}
          className="absolute inset-x-0 top-0 z-toast border-b border-divider bg-surface-cream pt-[env(safe-area-inset-top)] shadow-card"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-3">
            <WifiOff aria-hidden="true" className="size-4 text-text-muted" />
            <span className="text-body-sm font-medium text-text-primary">
              {t('offline.banner')}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
