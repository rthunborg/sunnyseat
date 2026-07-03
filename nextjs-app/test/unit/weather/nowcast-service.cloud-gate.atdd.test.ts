/**
 * ATDD RED-PHASE acceptance scaffolds — Story 10.4 AC1
 * "A TOS-compliant Nowcast 2.0 client with graceful degradation"
 *
 * Written RED-FIRST for Story 10.4 Task 1. These assertions describe the
 * behaviour of a client (`lib/weather/nowcast-service.ts` →
 * `getNowcastPrecipitationRate(lat, lon): Promise<number | undefined>`) that
 * DOES NOT EXIST YET. The whole `describe` is `.skip`-gated so the suite is
 * green on HEAD and the dev un-skips it once Task 1 lands.
 *
 * =========================================================================
 * WHY THE LOOSELY-TYPED DYNAMIC-IMPORT ACCESSOR (epic-10 ratified pattern)
 * =========================================================================
 * The tsc CI gate compiles `.skip`-ped tests too — `vitest run` skips the
 * BODY, but `tsc --noEmit` still type-checks every line. A red-first scaffold
 * that names a not-yet-existent export (`@/lib/weather/nowcast-service` and
 * its `getNowcastPrecipitationRate`) with a STATIC import would hard-break
 * `tsc` and turn CI red before a single line of production code is written —
 * defeating the point of a red-first scaffold. Story 10.1 established the fix
 * (see the `.cloud-gate.atdd.test.ts` siblings): reach the not-yet-existent
 * export through a LOOSELY-TYPED runtime dynamic-import accessor so `tsc` sees
 * only `unknown`/`any` and never a missing-symbol error. When Task 1 lands and
 * the module exists, the accessor resolves the real function unchanged — no
 * edit needed here beyond removing `.skip`.
 *
 * MOCK BOUNDARY (MEMORY: "no live Met.no calls in any test"):
 * We stub `fetch` and feed a synthetic Nowcast 2.0 `complete` response,
 * exactly like the existing `met-no-service.cloud-gate.atdd.test.ts` — NO
 * network.
 *
 * UNKNOWN ≠ 0 DISCIPLINE (epic-10 ratified invariant, extended to the rate):
 * An absent/failed/no-coverage `precipitation_rate` must read `undefined`
 * ("we don't know"), NEVER `0` ("radar says genuinely no rain"). Both are
 * non-gating (AC3), but the tests keep them distinct so the "never fabricate"
 * discipline the epic ratified for cloud (`?? 0` is forbidden) carries to rain.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Loosely-typed dynamic-import accessor (epic-10 ratified red-first pattern).
// Resolves `getNowcastPrecipitationRate` from the not-yet-existent module at
// RUNTIME only, typed loosely so `tsc --noEmit` never sees a missing symbol.
// Once `lib/weather/nowcast-service.ts` exists this returns the real function.
// ---------------------------------------------------------------------------
type NowcastAccessor = (lat?: number, lon?: number) => Promise<number | undefined>;

// The specifier is built from a RUNTIME VARIABLE, never a string literal. Vite's
// `vite:import-analysis` statically resolves string-literal `import()` specifiers
// at transform time — even inside a `.skip` block — and would fail the whole file
// with "Failed to resolve import" because the module does not exist on HEAD. A
// variable specifier is opaque to that static analysis, so the file transforms
// (and `tsc` stays green via the `as string`/`any` typing), and the import is
// only actually attempted when the dev un-skips this suite AFTER Task 1 creates
// the module.
const NOWCAST_MODULE = '@/lib/weather/nowcast-service';

async function loadGetNowcastPrecipitationRate(): Promise<NowcastAccessor> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import(/* @vite-ignore */ NOWCAST_MODULE);
  return mod.getNowcastPrecipitationRate as NowcastAccessor;
}

/**
 * Minimal Nowcast 2.0 `complete` (GeoJSON) response. Mirrors the real product
 * shape: `properties.timeseries[].data.instant.details.precipitation_rate`
 * (mm/h). `omitRate` drops the field entirely (the radar-coverage-insufficient
 * case → Met.no OMITS it). `radar` injects an optional coverage indicator
 * (`ok` / `temporarily unavailable` / `no coverage`).
 */
function nowcastResponse(
  entries: Array<{ time: string; rate?: number; omitRate?: boolean }>,
  radar?: string,
) {
  return {
    properties: {
      ...(radar !== undefined ? { meta: { radar } } : {}),
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

describe.skip('[10.4 AC1] nowcast-service — Nowcast 2.0 client + graceful degradation', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.unstubAllEnvs();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('requests the /nowcast/2.0/complete endpoint with 4-decimal-truncated coordinates', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => nowcastResponse([{ time: '2026-07-03T12:00:00Z', rate: 0 }]),
    });
    const getNowcastPrecipitationRate = await loadGetNowcastPrecipitationRate();

    // Long-precision coords must be truncated to 4dp (Met.no TOS, Story 8.5).
    await getNowcastPrecipitationRate(57.708912, 11.974622);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('/nowcast/2.0/complete');
    // NOT the legacy XML `/classic` variant.
    expect(url).not.toContain('/classic');
    expect(url).toContain('lat=57.7089');
    expect(url).toContain('lon=11.9746');
  });

  it('sends the SHARED identifying User-Agent (the same UA the forecast client uses)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => nowcastResponse([{ time: '2026-07-03T12:00:00Z', rate: 0 }]),
    });
    const getNowcastPrecipitationRate = await loadGetNowcastPrecipitationRate();

    await getNowcastPrecipitationRate(57.7089, 11.9746);

    const init = fetchMock.mock.calls[0]?.[1] as { headers?: Record<string, string> } | undefined;
    const ua =
      init?.headers?.['User-Agent'] ??
      init?.headers?.['user-agent'] ??
      // Some fetch stubs pass a Headers instance; fall back to a loose read.
      (init?.headers as unknown as { get?: (k: string) => string })?.get?.('User-Agent');
    // TOS: Met.no 403s a missing/non-identifying UA. The nowcast MUST reuse the
    // forecast client's identifying UA (shared primitive — no second constant to
    // drift). We assert it carries the maintainer contact-of-record, not the
    // exact string (the default UA is env-overridable).
    expect(ua).toBeTruthy();
    expect(String(ua)).toContain('SunnySeat');
  });

  it('returns the near-now precipitation_rate when the field is present (0.4 ⇒ 0.4)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => nowcastResponse([{ time: '2026-07-03T12:00:00Z', rate: 0.4 }]),
    });
    const getNowcastPrecipitationRate = await loadGetNowcastPrecipitationRate();

    const rate = await getNowcastPrecipitationRate(57.7089, 11.9746);

    expect(rate).toBe(0.4);
  });

  it('returns 0 when radar genuinely reports NO rain (0 is a real reading, distinct from unknown)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => nowcastResponse([{ time: '2026-07-03T12:00:00Z', rate: 0 }]),
    });
    const getNowcastPrecipitationRate = await loadGetNowcastPrecipitationRate();

    const rate = await getNowcastPrecipitationRate(57.7089, 11.9746);

    // `0` = "radar says no rain" — a genuine reading, NOT undefined.
    expect(rate).toBe(0);
  });

  it('returns undefined (NEVER 0) when precipitation_rate is ABSENT — radar coverage insufficient', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => nowcastResponse([{ time: '2026-07-03T12:00:00Z', omitRate: true }]),
    });
    const getNowcastPrecipitationRate = await loadGetNowcastPrecipitationRate();

    const rate = await getNowcastPrecipitationRate(57.7089, 11.9746);

    // The field is OMITTED where radar coverage is poor. "Unknown", never a
    // fabricated `0` (the `?? 0` the epic forbids).
    expect(rate).toBeUndefined();
    expect(rate).not.toBe(0);
  });

  it('returns undefined when a coverage indicator is present and not "ok"', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      // A rate is present, but the explicit coverage marker says the reading is
      // not trustworthy → treat as unknown.
      json: async () =>
        nowcastResponse([{ time: '2026-07-03T12:00:00Z', rate: 0.9 }], 'no coverage'),
    });
    const getNowcastPrecipitationRate = await loadGetNowcastPrecipitationRate();

    const rate = await getNowcastPrecipitationRate(57.7089, 11.9746);

    expect(rate).toBeUndefined();
  });

  it('returns undefined on a non-OK HTTP response (never throws)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    const getNowcastPrecipitationRate = await loadGetNowcastPrecipitationRate();

    // Must degrade silently to Tier 0/1 — no throw, no 500, no fabricated value.
    await expect(getNowcastPrecipitationRate(57.7089, 11.9746)).resolves.toBeUndefined();
  });

  it('returns undefined on a thrown fetch (network error) — never throws', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const getNowcastPrecipitationRate = await loadGetNowcastPrecipitationRate();

    await expect(getNowcastPrecipitationRate(57.7089, 11.9746)).resolves.toBeUndefined();
  });

  it('returns undefined on an empty/absent timeseries', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ properties: { timeseries: [] } }),
    });
    const getNowcastPrecipitationRate = await loadGetNowcastPrecipitationRate();

    await expect(getNowcastPrecipitationRate(57.7089, 11.9746)).resolves.toBeUndefined();
  });
});
