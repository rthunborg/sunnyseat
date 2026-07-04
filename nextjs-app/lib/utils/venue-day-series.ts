/**
 * STORY 11.1 (AC1, Task 4): the PURE, CLIENT-SAFE day-series derivation.
 *
 * Given a venue's cached `sunDaySeries` (one gated entry per PLANNER_STEP_MINUTES
 * step) and a selected planner minutes value, return the
 * `{ sunExposurePercent, currentSunStatus }` for that step. This is the single
 * seam the client reads for marker %, pin state, quick-info figures, "Mest sol"
 * ordering, and the obscured presentation — so a settled time change (scrub)
 * derives ALL time-dependent UI offline-from-network and issues ZERO requests
 * (R-001, the Epic-11 headline).
 *
 * The client NEVER re-gates: the series already carries the Epic-10 weather-gated
 * `currentSunStatus` per step (the gate is authoritative server-side). This helper
 * only READS the emitted value.
 *
 * API BOUNDARY: this module is client-safe. It MUST NOT import `sun-engine.ts` /
 * `sun-engine-cache.ts` / `met-no-service` / `nowcast-service` (a source scan in
 * the ATDD suite enforces this). It imports only the pure planner-step utilities.
 */
import { snapPlannerMinutes } from '@/lib/utils/time-planner';
import type { VenueDaySeriesEntry, VenueSunStatus } from '@/lib/types/api';

export type DerivedVenueSun = {
  sunExposurePercent: number;
  currentSunStatus: VenueSunStatus;
};

/**
 * Exact per-step lookup: the derived value is the series entry whose `minutes`
 * equals the snapped 15-min planner step. The client already snaps upstream via
 * `snapPlannerMinutes`, but we snap here too so the lookup is robust to an
 * unsnapped input (an exact-match against the snapped step). Returns `null` when
 * the series is empty/absent or has no entry for the snapped step, so the caller
 * can fall back to the server's single-instant fields.
 */
export function deriveVenueSunAtMinutes(
  series: readonly VenueDaySeriesEntry[] | undefined,
  selectedMinutes: number,
): DerivedVenueSun | null {
  if (!Array.isArray(series) || series.length === 0) return null;
  const snapped = snapPlannerMinutes(selectedMinutes);
  const entry = series.find((e) => e.minutes === snapped);
  if (!entry) return null;
  return {
    sunExposurePercent: entry.sunExposurePercent,
    currentSunStatus: entry.currentSunStatus,
  };
}
