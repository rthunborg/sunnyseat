import { describe, expect, it } from 'vitest';
import { gateGeometrySeriesWithWeatherSnapshots, selectSnapshotSliceForStep } from '@/lib/services/weather-snapshots';
import { extractPublicSunPeak, extractPublicSunWindow, isVenuePubliclySunny } from '@/lib/utils/public-sun';

describe('persisted weather snapshot direct-sun contract', () => {
  it('keeps fresh complete overcast out of public results, peaks, and windows', () => {
    const series = gateGeometrySeriesWithWeatherSnapshots({
      geometrySeries: [{ minutes: 720, sunExposurePercent: 95 }],
      weatherSlices: [{
        minutes: 720,
        validAt: '2026-07-01T10:00:00.000Z',
        cloudCover: 100,
        cloudCoverLow: 0,
        cloudCoverMedium: 100,
        cloudCoverHigh: 0,
        fogAreaFraction: 0,
        precipitationAmount: 0,
        symbolCode: 'cloudy',
      }],
    });

    expect(series).toMatchObject([{
      sunExposurePercent: 95,
      directSunState: 'blocked',
      weatherGateState: 'gated',
      currentSunStatus: 'CloudObscured',
    }]);
    expect(isVenuePubliclySunny(series[0]!)).toBe(false);
    expect(extractPublicSunPeak(series)).toBeNull();
    expect(extractPublicSunWindow(series, { stepMinutes: 15 })).toBeNull();
  });

  it('keeps one fresh complete clear snapshot affirmative across verdict, peak, and window extraction', () => {
    const series = gateGeometrySeriesWithWeatherSnapshots({
      geometrySeries: [{ minutes: 720, sunExposurePercent: 95 }],
      weatherSlices: [{
        minutes: 720,
        validAt: '2026-07-01T10:00:00.000Z',
        cloudCover: 0,
        cloudCoverLow: 0,
        cloudCoverMedium: 0,
        cloudCoverHigh: 0,
        fogAreaFraction: 0,
        precipitationAmount: 0,
        symbolCode: 'clearsky_day',
      }],
      stockholmDate: '2026-07-01',
      venue: { id: 'clear-path', location: { lat: 57.7089, lng: 11.9746 } },
    });

    expect(series).toMatchObject([{
      sunExposurePercent: 95,
      directSunState: 'likely',
      weatherGateState: 'not_gated',
      skyCondition: 'clear',
    }]);
    expect(isVenuePubliclySunny(series[0]!)).toBe(true);
    expect(extractPublicSunPeak(series)?.minutes).toBe(720);
    expect(extractPublicSunWindow(series, { stepMinutes: 15 })).toEqual({
      startMinutes: 720,
      endMinutes: 720,
      weatherGateState: 'not_gated',
    });
  });

  it('fails legacy and unmatched snapshots safe to unknown', () => {
    const [legacy] = gateGeometrySeriesWithWeatherSnapshots({
      geometrySeries: [{ minutes: 720, sunExposurePercent: 95 }],
      weatherSlices: [{ minutes: 720, cloudCover: 0 }],
    });
    const [unmatched] = gateGeometrySeriesWithWeatherSnapshots({
      geometrySeries: [{ minutes: 720, sunExposurePercent: 95 }],
      weatherSlices: [],
    });
    expect(legacy?.directSunState).toBe('unknown');
    expect(unmatched?.directSunState).toBe('unknown');
    expect(isVenuePubliclySunny(legacy!)).toBe(false);
    expect(isVenuePubliclySunny(unmatched!)).toBe(false);
  });

  it.each([
    ['missing', undefined],
    ['malformed', 'not-a-timestamp'],
    ['outside the 90-minute boundary', '2026-06-30T10:00:00.000Z'],
  ])('rejects an exact minute match whose validAt is %s', (_case, validAt) => {
    const [step] = gateGeometrySeriesWithWeatherSnapshots({
      geometrySeries: [{ minutes: 720, sunExposurePercent: 95 }],
      weatherSlices: [{
        minutes: 720,
        validAt,
        cloudCover: 0,
        cloudCoverLow: 0,
        cloudCoverMedium: 0,
        cloudCoverHigh: 0,
        fogAreaFraction: 0,
        precipitationAmount: 0,
        symbolCode: 'clearsky_day',
      }],
      stockholmDate: '2026-07-01',
      venue: { id: 'timestamp-guard', location: { lat: 57.7089, lng: 11.9746 } },
    });

    expect(step).toMatchObject({
      directSunState: 'unknown',
      directSunReasons: ['weather-unavailable'],
      weatherGateState: 'unknown',
    });
  });

  it('does not mislabel geometry below the public threshold as weather-obscured', () => {
    const [step] = gateGeometrySeriesWithWeatherSnapshots({
      geometrySeries: [{ minutes: 720, sunExposurePercent: 40 }],
      weatherSlices: [{
        minutes: 720,
        cloudCover: 0,
        cloudCoverLow: 0,
        cloudCoverMedium: 0,
        cloudCoverHigh: 0,
        fogAreaFraction: 0,
        precipitationAmount: 0,
        symbolCode: 'clearsky_day',
      }],
    });

    expect(step).toMatchObject({
      currentSunStatus: 'Partial',
      directSunState: 'blocked',
      directSunReasons: ['geometry'],
      weatherGateState: 'not_gated',
    });
  });

  it.each([
    [-91, true],
    [-90, false],
    [-89, false],
    [0, false],
    [89, false],
    [90, false],
    [91, true],
  ])('uses the signed 90-minute match boundary (%i minutes => unknown %s)', (minutesAway, unknown) => {
    const requestedAt = new Date('2026-10-25T00:30:00.000Z'); // Stockholm DST transition day
    const selected = selectSnapshotSliceForStep({
      requestedAt,
      slices: [{ validAt: new Date(requestedAt.getTime() + minutesAway * 60_000).toISOString() }],
    });
    expect(selected.weatherUnknown === true).toBe(unknown);
  });

  it('skips an invalid timestamp and selects the nearest valid slice', () => {
    const requestedAt = new Date('2026-07-01T10:00:00.000Z');
    const selected = selectSnapshotSliceForStep({
      requestedAt,
      slices: [
        { validAt: 'not-a-timestamp', cloudCover: 100 },
        { validAt: '2026-07-01T10:15:00.000Z', cloudCover: 0 },
      ],
    });
    expect(selected).toMatchObject({ validAt: '2026-07-01T10:15:00.000Z', cloudCover: 0 });
  });
});
