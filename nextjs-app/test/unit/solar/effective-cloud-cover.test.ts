/**
 * STORY 10.3 (AC2, AC3) — the effective-cloud-cover formula matrix.
 *
 * This is the story's ACCEPTANCE SIGNAL (backend/data Design Gate: "Acceptance
 * signal is the formula's unit-test matrix"). The layer-weighted effective cover
 * makes thin high cirrus block LESS than a low stratus deck, and feeds both the
 * Story 10.1 cloud gate and the FR12 confidence blend.
 *
 * RELATIVE-BOUNDARY DISCIPLINE (retro-note epic-10: the weights + the 80 threshold
 * are deliberately re-tunable): assertions read `CLOUD_GATE_THRESHOLD_PERCENT` from
 * the constant and check the INTENT — "100%-high does NOT gate / 100%-low DOES" and
 * ordering (low-heavy > high-heavy for equal raw coverage) — NEVER a brittle exact
 * number like `toBe(25)`. A future weight re-tune that keeps the intent survives.
 */

import { describe, expect, it } from 'vitest';
import {
  effectiveCloudCover,
  CLOUD_WEIGHT_HIGH,
} from '@/lib/solar/effective-cloud-cover';
import { CLOUD_GATE_THRESHOLD_PERCENT } from '@/lib/services/sun-engine';
import type { WeatherSlice } from '@/lib/solar/types';

function slice(overrides: Partial<WeatherSlice> = {}): WeatherSlice {
  return {
    temperature: 18,
    isForecast: false,
    source: 'metno',
    createdAt: new Date('2026-06-21T10:30:00.000Z'),
    validAt: new Date('2026-06-21T10:30:00.000Z'),
    ...overrides,
  };
}

describe('[10.3 AC2] effectiveCloudCover boundary intent (cirrus ≠ stratus)', () => {
  it('100% HIGH-only (cirrus) does NOT reach the gate threshold — you feel the sun through it', () => {
    const eff = effectiveCloudCover(
      slice({ cloudCover: 100, cloudCoverLow: 0, cloudCoverMedium: 0, cloudCoverHigh: 100 }),
    );
    expect(eff).toBeDefined();
    expect(eff!).toBeLessThan(CLOUD_GATE_THRESHOLD_PERCENT);
    // Sanity: high weight is small, so 100% cirrus lands near HIGH*100.
    expect(eff!).toBeCloseTo(CLOUD_WEIGHT_HIGH * 100, 5);
  });

  it('100% LOW-only (stratus deck) DOES reach the gate threshold — a full deck blocks the beam', () => {
    const eff = effectiveCloudCover(
      slice({ cloudCover: 100, cloudCoverLow: 100, cloudCoverMedium: 0, cloudCoverHigh: 0 }),
    );
    expect(eff).toBeGreaterThanOrEqual(CLOUD_GATE_THRESHOLD_PERCENT);
  });

  it('100% MEDIUM-only (altostratus) DOES reach the gate threshold — medium cloud is blocking', () => {
    const eff = effectiveCloudCover(
      slice({ cloudCover: 100, cloudCoverLow: 0, cloudCoverMedium: 100, cloudCoverHigh: 0 }),
    );
    expect(eff).toBeGreaterThanOrEqual(CLOUD_GATE_THRESHOLD_PERCENT);
  });

  it('orders correctly: for EQUAL raw coverage, a low-heavy sky is more blocking than a high-heavy sky', () => {
    // Same 100% cloud somewhere, but split into different bands.
    const lowHeavy = effectiveCloudCover(
      slice({ cloudCover: 100, cloudCoverLow: 100, cloudCoverMedium: 0, cloudCoverHigh: 0 }),
    );
    const highHeavy = effectiveCloudCover(
      slice({ cloudCover: 100, cloudCoverLow: 0, cloudCoverMedium: 0, cloudCoverHigh: 100 }),
    );
    expect(lowHeavy!).toBeGreaterThan(highHeavy!);
  });

  it('a fully-clouded multi-layer sky (100/100/100) clamps to 100 (overcast), never exceeds it', () => {
    const eff = effectiveCloudCover(
      slice({ cloudCover: 100, cloudCoverLow: 100, cloudCoverMedium: 100, cloudCoverHigh: 100 }),
    );
    expect(eff).toBe(100);
    expect(eff!).toBeGreaterThanOrEqual(CLOUD_GATE_THRESHOLD_PERCENT);
  });

  it('a genuinely clear sky (0/0/0) yields 0 — no false gate', () => {
    const eff = effectiveCloudCover(
      slice({ cloudCover: 0, cloudCoverLow: 0, cloudCoverMedium: 0, cloudCoverHigh: 0 }),
    );
    expect(eff).toBe(0);
    expect(eff!).toBeLessThan(CLOUD_GATE_THRESHOLD_PERCENT);
  });
});

describe('[10.3 AC3] effectiveCloudCover fallback (partial split ⇒ total; missing total ⇒ undefined)', () => {
  it('uses the layer weighting only when ALL THREE layers are present', () => {
    // All present ⇒ weighted (cirrus-heavy stays below the gate even though total=100).
    const eff = effectiveCloudCover(
      slice({ cloudCover: 100, cloudCoverLow: 0, cloudCoverMedium: 0, cloudCoverHigh: 100 }),
    );
    expect(eff!).toBeLessThan(CLOUD_GATE_THRESHOLD_PERCENT);
  });

  it('falls back to the raw TOTAL when the HIGH layer is missing (Tier-0 behaviour)', () => {
    const eff = effectiveCloudCover(
      slice({ cloudCover: 100, cloudCoverLow: 0, cloudCoverMedium: 0, cloudCoverHigh: undefined }),
    );
    // High absent ⇒ no weighting ⇒ the raw total 100 governs (would gate).
    expect(eff).toBe(100);
  });

  it('falls back to the raw TOTAL when the LOW layer is missing', () => {
    const eff = effectiveCloudCover(
      slice({ cloudCover: 42, cloudCoverLow: undefined, cloudCoverMedium: 10, cloudCoverHigh: 90 }),
    );
    expect(eff).toBe(42);
  });

  it('falls back to the raw TOTAL when the MEDIUM layer is missing', () => {
    const eff = effectiveCloudCover(
      slice({ cloudCover: 30, cloudCoverLow: 10, cloudCoverMedium: undefined, cloudCoverHigh: 5 }),
    );
    expect(eff).toBe(30);
  });

  it('falls back to the raw TOTAL when ALL layers are missing (a compact-shaped slice)', () => {
    const eff = effectiveCloudCover(slice({ cloudCover: 55 }));
    expect(eff).toBe(55);
  });

  it('returns undefined when BOTH the total AND the layers are missing (unknown-never-clear)', () => {
    const eff = effectiveCloudCover(slice({ cloudCover: undefined }));
    expect(eff).toBeUndefined();
    // Must never fabricate a clear (0) or overcast (100) reading.
    expect(eff).not.toBe(0);
    expect(eff).not.toBe(100);
  });

  it('returns undefined when the total is missing even with a partial split present (still unknown)', () => {
    // Total undefined + medium/high missing ⇒ fallback path returns the (undefined) total.
    const eff = effectiveCloudCover(slice({ cloudCover: undefined, cloudCoverLow: 20 }));
    expect(eff).toBeUndefined();
  });

  it('returns undefined for a null/undefined slice (null weather ⇒ no gate, AC3)', () => {
    expect(effectiveCloudCover(null)).toBeUndefined();
    expect(effectiveCloudCover(undefined)).toBeUndefined();
  });
});
