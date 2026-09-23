import type { GeometryDayPayload } from '@/lib/services/sun-geometry-season-codec';

/** Synthetic observations with two measured, 100ms-wide threshold brackets. */
export function crossingDay(): GeometryDayPayload {
  const offsets = [...Array.from({ length: 16 }, (_, i) => i * 60000),
    300000.5, 300100.5, 600200.5, 600300.5].sort((a, b) => a - b);
  return {
    format: 'f64-v1', date: '2026-06-21', horizon: [0, 900000], offsets,
    exposure: offsets.map(t => t > 300050.5 && t < 600250.5 ? 100 : 0),
    starts: [0, 300050.5, 600250.5], ends: [300050.5, 600250.5, 900000],
    sunny: [false, true, false], startUncertaintyMs: [0, 50, 50], endUncertaintyMs: [50, 50, 0],
  };
}

/** Round 2 regression: a claimed five-minute window with no sunny observation. */
export function unsupportedWindowDay(): GeometryDayPayload {
  return {
    format: 'f64-v1', date: '2026-06-21', horizon: [0, 900000],
    offsets: [0, 300000, 600000, 900000], exposure: [0, 0, 0, 0],
    starts: [0, 300000, 600000], ends: [300000, 600000, 900000], sunny: [false, true, false],
    startUncertaintyMs: [0, 0, 0], endUncertaintyMs: [0, 0, 0],
  };
}
