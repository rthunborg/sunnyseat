import type { SunStatus } from '@/lib/types/design-tokens';
import type { SunExposureResult } from '@/lib/types/venue';

/** Ordered status groups for display (sunny → partial → upcoming → shaded) */
export const STATUS_ORDER: SunStatus[] = ['sunny', 'partial', 'upcoming', 'shaded'];

export interface VenueGroup {
  status: SunStatus;
  venues: SunExposureResult[];
}

/**
 * Groups a pre-sorted venue array by sun status, preserving sort order within each group.
 * Empty groups are excluded from the result.
 */
export function groupVenuesByStatus(venues: SunExposureResult[]): VenueGroup[] {
  const map = new Map<SunStatus, SunExposureResult[]>();

  for (const venue of venues) {
    const status = venue.current_status;
    const existing = map.get(status);
    if (existing) {
      existing.push(venue);
    } else {
      map.set(status, [venue]);
    }
  }

  return STATUS_ORDER
    .filter((s) => map.has(s))
    .map((status) => ({ status, venues: map.get(status)! }));
}

/**
 * Counts venues by status for the summary line.
 */
export function countByStatus(venues: SunExposureResult[]): Record<SunStatus, number> {
  const counts: Record<SunStatus, number> = { sunny: 0, partial: 0, upcoming: 0, shaded: 0 };
  for (const v of venues) {
    counts[v.current_status]++;
  }
  return counts;
}
