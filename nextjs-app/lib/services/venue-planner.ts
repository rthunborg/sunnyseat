import type { VenueDataDto } from '@/lib/types/api';
import { fromZonedTime } from 'date-fns-tz';
import {
  formatPlannerTime,
  isTodayInStockholm,
  parsePlannerTime,
  PLANNER_END_MINUTES,
  PLANNER_START_MINUTES,
  STOCKHOLM_TIME_ZONE,
  validatePlannerDateTime,
} from '@/lib/utils/time-planner';
import { normalizeWeatherGateState } from '@/lib/utils/public-sun';

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
    // Story 11.2 (AC3): the today→today+3 window is a client/state concern. The
    // server route keeps serving far-future forecast dates (up to the season
    // edge) so a stale bookmark never 400s just for being beyond the picker
    // window; the client is what clamps into the window.
    enforceWindow: false,
  });
  if (!validation.ok) {
    if (validation.reason === 'out-of-season') {
      return { ok: false, detail: 'Planner date must be within the current sun season' };
    }
    if (validation.reason === 'past-date') {
      return { ok: false, detail: 'Planner date cannot be in the past' };
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
  const adjustedWindow =
    windowStart !== null && windowEnd !== null
      ? adjustedSunWindow(selection.date, windowStart, windowEnd)
      : null;
  const inSunWindow =
    adjustedWindow !== null &&
    selectedMinutes >= adjustedWindow.start &&
    selectedMinutes <= adjustedWindow.end;
  const seasonalFactor = seasonalExposureFactor(selection.date);
  const weatherFactor = weatherExposureFactor(venue.skyCondition);
  const forecastPenalty = selection.isFutureDate
    ? forecastConfidencePenalty(selection, now)
    : 0;
  const weatherPenalty = selection.isFutureDate
    ? weatherConfidencePenalty(venue.skyCondition)
    : 0;
  const sunExposurePercent = inSunWindow
    ? selectedWindowExposure(
        venue,
        selectedMinutes,
        adjustedWindow.start,
        adjustedWindow.end,
        seasonalFactor,
        weatherFactor,
      )
    : shadedExposure(venue, weatherFactor);
  const currentSunStatus = inSunWindow
    ? sunStatusFromExposure(sunExposurePercent, venue.currentSunStatus)
    : 'Shaded';
  const weatherGateState = normalizeWeatherGateState(venue.weatherGateState);
  return {
    ...venue,
    currentSunStatus,
    weatherGateState,
    confidence: Math.max(35, Math.round(venue.confidence - forecastPenalty - weatherPenalty)),
    sunExposurePercent,
    sunWindow: adjustedWindow
      ? {
          start: formatPlannerTime(adjustedWindow.start),
          end: formatPlannerTime(adjustedWindow.end),
          ...(venue.sunWindow?.weatherGateState
            ? {
                weatherGateState:
                  venue.sunWindow.weatherGateState === 'not_gated'
                    ? 'not_gated' as const
                    : 'unknown' as const,
              }
            : {}),
        }
      : venue.sunWindow,
  };
}

function selectedWindowExposure(
  venue: VenueDataDto,
  selectedMinutes: number,
  windowStart: number,
  windowEnd: number,
  seasonalFactor: number,
  weatherFactor: number,
): number {
  if (windowEnd <= windowStart) return venue.sunExposurePercent;
  const midpoint = (windowStart + windowEnd) / 2;
  const halfWindow = Math.max(1, (windowEnd - windowStart) / 2);
  const proximity = 1 - Math.min(1, Math.abs(selectedMinutes - midpoint) / halfWindow);
  const timeCurve = 0.84 + proximity * 0.16;
  return Math.min(
    100,
    Math.max(35, Math.round(venue.sunExposurePercent * seasonalFactor * weatherFactor * timeCurve)),
  );
}

function shadedExposure(venue: VenueDataDto, weatherFactor: number): number {
  return Math.min(35, Math.max(0, Math.round(venue.sunExposurePercent * 0.18 * weatherFactor)));
}

function sunStatusFromExposure(
  exposure: number,
  _fallback: VenueDataDto['currentSunStatus'],
): VenueDataDto['currentSunStatus'] {
  if (exposure >= 70) return 'Sunny';
  if (exposure >= 35) return 'Partial';
  return 'Shaded';
}

function forecastConfidencePenalty(selection: VenuePlannerSelection, now: Date): number {
  const selected = fromZonedTime(
    `${selection.date}T${selection.time}:00`,
    STOCKHOLM_TIME_ZONE,
  );
  const daysAhead = Math.max(
    1,
    Math.ceil((selected.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
  );
  return Math.min(24, 6 + daysAhead * 2);
}

function adjustedSunWindow(
  date: string,
  windowStart: number,
  windowEnd: number,
): { start: number; end: number } {
  const strength = seasonalStrength(date);
  const expansion = Math.max(0, Math.round((strength - 0.35) * 92));
  return {
    start: Math.max(PLANNER_START_MINUTES, Math.round(windowStart - expansion / 2)),
    end: Math.min(PLANNER_END_MINUTES, Math.round(windowEnd + expansion)),
  };
}

function seasonalExposureFactor(date: string): number {
  return 0.72 + seasonalStrength(date) * 0.28;
}

function seasonalStrength(date: string): number {
  const [yearRaw = '1970', monthRaw = '1', dayRaw = '1'] = date.split('-');
  const year = Number(yearRaw);
  const current = Date.UTC(year, Number(monthRaw) - 1, Number(dayRaw));
  const start = Date.UTC(year, 2, 1);
  const end = Date.UTC(year, 9, 31);
  const progress = Math.min(1, Math.max(0, (current - start) / Math.max(1, end - start)));
  return Math.sin(progress * Math.PI);
}

function weatherExposureFactor(condition: string | undefined): number {
  if (condition === 'clear') return 1;
  if (condition === 'partly-cloudy') return 0.88;
  if (condition === 'overcast') return 0.56;
  if (condition === 'unavailable') return 1;
  return 0.92;
}

function weatherConfidencePenalty(condition: string | undefined): number {
  if (condition === 'clear') return 0;
  if (condition === 'partly-cloudy') return 4;
  if (condition === 'overcast') return 14;
  if (condition === 'unavailable') return 0;
  return 6;
}
