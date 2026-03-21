import type { SunExposureResult, SunWindow } from '@/lib/types/venue';
import type { VenueCardVariant } from '@/lib/types/card-states';
import { t } from '@/lib/i18n';

const UPCOMING_THRESHOLD_MS = 90 * 60 * 1000;

export function selectVariant(
  result: SunExposureResult,
  now: Date = new Date()
): VenueCardVariant {
  if (result.current_status === 'sunny') return 'sunny';
  if (result.current_status === 'partial') return 'partial';

  const nowMs = now.getTime();
  const hasUpcoming = result.windows.some((w) => {
    if (w.sun_status !== 'sunny') return false;
    const startMs = new Date(w.start).getTime();
    return startMs > nowMs && startMs - nowMs <= UPCOMING_THRESHOLD_MS;
  });

  if (hasUpcoming) return 'upcoming';
  return 'shaded';
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function getDetailLineText(
  variant: VenueCardVariant,
  sunWindows: SunWindow[],
  now: Date = new Date(),
  lang: 'sv' | 'en' = 'sv'
): string {
  if (variant === 'sunny' || variant === 'partial') {
    const current = sunWindows.find(
      (w) =>
        (w.sun_status === 'sunny' || w.sun_status === 'partial') &&
        new Date(w.start).getTime() <= now.getTime() &&
        new Date(w.end).getTime() > now.getTime()
    );
    if (current) {
      return t('venue.sunRange', { start: formatTime(current.start), end: formatTime(current.end) }, lang);
    }
  }

  if (variant === 'upcoming') {
    const upcoming = sunWindows
      .filter((w) => w.sun_status === 'sunny' && new Date(w.start).getTime() > now.getTime())
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];

    if (upcoming) {
      const minutesAway = Math.round(
        (new Date(upcoming.start).getTime() - now.getTime()) / 60000
      );
      if (minutesAway <= 60) {
        return t('venue.sunIn', { minutes: minutesAway }, lang);
      }
      return t('venue.nextSun', { time: formatTime(upcoming.start) }, lang);
    }
  }

  return t('venue.noSun', undefined, lang);
}

export function getDirectionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
