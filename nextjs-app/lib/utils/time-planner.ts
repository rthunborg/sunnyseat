export const STOCKHOLM_TIME_ZONE = 'Europe/Stockholm';
export const PLANNER_START_MINUTES = 6 * 60;
export const PLANNER_END_MINUTES = 21 * 60;
export const PLANNER_STEP_MINUTES = 15;
export const PLANNER_TICK_INTERVAL_MINUTES = 3 * 60;
/**
 * Story 11.2 (AC3): the planner date picker exposes a fixed today → today+3
 * window (4 selectable days). Maintainer decision (2026-07-04 workshop): "dates
 * selectable only today→today+3". This bound dominates the sun-season concept for
 * any near-term "today" — the season only matters within 3 days of a season edge.
 */
export const PLANNER_MAX_FUTURE_DAYS = 3;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/u;

export type PlannerTick = {
  label: string;
  minutes: number;
};

export type PlannerValidationResult =
  | { ok: true; date: string; time: string }
  | {
      ok: false;
      reason: 'invalid-date' | 'invalid-time' | 'out-of-season' | 'past-date' | 'out-of-window';
    };

export function stockholmDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: STOCKHOLM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = partValue(parts, 'year');
  const month = partValue(parts, 'month');
  const day = partValue(parts, 'day');
  return `${year}-${month}-${day}`;
}

export function formatDateForUrl(date: Date): string {
  return stockholmDateKey(date);
}

export function formatTimeInStockholm(date: Date): string {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: STOCKHOLM_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  return `${partValue(parts, 'hour')}:${partValue(parts, 'minute')}`;
}

export function parsePlannerTime(value: string): number | null {
  if (CONTROL_CHARACTER_PATTERN.test(value) || !TIME_PATTERN.test(value)) return null;
  const [hours = '0', minutes = '0'] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}

export function formatPlannerTime(minutes: number): string {
  const clamped = clampPlannerMinutes(Math.round(minutes));
  const hours = Math.floor(clamped / 60);
  const remainder = clamped % 60;
  return `${hours.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
}

export function clampPlannerMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return PLANNER_START_MINUTES;
  return Math.min(PLANNER_END_MINUTES, Math.max(PLANNER_START_MINUTES, Math.round(minutes)));
}

export function snapPlannerMinutes(
  minutes: number,
  stepMinutes = PLANNER_STEP_MINUTES,
): number {
  const clamped = clampPlannerMinutes(minutes);
  return clampPlannerMinutes(Math.round(clamped / stepMinutes) * stepMinutes);
}

export function generatePlannerTicks(): PlannerTick[] {
  const ticks: PlannerTick[] = [];
  for (
    let minutes = PLANNER_START_MINUTES;
    minutes <= PLANNER_END_MINUTES;
    minutes += PLANNER_TICK_INTERVAL_MINUTES
  ) {
    ticks.push({ minutes, label: formatPlannerTime(minutes) });
  }
  return ticks;
}

export function sunSeasonBounds(now = new Date()): { start: string; end: string } {
  const year = stockholmDateKey(now).slice(0, 4);
  return { start: `${year}-03-01`, end: `${year}-10-31` };
}

export function isTodayInStockholm(date: string, now = new Date()): boolean {
  return date === stockholmDateKey(now);
}

export function isDateInCurrentSunSeason(date: string, now = new Date()): boolean {
  if (!isValidDateKey(date)) return false;
  const bounds = sunSeasonBounds(now);
  return date >= bounds.start && date <= bounds.end;
}

/**
 * Story 11.2 (AC3): the today → today+PLANNER_MAX_FUTURE_DAYS window, as
 * Stockholm date keys. The picker/state selectability rule keys off this window,
 * not the sun season — the season only matters within `PLANNER_MAX_FUTURE_DAYS`
 * of a season edge.
 */
export function plannerWindowBounds(now = new Date()): { start: string; end: string } {
  const start = stockholmDateKey(now);
  return { start, end: addDaysToDateKey(start, PLANNER_MAX_FUTURE_DAYS) };
}

export function isPlannerDateSelectable(date: string, now = new Date()): boolean {
  if (!isValidDateKey(date)) return false;
  const window = plannerWindowBounds(now);
  // Story 11.2 (AC3): the today->today+3 window REPLACES the season UPPER bound.
  // The season floor survives so an out-of-season "today" (e.g. deep winter) is
  // still unplannable — for any in-season near-term today the 3-day cap dominates
  // and the season is a no-op. (For any summer today, in-window ⟹ in-season.)
  return (
    date >= window.start &&
    date <= window.end &&
    isDateInCurrentSunSeason(date, now)
  );
}

export function validatePlannerDateTime({
  date,
  time,
  now = new Date(),
  enforceWindow = true,
}: {
  date: string | null | undefined;
  time: string | null | undefined;
  now?: Date;
  /**
   * Story 11.2 (AC3): by default the validator enforces the today → today+3
   * client planner window (a beyond-window date is rejected `out-of-window`).
   * The server route opts OUT (`enforceWindow: false`) so it keeps serving
   * far-future forecast bookmarks up to the season edge — the window is a
   * client/state concern, and the route must never 500/400 a stale bookmark for
   * being merely "beyond today+3". Season + past-date checks still apply.
   */
  enforceWindow?: boolean;
}): PlannerValidationResult {
  const normalizedDate = date?.trim() ?? '';
  const normalizedTime = time?.trim() ?? '';
  if (!isValidDateKey(normalizedDate)) return { ok: false, reason: 'invalid-date' };
  const minutes = parsePlannerTime(normalizedTime);
  if (minutes === null || minutes < PLANNER_START_MINUTES || minutes > PLANNER_END_MINUTES) {
    return { ok: false, reason: 'invalid-time' };
  }
  if (!isDateInCurrentSunSeason(normalizedDate, now)) {
    return { ok: false, reason: 'out-of-season' };
  }
  if (normalizedDate < stockholmDateKey(now)) {
    return { ok: false, reason: 'past-date' };
  }
  if (enforceWindow && normalizedDate > plannerWindowBounds(now).end) {
    return { ok: false, reason: 'out-of-window' };
  }
  return {
    ok: true,
    date: normalizedDate,
    time: formatPlannerTime(minutes),
  };
}

/** Shift a `YYYY-MM-DD` Stockholm date key by whole days (UTC-anchored math). */
export function addDaysToDateKey(date: string, days: number): string {
  const [yearRaw = '1970', monthRaw = '01', dayRaw = '01'] = date.split('-');
  const shifted = new Date(Date.UTC(Number(yearRaw), Number(monthRaw) - 1, Number(dayRaw)));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

export function isValidDateKey(value: string): boolean {
  if (CONTROL_CHARACTER_PATTERN.test(value) || !DATE_PATTERN.test(value)) return false;
  const [yearRaw = '', monthRaw = '', dayRaw = ''] = value.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function partValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? '';
}
