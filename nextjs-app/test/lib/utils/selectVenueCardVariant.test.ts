import { describe, it, expect } from 'vitest';
import { selectVariant, getDetailLineText, getDirectionsUrl } from '@/lib/utils/selectVenueCardVariant';
import type { SunExposureResult } from '@/lib/types/venue';

function makeResult(overrides: Partial<SunExposureResult> = {}): SunExposureResult {
  return {
    venue: { id: '1', name: 'Test', slug: 'test', neighborhood: 'Haga', lat: 57.7, lng: 11.9 },
    current_status: 'shaded',
    sun_exposure_percent: 0,
    confidence: 0.8,
    windows: [],
    ...overrides,
  };
}

describe('selectVariant', () => {
  it('returns sunny when current_status is sunny', () => {
    expect(selectVariant(makeResult({ current_status: 'sunny' }))).toBe('sunny');
  });

  it('returns partial when current_status is partial', () => {
    expect(selectVariant(makeResult({ current_status: 'partial' }))).toBe('partial');
  });

  it('returns upcoming when a sunny window starts within 90 minutes', () => {
    const now = new Date('2026-03-14T12:00:00Z');
    const result = makeResult({
      current_status: 'shaded',
      windows: [
        { start: '2026-03-14T13:00:00Z', end: '2026-03-14T15:00:00Z', sun_status: 'sunny', sky_condition: 'clear' },
      ],
    });
    expect(selectVariant(result, now)).toBe('upcoming');
  });

  it('returns shaded when sunny window is more than 90 minutes away', () => {
    const now = new Date('2026-03-14T12:00:00Z');
    const result = makeResult({
      current_status: 'shaded',
      windows: [
        { start: '2026-03-14T14:00:00Z', end: '2026-03-14T16:00:00Z', sun_status: 'sunny', sky_condition: 'clear' },
      ],
    });
    expect(selectVariant(result, now)).toBe('shaded');
  });

  it('returns shaded when no windows at all', () => {
    expect(selectVariant(makeResult())).toBe('shaded');
  });

  it('ignores partial windows for upcoming check', () => {
    const now = new Date('2026-03-14T12:00:00Z');
    const result = makeResult({
      current_status: 'shaded',
      windows: [
        { start: '2026-03-14T12:30:00Z', end: '2026-03-14T14:00:00Z', sun_status: 'partial', sky_condition: 'clear' },
      ],
    });
    expect(selectVariant(result, now)).toBe('shaded');
  });
});

describe('getDetailLineText', () => {
  it('returns sun range for sunny variant with active window', () => {
    const now = new Date('2026-03-14T14:00:00Z');
    const windows = [
      { start: '2026-03-14T13:00:00Z', end: '2026-03-14T17:30:00Z', sun_status: 'sunny' as const, sky_condition: 'clear' as const },
    ];
    const text = getDetailLineText('sunny', windows, now, 'sv');
    expect(text).toContain('Sol:');
  });

  it('returns "Sol om X min" for upcoming variant within 60 minutes', () => {
    const now = new Date('2026-03-14T14:00:00Z');
    const windows = [
      { start: '2026-03-14T14:45:00Z', end: '2026-03-14T17:00:00Z', sun_status: 'sunny' as const, sky_condition: 'clear' as const },
    ];
    const text = getDetailLineText('upcoming', windows, now, 'sv');
    expect(text).toContain('Sol om');
    expect(text).toContain('min');
  });

  it('returns "Ingen sol idag" for shaded with no windows', () => {
    const text = getDetailLineText('shaded', [], new Date(), 'sv');
    expect(text).toBe('Ingen sol idag');
  });
});

describe('getDirectionsUrl', () => {
  it('returns a Google Maps directions URL', () => {
    const url = getDirectionsUrl(57.7, 11.9);
    expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=57.7,11.9');
  });
});
