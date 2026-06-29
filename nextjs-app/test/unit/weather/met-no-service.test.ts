import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getForecast } from '@/lib/weather/met-no-service';

/** Minimal Met.no compact response with one instant detail per timestamp. */
function metNoResponse(times: string[]) {
  return {
    properties: {
      timeseries: times.map((time) => ({
        time,
        data: {
          instant: {
            details: { air_temperature: 18, cloud_area_fraction: 40 },
          },
        },
      })),
    },
  };
}

describe('met-no-service getForecast (Story 8.5 5.3/5.4)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.unstubAllEnvs();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function headersFromCall(index = 0): Record<string, string> {
    const [, init] = fetchMock.mock.calls[index] as [string, RequestInit];
    return init.headers as Record<string, string>;
  }

  it('sends the configured MET_NO_USER_AGENT contact identity per Met.no TOS (5.4)', async () => {
    vi.stubEnv('MET_NO_USER_AGENT', 'SunnySeat/2.0 ops@sunnyseat.se');
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => metNoResponse(['2026-06-21T12:00:00Z']),
    });

    await getForecast(57.7089, 11.9746);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(headersFromCall()['User-Agent']).toBe('SunnySeat/2.0 ops@sunnyseat.se');
  });

  it('falls back to a non-secret identifying default User-Agent when unset', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => metNoResponse(['2026-06-21T12:00:00Z']),
    });

    await getForecast(57.7089, 11.9746);

    expect(headersFromCall()['User-Agent']).toBe('SunnySeat/1.0 rasmus.thunborg@enhancior.se');
  });

  it('ignores a blank MET_NO_USER_AGENT and uses the default', async () => {
    vi.stubEnv('MET_NO_USER_AGENT', '   ');
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => metNoResponse(['2026-06-21T12:00:00Z']),
    });

    await getForecast(57.7089, 11.9746);

    expect(headersFromCall()['User-Agent']).toBe('SunnySeat/1.0 rasmus.thunborg@enhancior.se');
  });

  it('truncates request coordinates to 4 decimals per Met.no TOS', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => metNoResponse(['2026-06-21T12:00:00Z']),
    });

    await getForecast(57.70891, 11.97461);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('lat=57.7089');
    expect(url).toContain('lon=11.9746');
  });

  it('carries each slice valid-time (validAt) from entry.time (5.3)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        metNoResponse(['2026-06-21T12:00:00Z', '2026-06-21T13:00:00Z']),
    });

    const slices = await getForecast(57.7089, 11.9746);

    expect(slices[0].validAt?.toISOString()).toBe('2026-06-21T12:00:00.000Z');
    expect(slices[1].validAt?.toISOString()).toBe('2026-06-21T13:00:00.000Z');
    // createdAt (fetch instant) remains present for the confidence calculator.
    expect(slices[0].createdAt).toBeInstanceOf(Date);
  });
});
