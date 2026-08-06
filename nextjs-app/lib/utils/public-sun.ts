import type {
  PublicSunVerdict,
  VenueDaySeriesEntry,
  WeatherGateState,
} from '@/lib/types/api';

export type PublicSunVenue = {
  id?: string;
  venueId?: string;
  venueSlug?: string;
  slug?: string;
  venueName?: string;
  sunExposurePercent: number;
  weatherGateState: WeatherGateState;
  distanceMeters?: number;
};

export type PublicSunStep = Pick<
  VenueDaySeriesEntry,
  'minutes' | 'sunExposurePercent' | 'weatherGateState'
>;

export function normalizeWeatherGateState(value: unknown): WeatherGateState {
  return value === 'gated' || value === 'not_gated' || value === 'unknown'
    ? value
    : 'unknown';
}

export function isVenuePubliclySunny(
  venue: Pick<PublicSunVenue, 'sunExposurePercent' | 'weatherGateState'>,
): boolean {
  return (
    normalizedPercent(venue.sunExposurePercent) > 50 &&
    normalizeWeatherGateState(venue.weatherGateState) !== 'gated'
  );
}

export function publicSunVerdictFor(
  venue: Pick<PublicSunVenue, 'sunExposurePercent' | 'weatherGateState'>,
): PublicSunVerdict {
  return isVenuePubliclySunny(venue) ? 'amber' : 'grey';
}

export function isWeatherGateUnknown(
  venue: Pick<PublicSunVenue, 'weatherGateState'>,
): boolean {
  return normalizeWeatherGateState(venue.weatherGateState) === 'unknown';
}

export function compareVenuesByPublicSun<T extends PublicSunVenue>(
  left: T,
  right: T,
): number {
  const leftSunny = isVenuePubliclySunny(left);
  const rightSunny = isVenuePubliclySunny(right);
  if (leftSunny !== rightSunny) return leftSunny ? -1 : 1;

  const exposureDelta =
    normalizedPercent(right.sunExposurePercent) - normalizedPercent(left.sunExposurePercent);
  if (exposureDelta !== 0) return exposureDelta;

  const distanceDelta = sortableDistance(left.distanceMeters) - sortableDistance(right.distanceMeters);
  if (distanceDelta !== 0) return distanceDelta;

  return stableVenueKey(left).localeCompare(stableVenueKey(right), 'sv-SE');
}

export function extractPublicSunWindow(
  series: readonly PublicSunStep[],
  options: { stepMinutes: number },
): { startMinutes: number; endMinutes: number; weatherGateState: 'not_gated' | 'unknown' } | null {
  const stepMinutes = Math.max(1, Math.round(options.stepMinutes));
  type WindowRun = { start: number; end: number; length: number; unknown: boolean };
  let best: WindowRun | null = null;
  let runStart: number | null = null;
  let runEnd = 0;
  let runLength = 0;
  let runUnknown = false;

  for (const entry of [...series].sort((a, b) => a.minutes - b.minutes)) {
    if (!isVenuePubliclySunny(entry)) {
      runStart = null;
      runLength = 0;
      runUnknown = false;
      continue;
    }

    if (runStart !== null && entry.minutes === runEnd + stepMinutes) {
      runEnd = entry.minutes;
      runLength += 1;
      runUnknown = runUnknown || normalizeWeatherGateState(entry.weatherGateState) === 'unknown';
    } else {
      runStart = entry.minutes;
      runEnd = entry.minutes;
      runLength = 1;
      runUnknown = normalizeWeatherGateState(entry.weatherGateState) === 'unknown';
    }

    const current: WindowRun = {
      start: runStart,
      end: runEnd,
      length: runLength,
      unknown: runUnknown,
    };
    if (
      best === null ||
      current.length > best.length ||
      (current.length === best.length && current.start < best.start)
    ) {
      best = current;
    }
  }

  if (!best) return null;
  return {
    startMinutes: best.start,
    endMinutes: best.end,
    weatherGateState: best.unknown ? 'unknown' : 'not_gated',
  };
}

export function extractPublicSunPeak<T extends PublicSunStep>(series: readonly T[]): T | null {
  let best: T | null = null;
  for (const entry of series) {
    if (!isVenuePubliclySunny(entry)) continue;
    if (
      !best ||
      normalizedPercent(entry.sunExposurePercent) > normalizedPercent(best.sunExposurePercent) ||
      (normalizedPercent(entry.sunExposurePercent) === normalizedPercent(best.sunExposurePercent) &&
        entry.minutes < best.minutes)
    ) {
      best = entry;
    }
  }
  return best;
}

/**
 * Best all-day step for server truncation: public-sunny beats grey, then the
 * geometric exposure orders each band. This deliberately retains a gated 95%
 * or an ungated exact-50% grey peak instead of falling back to the selected
 * instant when a series has no public-sunny entry.
 */
export function extractBestPublicSunStep<T extends PublicSunStep>(
  series: readonly T[],
): T | null {
  let best: T | null = null;
  for (const entry of series) {
    if (!best) {
      best = entry;
      continue;
    }
    const order = compareVenuesByPublicSun(entry, best);
    if (order < 0 || (order === 0 && entry.minutes < best.minutes)) {
      best = entry;
    }
  }
  return best;
}

function normalizedPercent(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function sortableDistance(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : Number.POSITIVE_INFINITY;
}

function stableVenueKey(venue: PublicSunVenue): string {
  return venue.id ?? venue.venueId ?? venue.slug ?? venue.venueSlug ?? venue.venueName ?? '';
}
