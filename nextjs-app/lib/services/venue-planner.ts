import type { VenueDataDto } from '@/lib/types/api';
import {
  dateFromStockholmDateTime,
  isTodayInStockholm,
  parsePlannerTime,
  validatePlannerDateTime,
} from '@/lib/utils/time-planner';

export type VenuePlannerSelection = {
  date: string;
  time: string;
  isFutureDate: boolean;
};

export type VenuePlannerParseResult =
  | { ok: true; selection: VenuePlannerSelection | undefined }
  | { ok: false; detail: string };

export function parseVenuePlannerParams(
  params: URLSearchParams,
  now = new Date(),
): VenuePlannerParseResult {
  const dateValues = params.getAll('date');
  const timeValues = params.getAll('time');
  if (dateValues.length === 0 && timeValues.length === 0) {
    return { ok: true, selection: undefined };
  }
  if (dateValues.length !== 1 || timeValues.length !== 1) {
    return { ok: false, detail: 'Use a single date and a single time parameter together' };
  }
  const validation = validatePlannerDateTime({
    date: dateValues[0],
    time: timeValues[0],
    now,
  });
  if (!validation.ok) {
    if (validation.reason === 'out-of-season') {
      return { ok: false, detail: 'Planner date must be within the current sun season' };
    }
    return {
      ok: false,
      detail: validation.reason === 'invalid-date'
        ? 'Invalid planner date'
        : 'Invalid planner time',
    };
  }
  return {
    ok: true,
    selection: {
      date: validation.date,
      time: validation.time,
      isFutureDate: !isTodayInStockholm(validation.date, now),
    },
  };
}

export function applyPlannerSelectionToVenue(
  venue: VenueDataDto,
  selection: VenuePlannerSelection | undefined,
  now = new Date(),
): VenueDataDto {
  if (!selection) return venue;
  const selectedMinutes = parsePlannerTime(selection.time) ?? 12 * 60;
  const windowStart = venue.sunWindow ? parsePlannerTime(venue.sunWindow.start) : null;
  const windowEnd = venue.sunWindow ? parsePlannerTime(venue.sunWindow.end) : null;
  const inSunWindow =
    windowStart !== null &&
    windowEnd !== null &&
    selectedMinutes >= windowStart &&
    selectedMinutes <= windowEnd;
  const forecastPenalty = selection.isFutureDate
    ? forecastConfidencePenalty(selection, now)
    : 0;
  const sunExposurePercent = inSunWindow
    ? selectedWindowExposure(venue, selectedMinutes, windowStart, windowEnd)
    : shadedExposure(venue);
  const currentSunStatus = inSunWindow
    ? sunStatusFromExposure(sunExposurePercent, venue.currentSunStatus)
    : 'Shaded';
  return {
    ...venue,
    currentSunStatus,
    confidence: Math.max(35, Math.round(venue.confidence - forecastPenalty)),
    sunExposurePercent,
  };
}

function selectedWindowExposure(
  venue: VenueDataDto,
  _selectedMinutes: number,
  windowStart: number,
  windowEnd: number,
): number {
  if (windowEnd <= windowStart) return venue.sunExposurePercent;
  return Math.min(100, Math.max(45, Math.round(venue.sunExposurePercent)));
}

function shadedExposure(venue: VenueDataDto): number {
  return Math.min(35, Math.max(0, Math.round(venue.sunExposurePercent * 0.18)));
}

function sunStatusFromExposure(
  exposure: number,
  fallback: VenueDataDto['currentSunStatus'],
): VenueDataDto['currentSunStatus'] {
  if (exposure >= 70) return 'Sunny';
  if (exposure >= 35) return fallback === 'Shaded' ? 'Partial' : fallback;
  return 'Shaded';
}

function forecastConfidencePenalty(selection: VenuePlannerSelection, now: Date): number {
  const selected = dateFromStockholmDateTime(selection.date, selection.time);
  const daysAhead = Math.max(
    1,
    Math.ceil((selected.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
  );
  return Math.min(24, 6 + daysAhead * 2);
}
