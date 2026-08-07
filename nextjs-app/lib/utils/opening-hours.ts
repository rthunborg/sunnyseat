/**
 * STORY 11.9 (AC2) — pure opening-hours formatter.
 *
 * The venue store now carries `opening_hours` as a per-weekday structure (numeric
 * ISO weekday keys `"1"`=Mon .. `"7"`=Sun; a missing key or `null` value = CLOSED
 * that day; `close < open` = a PAST-MIDNIGHT close, e.g. opens 18:00 closes 02:00).
 * The pre-localized `{ display, closesAt }` STRING that used to live in the column is
 * GONE — the "Öppet till HH:MM" quick-info line and the "ÖPPET · {time}" detail
 * badge's `closesAt` are DERIVED here at render time from the structured data + the
 * CURRENT Stockholm weekday.
 *
 * This module is PURE and CLIENT-SAFE: `now` and `locale` are injected so the
 * weekday selection is deterministically unit-testable across weekdays / closed
 * days / past-midnight (never reads `new Date()` internally — the epic-wide
 * wall-clock-flake lesson: the e2e time-determinism convention forces `?_time=`;
 * a pure formatter sidesteps that entirely). No server imports.
 *
 * NEVER-FABRICATE rule (11.4 / 11.6): closed-today, no-hours, or a malformed shape
 * → `{}` (the caller renders NOTHING), never a stand-in "Öppet" / "22:00".
 */
import type { OpeningInterval, WeeklyOpeningHours } from '@/lib/types/api';
import { STOCKHOLM_TIME_ZONE } from '@/lib/utils/time-planner';

export type { OpeningInterval, WeeklyOpeningHours };

/** The derived render values — empty when the venue has no hours today. */
export type DerivedOpeningHours = {
  display?: string;
  closesAt?: string;
};

export type VenueAvailabilityState = 'open' | 'closed' | 'unknown';

export type VenueAvailabilityAt = {
  state: VenueAvailabilityState;
  closesAt?: string;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * A default "Öppet till {time}" template used when the caller does not supply an
 * i18n template. `formatOpeningHours` accepts an optional `template` so the render
 * surfaces can compose the string via next-intl instead (the derived close TIME is
 * always the same regardless of locale — only the surrounding copy differs).
 */
const DEFAULT_OPEN_UNTIL_TEMPLATE = 'Öppet till {time}';

/**
 * ISO weekday (1=Mon .. 7=Sun) for `now` in Europe/Stockholm — locale-independent.
 *
 * NEVER-FABRICATE: if `Intl` ever yields a token outside Mon..Sun (locale-data
 * drift / non-Gregorian / ICU quirk), return `undefined` — NOT a concrete weekday.
 * Defaulting to a real day (e.g. Monday) would fabricate that day's open/close
 * state on the wrong day; `undefined` makes the honest "renders nothing" fallback
 * fire instead.
 */
export function stockholmIsoWeekday(now: Date): number | undefined {
  // `Intl` `weekday: 'short'` in en-US is stable across environments; map to ISO.
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: STOCKHOLM_TIME_ZONE,
    weekday: 'short',
  }).format(now);
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[weekday];
}

/**
 * Defensive: keep a value only if it is a well-formed `{ open, close }` interval
 * with HH:MM strings. Anything else (null, string, number, missing/garbage fields)
 * → `undefined` = closed. Mirrors the store's other `coerce*` helpers so a bad row
 * degrades to "closed" rather than throwing at render.
 */
function coerceInterval(value: unknown): OpeningInterval | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const { open, close } = value as { open?: unknown; close?: unknown };
  if (typeof open !== 'string' || typeof close !== 'string') return undefined;
  if (!TIME_PATTERN.test(open) || !TIME_PATTERN.test(close)) return undefined;
  return { open, close };
}

export function isVenueOpenAt(
  hours: WeeklyOpeningHours | null | undefined,
  selectedInstant: Date,
  timeZone: string = STOCKHOLM_TIME_ZONE,
): VenueAvailabilityState {
  return getVenueAvailabilityAt(hours, selectedInstant, timeZone).state;
}

export function getVenueAvailabilityAt(
  hours: WeeklyOpeningHours | null | undefined,
  selectedInstant: Date,
  timeZone: string = STOCKHOLM_TIME_ZONE,
): VenueAvailabilityAt {
  if (!hours || typeof hours !== 'object') return { state: 'unknown' };
  const local = localWeekdayAndMinute(selectedInstant, timeZone);
  if (!local) return { state: 'closed' };

  const todayInterval = coerceInterval(hours[String(local.weekday)]);
  if (todayInterval && isWithinSameDayInterval(todayInterval, local.minutes)) {
    return { state: 'open', closesAt: todayInterval.close };
  }
  if (todayInterval && isWithinOvernightIntervalSameDay(todayInterval, local.minutes)) {
    return { state: 'open', closesAt: todayInterval.close };
  }

  const priorInterval = coerceInterval(hours[String(previousIsoWeekday(local.weekday))]);
  if (priorInterval && isWithinPriorDaySpillover(priorInterval, local.minutes)) {
    return { state: 'open', closesAt: priorInterval.close };
  }

  return { state: 'closed' };
}

export function formatOpeningHoursAt(
  hours: WeeklyOpeningHours | null | undefined,
  selectedInstant: Date,
  locale?: string,
  template: string = DEFAULT_OPEN_UNTIL_TEMPLATE,
  timeZone: string = STOCKHOLM_TIME_ZONE,
): DerivedOpeningHours {
  void locale;
  const availability = getVenueAvailabilityAt(hours, selectedInstant, timeZone);
  if (availability.state !== 'open' || !availability.closesAt) return {};
  return {
    display: template.replaceAll('{time}', availability.closesAt),
    closesAt: availability.closesAt,
  };
}

function localWeekdayAndMinute(
  instant: Date,
  timeZone: string,
): { weekday: number; minutes: number } | null {
  if (Number.isNaN(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const weekdayToken = parts.find((part) => part.type === 'weekday')?.value;
  const hourToken = parts.find((part) => part.type === 'hour')?.value;
  const minuteToken = parts.find((part) => part.type === 'minute')?.value;
  const weekday = weekdayFromToken(weekdayToken);
  const hour = hourToken ? Number(hourToken) : Number.NaN;
  const minute = minuteToken ? Number(minuteToken) : Number.NaN;
  if (
    weekday === undefined ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  return { weekday, minutes: hour * 60 + minute };
}

function weekdayFromToken(token: string | undefined): number | undefined {
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return token ? map[token] : undefined;
}

function previousIsoWeekday(weekday: number): number {
  return weekday === 1 ? 7 : weekday - 1;
}

function timeToMinutes(time: string): number {
  const [hours = '0', minutes = '0'] = time.split(':');
  return Number(hours) * 60 + Number(minutes);
}

function isOvernight(interval: OpeningInterval): boolean {
  return timeToMinutes(interval.close) < timeToMinutes(interval.open);
}

function isWithinSameDayInterval(interval: OpeningInterval, minutes: number): boolean {
  if (isOvernight(interval)) return false;
  const open = timeToMinutes(interval.open);
  const close = timeToMinutes(interval.close);
  return minutes >= open && minutes < close;
}

function isWithinOvernightIntervalSameDay(interval: OpeningInterval, minutes: number): boolean {
  if (!isOvernight(interval)) return false;
  return minutes >= timeToMinutes(interval.open);
}

function isWithinPriorDaySpillover(interval: OpeningInterval, minutes: number): boolean {
  if (!isOvernight(interval)) return false;
  return minutes < timeToMinutes(interval.close);
}

/**
 * Derive today's `{ display?, closesAt? }` from a per-weekday opening-hours object
 * and an injected `now` (Stockholm). Returns `{}` when the venue is closed today,
 * has no hours, or carries a malformed today-entry — the caller then renders
 * NOTHING (never a fabricated close). Past-midnight closes (`close < open`) are
 * derived HONESTLY: opens 18:00 closes 02:00 → "open until 02:00" (no clamping).
 *
 * @param hours    per-weekday opening hours (or null/undefined = no hours)
 * @param now      injected instant (weekday is read in Europe/Stockholm)
 * @param locale   BCP-47 locale — accepted for API symmetry; the derived TIME is
 *                 locale-independent, so it only matters if a locale-specific
 *                 template is later composed by the caller.
 * @param template optional "…{time}…" template for the display line (defaults to
 *                 the Swedish "Öppet till {time}"). The caller SHOULD pass its own
 *                 i18n template so the copy is localized; the close TIME is stable.
 */
export function formatOpeningHours(
  hours: WeeklyOpeningHours | null | undefined,
  now: Date,
  locale?: string,
  template: string = DEFAULT_OPEN_UNTIL_TEMPLATE,
): DerivedOpeningHours {
  void locale; // derived time is locale-independent; kept for API symmetry.
  if (!hours || typeof hours !== 'object') return {};
  const weekday = stockholmIsoWeekday(now);
  if (weekday === undefined) return {};
  const interval = coerceInterval(hours[String(weekday)]);
  if (!interval) return {};
  const closesAt = interval.close;
  const display = template.replaceAll('{time}', closesAt);
  return { display, closesAt };
}
