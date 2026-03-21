import type { SunExposureResult } from '@/lib/types/venue';
import type { SunStatus } from '@/lib/types/design-tokens';

const STATUS_TIER: Record<SunStatus, number> = {
  sunny: 1,
  partial: 2,
  upcoming: 3,
  shaded: 4,
};

export type TimeOfDayContext = 'morning' | 'afternoon' | 'evening';

/**
 * Get the time-of-day context in Stockholm time.
 */
export function getTimeOfDayContext(now: Date): TimeOfDayContext {
  const stockholmHour = getStockholmHour(now);
  if (stockholmHour >= 6 && stockholmHour < 12) return 'morning';
  if (stockholmHour >= 12 && stockholmHour < 18) return 'afternoon';
  return 'evening';
}

function getStockholmHour(date: Date): number {
  const str = date.toLocaleString('en-US', {
    timeZone: 'Europe/Stockholm',
    hour: 'numeric',
    hour12: false,
  });
  return parseInt(str, 10);
}

function timeWindowScore(
  venue: SunExposureResult,
  context: TimeOfDayContext
): number {
  if (!venue.windows || venue.windows.length === 0) return 0;

  for (const w of venue.windows) {
    const startHour = new Date(w.start).getHours();
    const endHour = new Date(w.end).getHours();

    if (context === 'morning') {
      // Favor venues with lunch sun (11-14)
      if (startHour <= 14 && endHour >= 11) return -1;
    } else if (context === 'afternoon') {
      // Favor venues with sun past 16:00 (golden hour)
      if (endHour >= 16) return -1;
    } else {
      // Evening: favor venues with tomorrow morning sun
      if (startHour >= 6 && startHour <= 12) return -1;
    }
  }
  return 0;
}

/**
 * Sort venues by sun status tier, then distance, with time-of-day tiebreaker.
 */
export function sortVenues(
  venues: SunExposureResult[],
  now?: Date
): SunExposureResult[] {
  const currentTime = now ?? new Date();
  const context = getTimeOfDayContext(currentTime);

  return [...venues].sort((a, b) => {
    // Primary: sun status tier
    const tierA = STATUS_TIER[a.current_status] ?? 4;
    const tierB = STATUS_TIER[b.current_status] ?? 4;
    if (tierA !== tierB) return tierA - tierB;

    // Time-of-day tiebreaker within same tier
    const timeA = timeWindowScore(a, context);
    const timeB = timeWindowScore(b, context);
    if (timeA !== timeB) return timeA - timeB;

    // Secondary: distance ascending
    const distA = a.distance_meters ?? Infinity;
    const distB = b.distance_meters ?? Infinity;
    return distA - distB;
  });
}
