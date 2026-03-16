import type { SunWindow } from '@/lib/types/venue';
import type { TimelineSegment } from '@/lib/types/timeline';
import { convertUtcToStockholm } from '@/lib/solar/timezone-utils';
import { t } from '@/lib/i18n';

/**
 * Convert a UTC ISO string to minutes-from-midnight in Stockholm time.
 */
function utcToStockholmMinutes(isoString: string): number {
  const utcDate = new Date(isoString);
  const local = convertUtcToStockholm(utcDate);
  return local.getHours() * 60 + local.getMinutes();
}

/**
 * Generate 10-minute resolution segments from SunWindow array within a given range.
 * Gaps between sun windows are filled with 'shaded' segments.
 */
export function generateSegments(
  sunWindows: SunWindow[],
  rangeStartMinute: number,
  rangeEndMinute: number
): TimelineSegment[] {
  const resolution = 10;
  const totalSlots = Math.floor((rangeEndMinute - rangeStartMinute) / resolution);

  if (totalSlots <= 0) return [];

  // Initialize all slots as shaded
  const slots: TimelineSegment[] = [];
  for (let i = 0; i < totalSlots; i++) {
    const start = rangeStartMinute + i * resolution;
    slots.push({
      startMinute: start,
      endMinute: start + resolution,
      sunStatus: 'shaded',
      skyCondition: 'unavailable',
    });
  }

  // Overlay sun windows onto slots
  for (const w of sunWindows) {
    const wStart = utcToStockholmMinutes(w.start);
    const wEnd = utcToStockholmMinutes(w.end);

    for (const slot of slots) {
      // Slot overlaps with this window if slot start < window end AND slot end > window start
      if (slot.startMinute < wEnd && slot.endMinute > wStart) {
        slot.sunStatus = w.sun_status;
        slot.skyCondition = w.sky_condition;
      }
    }
  }

  // Merge adjacent slots with same status to reduce DOM nodes
  const merged: TimelineSegment[] = [];
  for (const slot of slots) {
    const last = merged[merged.length - 1];
    if (last && last.sunStatus === slot.sunStatus && last.skyCondition === slot.skyCondition) {
      last.endMinute = slot.endMinute;
    } else {
      merged.push({ ...slot });
    }
  }

  return merged;
}

/**
 * Returns percentage (0–100) for positioning within the bar.
 */
export function timeToPosition(
  minuteFromMidnight: number,
  rangeStart: number,
  rangeEnd: number
): number {
  if (rangeEnd === rangeStart) return 0;
  const pct = ((minuteFromMidnight - rangeStart) / (rangeEnd - rangeStart)) * 100;
  return Math.max(0, Math.min(100, pct));
}

/**
 * Returns "HH:MM" 24-hour format string from minutes since midnight.
 */
export function formatTimeLabel(minuteFromMidnight: number): string {
  const h = Math.floor(minuteFromMidnight / 60);
  const m = minuteFromMidnight % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Determines the 2–4 hour window for card variant centered around now or next sun window.
 */
export function getCardTimeRange(
  sunWindows: SunWindow[],
  now: Date
): { start: number; end: number } {
  const local = convertUtcToStockholm(now);
  const nowMinute = local.getHours() * 60 + local.getMinutes();

  if (sunWindows.length === 0) {
    // Default: 2 hours from now
    return { start: nowMinute, end: nowMinute + 120 };
  }

  // Find the relevant window: one that contains now, or the next upcoming
  let relevantStart = nowMinute;
  let relevantEnd = nowMinute + 120;

  for (const w of sunWindows) {
    const wStart = utcToStockholmMinutes(w.start);
    const wEnd = utcToStockholmMinutes(w.end);

    // Current or upcoming window
    if (wEnd > nowMinute) {
      relevantStart = Math.min(nowMinute, wStart);
      relevantEnd = wEnd;
      break;
    }
  }

  // Ensure at least 2h range, max 4h
  const duration = relevantEnd - relevantStart;
  if (duration < 120) {
    relevantEnd = relevantStart + 120;
  } else if (duration > 240) {
    relevantEnd = relevantStart + 240;
  }

  return { start: relevantStart, end: relevantEnd };
}

const STATUS_LABEL_MAP: Record<string, string> = {
  sunny: 'status.sunny',
  partial: 'status.partial',
  shaded: 'status.shaded',
  upcoming: 'status.upcoming',
};

/**
 * Produces Swedish text description of sun windows for screen reader aria-label.
 */
export function generateAriaLabel(segments: TimelineSegment[]): string {
  const sunSegments = segments.filter((s) => s.sunStatus !== 'shaded');

  if (sunSegments.length === 0) {
    return t('accessibility.sunSchedule', { description: t('venue.noSun') });
  }

  const parts = sunSegments.map((s) => {
    const statusText = t(STATUS_LABEL_MAP[s.sunStatus] ?? 'status.shaded').toLowerCase();
    const start = formatTimeLabel(s.startMinute);
    const end = formatTimeLabel(s.endMinute);
    return `${statusText} ${start} till ${end}`;
  });

  return t('accessibility.sunSchedule', { description: parts.join(', ') });
}

/**
 * Returns formatted duration string like "2h 25m" or "45 min".
 */
export function calculateDuration(startIso: string, endIso: string): string {
  const startDate = new Date(startIso);
  const endDate = new Date(endIso);
  const diffMs = endDate.getTime() - startDate.getTime();
  const totalMinutes = Math.round(diffMs / 60000);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return t('time.durationMinutes', { minutes });
  }
  return t('time.durationHoursMinutes', { hours, minutes });
}

/**
 * Convert a Date to Stockholm minutes-from-midnight.
 */
export function dateToStockholmMinutes(date: Date): number {
  const local = convertUtcToStockholm(date);
  return local.getHours() * 60 + local.getMinutes();
}
