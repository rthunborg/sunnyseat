/**
 * ATDD acceptance tests — Story 10.1 AC2
 * "Missing cloud data ⇒ weather-unknown, never clear"
 *
 * Written red-first (they FAILED until Task 2 made `met-no-service.ts` stop
 * defaulting a missing `cloud_area_fraction` to `0`). Now that Task 2 is
 * implemented these are un-skipped and green.
 *
 * WHY THIS SURFACE:
 * `met-no-service.ts:85` is the ONLY place cloud data enters a `WeatherSlice`.
 * Today it does `cloud_area_fraction ?? 0` — the optimistic default is exactly
 * the wrong failure mode: absent data must read "unknown", NEVER "sunny".
 * AC2 requires that a missing field can never produce a "clear" gate input.
 *
 * REPRESENTATION OF "unknown cloud" (Task 2 dev decision):
 * The story leaves the representation to the dev — preferred is
 * `cloudCover?: number | undefined` (undefined when absent), OR a separate
 * `cloudCoverKnown: boolean`. These assertions are written against the
 * PREFERRED representation (`cloudCover` becomes `undefined`). If the dev
 * chooses the boolean-flag representation instead, adjust the two "unknown"
 * assertions here to read the flag — do NOT weaken the invariant that a missing
 * field never yields `0`/clear.
 *
 * MOCK BOUNDARY (MEMORY: "do NOT add live Met.no calls to any test"):
 * We stub `fetch` and feed a synthetic Met.no compact response, exactly like
 * the existing met-no-service.test.ts — no network.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getForecast } from '@/lib/weather/met-no-service';

/**
 * Minimal Met.no `complete` response. `omitCloud` drops `cloud_area_fraction` from
 * the instant details entirely (the real-world "field absent" case) while keeping
 * `air_temperature` present. STORY 10.3: `low`/`medium`/`high` inject the
 * three-layer `complete` split (`cloud_area_fraction_low/_medium/_high`); each is
 * omitted from the payload when the corresponding argument is `undefined`, so a
 * band can be individually absent (the partial-`complete` degradation case).
 */
function metNoResponse(
  entries: Array<{
    time: string;
    omitCloud?: boolean;
    cloud?: number;
    low?: number;
    medium?: number;
    high?: number;
  }>,
) {
  return {
    properties: {
      timeseries: entries.map(({ time, omitCloud, cloud, low, medium, high }) => ({
        time,
        data: {
          instant: {
            details: {
              air_temperature: 18,
              ...(omitCloud ? {} : { cloud_area_fraction: cloud ?? 40 }),
              ...(low !== undefined ? { cloud_area_fraction_low: low } : {}),
              ...(medium !== undefined ? { cloud_area_fraction_medium: medium } : {}),
              ...(high !== undefined ? { cloud_area_fraction_high: high } : {}),
            },
          },
        },
      })),
    },
  };
}

describe('[10.1 AC2] met-no-service missing cloud ⇒ weather-unknown', () => {
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

  it('an entry with temperature present but cloud_area_fraction ABSENT yields an unknown cloud value, never 0/clear', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => metNoResponse([{ time: '2026-06-21T12:00:00Z', omitCloud: true }]),
    });

    const slices = await getForecast(57.7089, 11.9746);

    expect(slices).toHaveLength(1);
    // The bug is `cloud_area_fraction ?? 0`. Post-fix, an absent field must NOT
    // fabricate 0 (clear). Preferred representation = undefined.
    expect(slices[0].cloudCover).toBeUndefined();
    // And it must never be the optimistic clear-sky default.
    expect(slices[0].cloudCover).not.toBe(0);
  });

  it('never fabricates an overcast default either (unknown ≠ 100)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => metNoResponse([{ time: '2026-06-21T12:00:00Z', omitCloud: true }]),
    });

    const slices = await getForecast(57.7089, 11.9746);

    // Absent = genuinely unknown. Do NOT swing to the pessimistic `?? 100`
    // either — that would fabricate overcast and wrongly gate the venue.
    expect(slices[0].cloudCover).not.toBe(100);
  });

  it('preserves the known-cloud path unchanged when the field IS present', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        metNoResponse([{ time: '2026-06-21T12:00:00Z', cloud: 85 }]),
    });

    const slices = await getForecast(57.7089, 11.9746);

    // A present value flows through byte-identical (no regression to the
    // existing 8.5 known-cloud behaviour).
    expect(slices[0].cloudCover).toBe(85);
  });

  it('leaves non-cloud fields untouched (temperature/source/validAt) when cloud is absent', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => metNoResponse([{ time: '2026-06-21T12:00:00Z', omitCloud: true }]),
    });

    const slices = await getForecast(57.7089, 11.9746);

    // Task 2: only the cloud representation changes — temperature, source and
    // validAt plumbing must be exactly as before.
    expect(slices[0].temperature).toBe(18);
    expect(slices[0].source).toBe('metno');
    expect(slices[0].validAt?.toISOString()).toBe('2026-06-21T12:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// STORY 10.3 AC1: `complete` endpoint + three-layer cloud split mapping
// ---------------------------------------------------------------------------
describe('[10.3 AC1] met-no-service switches to `complete` + carries the layer split', () => {
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

  it('requests the `complete` endpoint path (not `compact`) — the layer split lives there only', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => metNoResponse([{ time: '2026-06-21T12:00:00Z' }]),
    });

    await getForecast(57.7089, 11.9746);

    const [url] = fetchMock.mock.calls[0] as [string];
    // Mirrors the 4-decimal-truncation URL assertion in met-no-service.test.ts:75.
    expect(url).toContain('/locationforecast/2.0/complete');
    expect(url).not.toContain('/compact');
    // The TOS-mandated 4-decimal truncation still carries over unchanged.
    expect(url).toContain('lat=57.7089');
    expect(url).toContain('lon=11.9746');
  });

  it('maps cloud_area_fraction_low/_medium/_high onto the slice when all three are present', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        metNoResponse([
          { time: '2026-06-21T12:00:00Z', cloud: 90, low: 10, medium: 20, high: 95 },
        ]),
    });

    const slices = await getForecast(57.7089, 11.9746);

    expect(slices).toHaveLength(1);
    expect(slices[0].cloudCover).toBe(90); // total retained
    expect(slices[0].cloudCoverLow).toBe(10);
    expect(slices[0].cloudCoverMedium).toBe(20);
    expect(slices[0].cloudCoverHigh).toBe(95);
  });

  it('leaves a MISSING layer field undefined (never 0) — the partial-`complete` degradation case (AC3)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        // `low` present, `medium`/`high` absent from the entry entirely.
        metNoResponse([{ time: '2026-06-21T12:00:00Z', cloud: 50, low: 15 }]),
    });

    const slices = await getForecast(57.7089, 11.9746);

    expect(slices[0].cloudCoverLow).toBe(15);
    // Absent bands must read "unknown", never the optimistic clear-sky `0`.
    expect(slices[0].cloudCoverMedium).toBeUndefined();
    expect(slices[0].cloudCoverHigh).toBeUndefined();
    expect(slices[0].cloudCoverMedium).not.toBe(0);
    expect(slices[0].cloudCoverHigh).not.toBe(0);
    // The Tier-0 total is still carried for the fallback.
    expect(slices[0].cloudCover).toBe(50);
  });

  it('leaves ALL layer fields undefined when the `complete` entry carries only the total (compact-shaped payload)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => metNoResponse([{ time: '2026-06-21T12:00:00Z', cloud: 70 }]),
    });

    const slices = await getForecast(57.7089, 11.9746);

    expect(slices[0].cloudCover).toBe(70);
    expect(slices[0].cloudCoverLow).toBeUndefined();
    expect(slices[0].cloudCoverMedium).toBeUndefined();
    expect(slices[0].cloudCoverHigh).toBeUndefined();
  });

  // COVERAGE EXPANSION: the AC1 mapping tests above are all single-entry. A real
  // `complete` forecast is a MULTI-entry timeseries where each hour carries its own
  // independent split (and a later hour may be a partial-`complete` entry). This
  // pins that the per-entry mapping is independent — one entry's missing band never
  // bleeds into another's — which the single-entry tests cannot prove.
  it('maps the three-layer split PER ENTRY across a multi-hour forecast, independently', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () =>
        metNoResponse([
          // hour 0: full split
          { time: '2026-06-21T12:00:00Z', cloud: 90, low: 10, medium: 20, high: 95 },
          // hour 1: cirrus-only split
          { time: '2026-06-21T13:00:00Z', cloud: 100, low: 0, medium: 0, high: 100 },
          // hour 2: partial split (only low present)
          { time: '2026-06-21T14:00:00Z', cloud: 50, low: 15 },
          // hour 3: compact-shaped (total only)
          { time: '2026-06-21T15:00:00Z', cloud: 30 },
        ]),
    });

    const slices = await getForecast(57.7089, 11.9746);

    expect(slices).toHaveLength(4);

    // Each entry's bands are its own — no cross-contamination.
    expect(slices[0].cloudCoverLow).toBe(10);
    expect(slices[0].cloudCoverHigh).toBe(95);

    expect(slices[1].cloudCoverHigh).toBe(100);
    expect(slices[1].cloudCoverLow).toBe(0);

    expect(slices[2].cloudCoverLow).toBe(15);
    expect(slices[2].cloudCoverMedium).toBeUndefined(); // partial ⇒ absent, never 0
    expect(slices[2].cloudCoverHigh).toBeUndefined();

    expect(slices[3].cloudCover).toBe(30);
    expect(slices[3].cloudCoverLow).toBeUndefined();
    expect(slices[3].cloudCoverMedium).toBeUndefined();
    expect(slices[3].cloudCoverHigh).toBeUndefined();
  });
});
