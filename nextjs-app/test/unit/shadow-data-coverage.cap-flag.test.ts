import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyShadowDataCoverageCap,
  createUnknownCoverage,
} from '@/lib/solar/shadow-data-coverage';

/**
 * Pre-launch verification flag: `SUNNYSEAT_COVERAGE_CAP=off` lifts ONLY the
 * shadow-data-coverage confidence clamp (maintainer field-verification of raw
 * engine confidence). The default MUST stay fail-closed (capped) — CI never sets
 * the flag, so every other suite keeps exercising the capped path unchanged.
 */
describe('applyShadowDataCoverageCap × SUNNYSEAT_COVERAGE_CAP', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('clamps to the unknown-cluster cap (0.6) when the flag is unset', () => {
    expect(
      applyShadowDataCoverageCap(0.92, createUnknownCoverage('haga', 'Haga'))
    ).toBe(0.6);
    expect(applyShadowDataCoverageCap(0.92, undefined)).toBe(0.6);
  });

  it('stays capped for any value other than the exact string "off" (fail-closed)', () => {
    for (const value of ['on', 'true', '1', 'OFF', 'Off', '']) {
      vi.stubEnv('SUNNYSEAT_COVERAGE_CAP', value);
      expect(
        applyShadowDataCoverageCap(0.92, createUnknownCoverage('haga', 'Haga'))
      ).toBe(0.6);
    }
  });

  it('returns the raw confidence untouched when the flag is "off"', () => {
    vi.stubEnv('SUNNYSEAT_COVERAGE_CAP', 'off');
    expect(
      applyShadowDataCoverageCap(0.92, createUnknownCoverage('haga', 'Haga'))
    ).toBe(0.92);
    // The missing-coverage fallback clamp lifts too — raw value passes through.
    expect(applyShadowDataCoverageCap(0.37, undefined)).toBe(0.37);
  });

  it('never raises confidence — the flag only removes the clamp', () => {
    vi.stubEnv('SUNNYSEAT_COVERAGE_CAP', 'off');
    expect(
      applyShadowDataCoverageCap(0.41, createUnknownCoverage('haga', 'Haga'))
    ).toBe(0.41);
  });
});
