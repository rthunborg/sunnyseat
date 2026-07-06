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

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * A default "Öppet till {time}" template used when the caller does not supply an
 * i18n template. `formatOpeningHours` accepts an optional `template` so the render
 * surfaces can compose the string via next-intl instead (the derived close TIME is
 * always the same regardless of locale — only the surrounding copy differs).
 */
const DEFAULT_OPEN_UNTIL_TEMPLATE = 'Öppet till {time}';

/** ISO weekday (1=Mon .. 7=Sun) for `now` in Europe/Stockholm — locale-independent. */
export function stockholmIsoWeekday(now: Date): number {
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
  return map[weekday] ?? 1;
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
  const interval = coerceInterval(hours[String(weekday)]);
  if (!interval) return {};
  const closesAt = interval.close;
  const display = template.replaceAll('{time}', closesAt);
  return { display, closesAt };
}
