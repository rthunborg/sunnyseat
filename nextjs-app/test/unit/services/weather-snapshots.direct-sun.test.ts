import { describe, expect, it } from 'vitest';
import {
  gateGeometrySeriesWithWeatherSnapshots,
  matchNowcastObservationToForecast,
  normalizeWeatherSnapshotSlices,
  refreshWeatherSnapshotsForVenue,
  selectSnapshotSliceForStep,
} from '@/lib/services/weather-snapshots';
import { extractPublicSunPeak, extractPublicSunWindow, isVenuePubliclySunny } from '@/lib/utils/public-sun';

describe('persisted weather snapshot direct-sun contract', () => {
  it.each([true, false])('unknown duplicate evidence wins timestamp/minute ties (malformed first=%s)', (malformedFirst) => {
    const clear = {
      minutes: 720, validAt: '2026-07-01T10:00:00.000Z',
      cloudCover: 0, cloudCoverLow: 0, cloudCoverMedium: 0, cloudCoverHigh: 0,
      fogAreaFraction: 0, precipitationAmount: 0, symbolCode: 'clearsky_day',
    };
    const malformed = { ...clear, isRaining: 'true' };
    const slices = normalizeWeatherSnapshotSlices(malformedFirst ? [malformed, clear] : [clear, malformed]);
    for (const stockholmDate of ['2026-07-01', undefined]) {
      const [step] = gateGeometrySeriesWithWeatherSnapshots({
        geometrySeries: [{ minutes: 720, sunExposurePercent: 95 }],
        weatherSlices: slices, stockholmDate,
      });
      expect(step.directSunState).toBe('unknown');
      expect(isVenuePubliclySunny(step)).toBe(false);
    }
  });

  it.each(['weatherUnknown', 'isRaining'] as const)('fails closed on malformed %s without selecting a clear neighbour', (flag) => {
    const clear = {
      minutes: 720, validAt: '2026-07-01T10:00:00.000Z',
      cloudCover: 0, cloudCoverLow: 0, cloudCoverMedium: 0, cloudCoverHigh: 0,
      fogAreaFraction: 0, precipitationAmount: 0, symbolCode: 'clearsky_day',
    };
    for (const value of ['true', 'false', null, 0, 1, {}, []]) {
      const slices = normalizeWeatherSnapshotSlices([
        { ...clear, [flag]: value },
        { ...clear, minutes: 780, validAt: '2026-07-01T11:00:00.000Z' },
      ], { requireValidAt: true });
      expect(selectSnapshotSliceForStep({ requestedAt: new Date(clear.validAt), slices }))
        .toMatchObject({ validAt: clear.validAt, weatherUnknown: true });
      const series = gateGeometrySeriesWithWeatherSnapshots({
        geometrySeries: [{ minutes: 720, sunExposurePercent: 95 }],
        weatherSlices: slices, stockholmDate: '2026-07-01',
      });
      expect(series[0]).toMatchObject({ directSunState: 'unknown', weatherGateState: 'unknown' });
      expect(isVenuePubliclySunny(series[0])).toBe(false);
      expect(extractPublicSunWindow(series, { stepMinutes: 15 })).toBeNull();
      expect(extractPublicSunPeak(series)).toBeNull();
    }
  });

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
      status: 'Sunny',
    });
  });

  it('keeps positive 12:04 nowcast rain on the persisted 12:00 slice after a 12:05 refresh', async () => {
    const validAt = '2026-07-03T12:00:00.000Z';
    const nowcastMatch = matchNowcastObservationToForecast({
      forecastSlices: [{ validAt }, { validAt: '2026-07-03T13:00:00.000Z' }],
      observation: {
        validAt: '2026-07-03T12:04:00.000Z',
        precipitationRate: 0.4,
      },
      refreshedAt: new Date('2026-07-03T12:05:00.000Z'),
    });
    expect(nowcastMatch).toEqual({
      forecastValidAt: validAt,
      observation: {
        validAt: '2026-07-03T12:04:00.000Z',
        precipitationRate: 0.4,
      },
    });

    const refreshed = await refreshWeatherSnapshotsForVenue({
      now: new Date('2026-07-03T12:05:00.000Z'),
      forecastSlices: [{
        minutes: 840,
        validAt,
        cloudCover: 0,
        cloudCoverLow: 0,
        cloudCoverMedium: 0,
        cloudCoverHigh: 0,
        fogAreaFraction: 0,
        precipitationAmount: 0,
        symbolCode: 'clearsky_day',
      }, {
        minutes: 900,
        validAt: '2026-07-03T13:00:00.000Z',
        cloudCover: 0,
      }],
      nowcastObservation: nowcastMatch?.observation,
    });
    expect(refreshed.slices[0]).toMatchObject({
      validAt,
      nowcastValidAt: '2026-07-03T12:04:00.000Z',
      nowcastPrecipitationRate: 0.4,
      isRaining: true,
    });
    expect(refreshed.slices[1]).not.toHaveProperty('isRaining');

    const [step] = gateGeometrySeriesWithWeatherSnapshots({
      geometrySeries: [{ minutes: 840, sunExposurePercent: 95 }],
      weatherSlices: refreshed.slices,
    });

    expect(step).toMatchObject({
      directSunState: 'blocked',
      directSunReasons: ['precipitation'],
      weatherGateState: 'gated',
      skyCondition: 'rain',
    });
  });

  it('rejects a nowcast observation that is too old to be current evidence', () => {
    expect(matchNowcastObservationToForecast({
      forecastSlices: [{ validAt: '2026-07-03T12:00:00.000Z' }],
      observation: {
        validAt: '2026-07-03T11:49:00.000Z',
        precipitationRate: 0.4,
      },
      refreshedAt: new Date('2026-07-03T12:05:00.000Z'),
    })).toBeUndefined();
  });

  it('discards malformed persisted entries without crashing and retains a valid neighbour', () => {
    const validSlice = {
      minutes: 720,
      validAt: '2026-07-01T10:00:00.000Z',
      cloudCover: 100,
      symbolCode: 'cloudy',
    };
    const malformed = [null, 'broken', 7, { validAt: 'not-a-time' }, validSlice];

    expect(normalizeWeatherSnapshotSlices(malformed, { requireValidAt: true })).toEqual([
      validSlice,
    ]);
    expect(() => gateGeometrySeriesWithWeatherSnapshots({
      geometrySeries: [{ minutes: 720, sunExposurePercent: 95 }],
      weatherSlices: malformed as never,
    })).not.toThrow();
    expect(gateGeometrySeriesWithWeatherSnapshots({
      geometrySeries: [{ minutes: 720, sunExposurePercent: 95 }],
      weatherSlices: malformed as never,
    })[0]).toMatchObject({ directSunState: 'blocked', weatherGateState: 'gated' });
  });

  it('turns an all-malformed persisted array into unknown weather instead of throwing', () => {
    const [step] = gateGeometrySeriesWithWeatherSnapshots({
      geometrySeries: [{ minutes: 720, sunExposurePercent: 95 }],
      weatherSlices: [null, false, 'broken'] as never,
    });

    expect(step).toMatchObject({
      directSunState: 'unknown',
      directSunReasons: ['weather-unavailable'],
      weatherGateState: 'unknown',
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
