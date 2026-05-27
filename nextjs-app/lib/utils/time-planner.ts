import { fromZonedTime } from 'date-fns-tz';

export const STOCKHOLM_TIME_ZONE = 'Europe/Stockholm';
export const PLANNER_START_MINUTES = 6 * 60;
export const PLANNER_END_MINUTES = 21 * 60;
export const PLANNER_STEP_MINUTES = 15;
export const PLANNER_TICK_INTERVAL_MINUTES = 3 * 60;

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
      reason: 'invalid-date' | 'invalid-time' | 'out-of-season' | 'past-date';
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

export function isPlannerDateSelectable(date: string, now = new Date()): boolean {
  return isDateInCurrentSunSeason(date, now) && date >= stockholmDateKey(now);
}

export function validatePlannerDateTime({
  date,
  time,
  now = new Date(),
}: {
  date: string | null | undefined;
  time: string | null | undefined;
  now?: Date;
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
  return {
    ok: true,
    date: normalizedDate,
    time: formatPlannerTime(minutes),
  };
}

export function dateFromStockholmDateTime(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}:00`, STOCKHOLM_TIME_ZONE);
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
