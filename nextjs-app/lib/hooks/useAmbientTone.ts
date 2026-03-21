'use client';

import { useMemo } from 'react';
import { useCardTray } from '@/lib/context/CardTrayContext';
import type { AmbientMode } from '@/lib/types/design-tokens';

/** Winter months: November (10), December (11), January (0), February (1) */
const WINTER_MONTHS = new Set([0, 1, 10, 11]);

export type AmbientToneClass = 'ambient-sunny' | 'ambient-cloudy' | 'ambient-winter' | '';

/**
 * Pure function to get ambient class from a single sun status.
 * Use in pages outside CardTrayProvider (e.g. venue detail).
 */
export function getAmbientToneClass(
  sunStatus: 'sunny' | 'partial' | 'shaded' | 'upcoming',
  now: Date = new Date()
): AmbientToneClass {
  if (WINTER_MONTHS.has(now.getMonth())) return 'ambient-winter';
  if (sunStatus === 'sunny' || sunStatus === 'partial') return 'ambient-sunny';
  return 'ambient-cloudy';
}

/**
 * Determines the dominant ambient tone based on loaded venue conditions.
 *
 * Logic:
 * - Winter months (Nov–Feb) always return 'winter' regardless of venue data
 * - Counts sunny + partial statuses vs shaded + overcast; majority wins
 * - No data / loading returns '' (neutral default)
 *
 * Dark mode extension point: Currently returns light-mode classes only.
 * When dark mode is added, extend the return value to include dark variants
 * (e.g. 'dark:ambient-sunny-dark') and update globals.css with dark-mode tokens.
 */
export function useAmbientTone(now: Date = new Date()): {
  mode: AmbientMode | null;
  className: AmbientToneClass;
} {
  const { venues, isLoading } = useCardTray();

  return useMemo(() => {
    // Winter override
    if (WINTER_MONTHS.has(now.getMonth())) {
      return { mode: 'winter' as const, className: 'ambient-winter' as const };
    }

    // No data or loading — neutral
    if (isLoading || venues.length === 0) {
      return { mode: null, className: '' as const };
    }

    // Count sunny/partial vs shaded/overcast
    let sunnyCount = 0;
    let cloudyCount = 0;

    for (const v of venues) {
      const status = v.current_status;
      if (status === 'sunny' || status === 'partial') {
        sunnyCount++;
      } else {
        // 'shaded', 'upcoming', or any other status
        cloudyCount++;
      }
    }

    if (sunnyCount >= cloudyCount) {
      return { mode: 'sunny' as const, className: 'ambient-sunny' as const };
    }

    return { mode: 'cloudy' as const, className: 'ambient-cloudy' as const };
  }, [venues, isLoading, now]);
}
