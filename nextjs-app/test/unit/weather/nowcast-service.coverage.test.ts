/**
 * COVERAGE EXPANSION (bmad-testarch-automate) — Story 10.4 AC1
 * Nowcast 2.0 client (`lib/weather/nowcast-service.ts` → `getNowcastPrecipitationRate`).
 *
 * The AC1 acceptance suite (`nowcast-service.cloud-gate.atdd.test.ts`) pins the
 * URL/UA/coverage/degradation contract using SINGLE-entry synthetic responses.
 * This file expands coverage of the two behaviours that single-entry fixtures
 * cannot exercise:
 *   1. `nearestToNowEntry` slice selection across a MULTI-entry timeseries — the
 *      near-now rate must be the entry closest to the real clock, not the first
 *      or last, and an unparseable `entry.time` must never silently select the
 *      wrong slice (the 8.5-R1 Invalid-Date defensiveness folded into the client).
 *   2. The DEFAULT-coordinate accessor path (`getNowcastPrecipitationRate()` with
 *      no args → Gothenburg), which the fixed-coordinate AC1 tests never hit.
 *
 * MOCK BOUNDARY (MEMORY: "no live Met.no calls in any test"): `fetch` is stubbed
 * and fed a synthetic Nowcast 2.0 `complete` response — NO network. Fake timers
 * pin "now" so the nearest-to-now selection is deterministic.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getNowcastPrecipitationRate } from '@/lib/weather/nowcast-service';
import { GOTHENBURG } from '@/lib/solar/constants';

type Entry = { time: string; rate?: number; omitRate?: boolean };

/**
 * Minimal Nowcast 2.0 `complete` (GeoJSON) response mirroring the real product
 * shape: `properties.timeseries[].data.instant.details.precipitation_rate`.
 * `omitRate` drops the field entirely (radar-coverage-insufficient case).
 */
function nowcastResponse(entries: Entry[]) {
  return {
    properties: {
      timeseries: entries.map(({ time, rate, omitRate }) => ({
        time,
        data: {
          instant: {
            details: {
              air_temperature: 15,
              ...(omitRate ? {} : { precipitation_rate: rate ?? 0 }),
            },
          },
        },
      })),
    },
  };
}

// Pin "now" so "nearest to now" is deterministic across the timeseries.
const NOW = new Date('2026-07-03T12:00:00.000Z');

describe('nowcast-service — near-now slice selection across a multi-entry timeseries', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns the rate of the entry NEAREST to now — not the first, not the last', async () => {
    // now = 12:00. The 11:55 step is 5 min away; 12:30 is 30 min; 13:00 is 60 min.
    // The nearest (11:55) rate must win even though it is not the first (11:00) or
    // last (13:00) entry.
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        nowcastResponse([
          { time: '2026-07-03T11:00:00Z', rate: 9.9 }, // far past
          { time: '2026-07-03T11:55:00Z', rate: 0.3 }, // nearest to now
          { time: '2026-07-03T12:30:00Z', rate: 5.0 }, // far future
          { time: '2026-07-03T13:00:00Z', rate: 8.0 }, // last
        ]),
    });

    const rate = await getNowcastPrecipitationRate(57.7089, 11.9746);

    expect(rate).toBe(0.3);
  });

  it('picks the nearest entry that is in the FUTURE when the future step is closer than the past one', async () => {
    // now = 12:00. 11:40 is 20 min behind; 12:05 is 5 min ahead → the future step wins.
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        nowcastResponse([
          { time: '2026-07-03T11:40:00Z', rate: 2.0 },
          { time: '2026-07-03T12:05:00Z', rate: 0.1 }, // nearest (5 min ahead)
        ]),
    });

    const rate = await getNowcastPrecipitationRate(57.7089, 11.9746);

    expect(rate).toBe(0.1);
  });

  it('SKIPS entries with an unparseable time and selects the nearest PARSEABLE entry (no wrong-slice leak)', async () => {
    // The nearest-by-position entry has a garbage timestamp; it must be ignored,
    // and the nearest parseable entry (12:05, 5 min away) selected instead — never
    // the NaN slice's rate. (8.5-R1 Invalid-Date defensiveness.)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        nowcastResponse([
          { time: 'not-a-timestamp', rate: 7.7 }, // unparseable → skipped
          { time: '2026-07-03T12:05:00Z', rate: 0.2 }, // nearest parseable
          { time: '2026-07-03T14:00:00Z', rate: 6.0 },
        ]),
    });

    const rate = await getNowcastPrecipitationRate(57.7089, 11.9746);

    expect(rate).toBe(0.2);
    expect(rate).not.toBe(7.7);
  });

  it('falls back to the FIRST entry when every time is unparseable (natural earliest ≈ now step)', async () => {
    // No entry can be time-compared → fall back to the first entry rather than
    // NaN-selecting or throwing. The first entry carries the returned rate.
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        nowcastResponse([
          { time: 'not-a-timestamp', rate: 0.6 }, // first → fallback
          { time: 'also-not-a-timestamp', rate: 9.0 },
        ]),
    });

    const rate = await getNowcastPrecipitationRate(57.7089, 11.9746);

    expect(rate).toBe(0.6);
  });

  it('keeps the unknown-vs-0 distinction on the SELECTED near-now entry (absent field on the nearest ⇒ undefined)', async () => {
    // The nearest-to-now entry (11:58) has NO precipitation_rate (coverage
    // insufficient for that slice) while a neighbouring slice does. The selected
    // near-now entry governs, so the result is `undefined` (unknown) — NEVER the
    // neighbour's 0, and NEVER a fabricated 0.
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        nowcastResponse([
          { time: '2026-07-03T11:00:00Z', rate: 0 },
          { time: '2026-07-03T11:58:00Z', omitRate: true }, // nearest, field absent
        ]),
    });

    const rate = await getNowcastPrecipitationRate(57.7089, 11.9746);

    expect(rate).toBeUndefined();
    expect(rate).not.toBe(0);
  });
});

describe('nowcast-service — default-coordinate accessor path', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('called with NO arguments defaults to the Gothenburg coordinate (4-dp truncated)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => nowcastResponse([{ time: '2026-07-03T12:00:00Z', rate: 0 }]),
    });

    await getNowcastPrecipitationRate();

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain(`lat=${GOTHENBURG.LATITUDE.toFixed(4)}`);
    expect(url).toContain(`lon=${GOTHENBURG.LONGITUDE.toFixed(4)}`);
  });
});
