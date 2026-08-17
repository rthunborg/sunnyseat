/**
 * ATDD RED-PHASE acceptance scaffolds — Story 11.1 (AC1)
 * "Client-Side Day-Series — Instant Time Scrubbing"
 *
 * =========================================================================
 * WHAT THIS SPEC IS
 * =========================================================================
 * The headline of Epic 11 (R-001, CRITICAL score 9) is: a settled time change
 * derives ALL time-dependent UI CLIENT-SIDE from a cached per-step day-series,
 * issuing ZERO network requests. This file is the UNIT half of that promise:
 * the pure, offline client helper that maps (venue's cached `sunDaySeries`,
 * selected planner minutes) -> the `{ sunExposurePercent, currentSunStatus }`
 * the client renders for pins, both venue lists, quick-info figures, "Mest sol"
 * ordering, and the obscured presentation.
 *
 * The epic Dedup discipline puts the client series MATH at UNIT level only (this
 * file); the DTO contract + payload at API level; the request-count invariant at
 * e2e. So this file asserts the DERIVATION is (a) an exact per-step lookup, (b)
 * PURE / offline (no network, no server-only import), and (c) byte-parity with
 * the series value the server emitted for that step — one derivation per output
 * surface's need (marker %, pin state, quick-info figure, ordering input,
 * obscured presentation).
 *
 * =========================================================================
 * RED PHASE
 * =========================================================================
 * Every block is `describe.skip`. The module under test
 * (`lib/utils/venue-day-series.ts`) does NOT yet exist — the dev creates it in
 * Task 4. Un-skip each block as Task 4 goes green. NO network, NO timers, NO
 * latency asserts — the acceptance signal is a deterministic pure-function
 * lookup + a "same value as the series carried" byte-equality.
 *
 * API-BOUNDARY GUARDRAIL (Task 4 / Dev Notes "API boundary + server-only
 * discipline"): the helper must be CLIENT-SAFE. It must NOT import
 * `sun-engine.ts` / `sun-engine-cache.ts` / `met-no-service`. A static
 * source-scan block below enforces that (grep the built helper source for a
 * server-only import — a match is a FAIL).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { PLANNER_START_MINUTES, PLANNER_END_MINUTES, PLANNER_STEP_MINUTES } from '@/lib/utils/time-planner';
import type { VenueDaySeriesEntry, VenueSunStatus } from '@/lib/types/api';

// GREEN PHASE (Story 11.1 Task 4): the real pure client helper.
import { deriveVenueSunAtMinutes as deriveOrNull } from '@/lib/utils/venue-day-series';

type DerivedSun = { sunExposurePercent: number; currentSunStatus: VenueSunStatus };
type DaySeriesEntry = VenueDaySeriesEntry;
// The helper returns `null` when the step has no entry (caller falls back to the
// server single-instant fields). These fixtures always contain the queried step,
// so wrap to the non-null contract the ATDD assertions expect.
const deriveVenueSunAtMinutes = (
  series: DaySeriesEntry[],
  selectedMinutes: number,
): DerivedSun => {
  const derived = deriveOrNull(series, selectedMinutes);
  if (!derived) {
    throw new Error(`No day-series entry for minutes=${selectedMinutes}`);
  }
  return derived;
};

// A fixed, hand-authored gated day-series fixture (one venue, one date, one
// weather-bucket) — the "prerequisite test data" the epic test design calls out.
// Each entry is the ALREADY-GATED per-step value the server emitted. Chosen so
// the matrix exercises every output surface: a plain Sunny step, a geometrically
// sunlit-but-cloud-gated `CloudObscured` step (the Epic-10 gate applied per step,
// not only "now"), a Shaded step, and a NoSun step.
function fixedGatedSeries(): DaySeriesEntry[] {
  const byStep = new Map<number, Omit<DaySeriesEntry, 'minutes'>>([
    [12 * 60, { sunExposurePercent: 95, currentSunStatus: 'Sunny', weatherGateState: 'not_gated' }], // 12:00 clear sunlit
    [13 * 60, { sunExposurePercent: 95, currentSunStatus: 'CloudObscured', weatherGateState: 'gated' }], // 13:00 same geometry, gated by cloud/rain
    [17 * 60, { sunExposurePercent: 20, currentSunStatus: 'Shaded', weatherGateState: 'not_gated' }], // 17:00 building shadow
    [20 * 60, { sunExposurePercent: 0, currentSunStatus: 'NoSun', weatherGateState: 'not_gated' }], // 20:00 sun down
  ]);
  const series: DaySeriesEntry[] = [];
  for (let m = PLANNER_START_MINUTES; m <= PLANNER_END_MINUTES; m += PLANNER_STEP_MINUTES) {
    const hit = byStep.get(m);
    series.push({
      minutes: m,
      sunExposurePercent: hit?.sunExposurePercent ?? 60,
      currentSunStatus: hit?.currentSunStatus ?? 'Partial',
      weatherGateState: hit?.weatherGateState ?? 'not_gated',
    });
  }
  return series;
}

describe('Story 11.1 AC1 — client day-series derivation is a pure exact-step lookup', () => {
  const series = fixedGatedSeries();

  // P0 — marker % surface: the derived % is exactly the series entry's % for the
  // snapped step (the client already snaps via snapPlannerMinutes upstream).
  it('returns the exact per-step sunExposurePercent for a snapped step (marker %)', () => {
    expect(deriveVenueSunAtMinutes(series, 12 * 60).sunExposurePercent).toBe(95);
    expect(deriveVenueSunAtMinutes(series, 17 * 60).sunExposurePercent).toBe(20);
    expect(deriveVenueSunAtMinutes(series, 20 * 60).sunExposurePercent).toBe(0);
  });

  // P0 — pin-state surface: the derived status drives pin appearance; a gated
  // step returns the server's already-gated CloudObscured, NEVER a re-derived one.
  it('returns the already-gated currentSunStatus for the step (pin state; no client re-gate)', () => {
    expect(deriveVenueSunAtMinutes(series, 12 * 60).currentSunStatus).toBe('Sunny');
    // 13:00 has the SAME geometry (95%) as 12:00 but the server gated it to
    // CloudObscured — the client reads that, it does not re-run applyCloudGate.
    expect(deriveVenueSunAtMinutes(series, 13 * 60).currentSunStatus).toBe('CloudObscured');
  });

  // P0 — quick-info figure surface: the same lookup feeds the quick-info "X% sol".
  it('feeds the quick-info figure from the same per-step value', () => {
    const derived = deriveVenueSunAtMinutes(series, 13 * 60);
    // Obscured step keeps its geometric % (the "clear-sky potential") — the
    // obscured chrome reframes it, but the figure is the series % for the step.
    expect(derived.sunExposurePercent).toBe(95);
    expect(derived.currentSunStatus).toBe('CloudObscured');
  });

  // P0 — ordering surface: derivation returns the inputs "Mest sol" ordering
  // consumes; ordering two venues at the SAME step must track the derived value,
  // not the server's single-instant field.
  it('supplies the per-step status+percent that "Mest sol" ordering reads', () => {
    const sunnier = deriveVenueSunAtMinutes(series, 12 * 60); // Sunny 95
    const shaded = deriveVenueSunAtMinutes(series, 17 * 60); // Shaded 20
    // The ordering input space is "higher = better"; the derived values must be
    // orderable so a client re-sort at this step puts the sunlit step first.
    expect(sunnier.sunExposurePercent).toBeGreaterThan(shaded.sunExposurePercent);
  });

  // P0 — obscured-presentation surface: the derived status is the exact signal
  // the obscured chrome branches on (CloudObscured -> muted "Sol bakom moln").
  it('exposes the obscured presentation signal for the step', () => {
    expect(deriveVenueSunAtMinutes(series, 13 * 60).currentSunStatus).toBe('CloudObscured');
    expect(deriveVenueSunAtMinutes(series, 12 * 60).currentSunStatus).not.toBe('CloudObscured');
  });
});

describe('Story 11.1 AC1 — derivation is pure / offline (no network in the code path)', () => {
  const series = fixedGatedSeries();

  // P0 — PURITY: calling the helper does not touch `fetch`. If the derivation
  // reached the network for a settled time (today's stall), this trips. This is
  // the unit-level defence-in-depth mirror of the e2e request-count=0 guard.
  it('does not invoke fetch during a derivation', () => {
    const spy = vi.fn();
    const original = globalThis.fetch;
    // Deliberately stub fetch to trip if the helper calls it.
    globalThis.fetch = spy as unknown as typeof globalThis.fetch;
    try {
      deriveVenueSunAtMinutes(series, 12 * 60);
      deriveVenueSunAtMinutes(series, 13 * 60);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = original;
    }
  });

  // P1 — determinism: repeated derivations for the same step are identical
  // (no hidden clock/random dependence — a settled scrub back-and-forth is stable).
  it('is deterministic for repeated same-step derivations', () => {
    const a = deriveVenueSunAtMinutes(series, 13 * 60);
    const b = deriveVenueSunAtMinutes(series, 13 * 60);
    expect(a).toEqual(b);
  });
});

describe('Story 11.1 — client-derivation helper stays client-safe (API boundary)', () => {
  // P0 — the helper must NOT import a server-only module. A source scan of the
  // built helper file catches a regression where the derivation drags in the
  // engine/cache/met-no adapter (which would break the client bundle + the API
  // boundary). Grep-style static assertion, deterministic. [Dev Notes: API boundary]
  it('imports none of sun-engine / sun-engine-cache / met-no-service', () => {
    const helperPath = join(process.cwd(), 'lib', 'utils', 'venue-day-series.ts');
    const src = readFileSync(helperPath, 'utf8');
    expect(src).not.toMatch(/from ['"]@?\/?.*sun-engine(-cache)?['"]/);
    expect(src).not.toMatch(/from ['"]@?\/?.*met-no-service['"]/);
    expect(src).not.toMatch(/from ['"]@?\/?.*nowcast-service['"]/);
  });
});
