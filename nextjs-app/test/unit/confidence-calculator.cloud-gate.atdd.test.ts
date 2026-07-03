/**
 * ATDD acceptance tests — Story 10.1 AC3 (FR12)
 * "Cloud cover genuinely lowers confidence"
 *
 * Written red-first (they FAILED until Task 4 made `calcCloudCertainty`
 * (confidence-calculator.ts) actually read `weather.cloudCover`). Now that Task 4
 * is implemented these are un-skipped and green.
 *
 * THE GAP (root cause #2):
 * `calcCloudCertainty` today scores freshness × forecast-flag × source-
 * reliability ONLY — it never reads `weather.cloudCover`, so fresh Met.no data
 * during a downpour yields ~0.9 "cloud certainty". FR12's promised
 * geometric+weather blend was never implemented. The existing base fixture uses
 * `cloudCover: 10` but never asserts cloud sensitivity — that is the untested gap.
 *
 * WHY RELATIVE ASSERTIONS (retro-note: "four thresholds deliberately UNKNOWN"):
 * The exact confidence formula is the dev's to author. We assert RELATIVE
 * behaviour only — 100% cover materially lower than 0% with otherwise identical
 * inputs — so a future re-tune of the formula does not break these tests. AC3
 * wording: "100% cloud cover yields materially lower confidence than 0%".
 *
 * BYTE-IDENTICAL GUARD:
 * The geometry-only (no-weather) branch MUST be unchanged. The pinned value
 * below is captured from HEAD before the fix; if it drifts, the edit leaked out
 * of the `if (weatherData)` branch (a regression).
 */

import { describe, expect, it } from 'vitest';
import { calculateConfidenceFactors } from '@/lib/solar/confidence-calculator';
import type { SolarPosition, VenueShadowInfo, WeatherSlice } from '@/lib/solar/types';

const baseSolarPosition: SolarPosition = {
  azimuth: 180,
  elevation: 35,
  zenith: 55,
  declination: 0,
  hourAngle: 0,
  earthDistance: 1,
  timestamp: new Date('2026-06-21T10:00:00.000Z'),
  localTime: new Date('2026-06-21T12:00:00.000+02:00'),
  isSunVisible: true,
  latitude: 57.7089,
  longitude: 11.9746,
};

const eligibleCoverage = {
  clusterId: 'inom-vallgraven',
  clusterName: 'Inom Vallgraven',
  status: 'eligible' as const,
  checkedCount: 70,
  agreementRate: 0.9,
  missingConditions: [],
  uncertaintyCounts: {},
  evidenceFiles: ['fixture'],
  allowsHighConfidence: true,
  confidenceCap: 1,
};

function shadowInfo(overrides: Partial<VenueShadowInfo> = {}): VenueShadowInfo {
  return {
    venueId: 1,
    shadowedAreaPercent: 0,
    sunlitAreaPercent: 100,
    castingShadows: [],
    shadowedGeometry: null,
    sunlitGeometry: null,
    timestamp: new Date('2026-06-21T10:00:00.000Z'),
    confidence: 1,
    solarPosition: baseSolarPosition,
    shadowDataCoverage: eligibleCoverage,
    ...overrides,
  };
}

// Fixed createdAt so the freshness factor is identical across the two calls —
// the ONLY differing input is cloudCover.
function weather(overrides: Partial<WeatherSlice> = {}): WeatherSlice {
  return {
    cloudCover: 0,
    temperature: 22,
    isForecast: false,
    source: 'metno',
    createdAt: new Date(),
    ...overrides,
  };
}

describe('[10.1 AC3] cloud cover lowers displayed confidence (FR12)', () => {
  it('100% cloud cover yields materially lower overallConfidence than 0% (identical geometry/solar/shadow)', () => {
    const clear = calculateConfidenceFactors(
      1,
      shadowInfo(),
      baseSolarPosition,
      weather({ cloudCover: 0 }),
    );
    const overcast = calculateConfidenceFactors(
      1,
      shadowInfo(),
      baseSolarPosition,
      weather({ cloudCover: 100 }),
    );

    // FR12: cloud amount must genuinely participate. "Materially lower" — assert
    // a non-trivial drop, not merely `<`, so a rounding-noise diff would not
    // count as passing.
    expect(overcast.overallConfidence).toBeLessThan(clear.overallConfidence);
    expect(clear.overallConfidence - overcast.overallConfidence).toBeGreaterThan(0.05);
  });

  it('cloudCertainty itself is sensitive to cover (monotone-ish: 0% > 100%)', () => {
    const clear = calculateConfidenceFactors(1, shadowInfo(), baseSolarPosition, weather({ cloudCover: 0 }));
    const overcast = calculateConfidenceFactors(1, shadowInfo(), baseSolarPosition, weather({ cloudCover: 100 }));

    // The cloud term now folds into the weather-enhanced cloudCertainty factor.
    expect(overcast.cloudCertainty).toBeLessThan(clear.cloudCertainty);
  });

  it('UNKNOWN cloud (undefined) is NOT penalised as if 100% overcast (Task 4 + AC2 interplay)', () => {
    // When cloud is unknown (Story 10.1 Task 2 representation), the cloud term
    // must fall back to neutral / freshness-only — NOT treated as full overcast.
    const overcast = calculateConfidenceFactors(1, shadowInfo(), baseSolarPosition, weather({ cloudCover: 100 }));
    const unknown = calculateConfidenceFactors(
      1,
      shadowInfo(),
      baseSolarPosition,
      // Task 2 widened `WeatherSlice.cloudCover` to `number | undefined` — the
      // unknown representation is a plain `undefined`.
      weather({ cloudCover: undefined }),
    );

    expect(unknown.overallConfidence).toBeGreaterThan(overcast.overallConfidence);
  });

  it('geometry-only (no-weather) branch stays byte-identical to HEAD (regression pin)', () => {
    const geometryOnly = calculateConfidenceFactors(
      1,
      shadowInfo(),
      baseSolarPosition,
      null,
    );

    // Pinned from HEAD before the AC3 edit. The eligible-coverage empty-shadow
    // no-weather path is deterministic (no Date.now dependency in this branch).
    // If this drifts, the cloud edit leaked out of the `if (weatherData)` branch.
    // NOTE to dev un-skipping: run this ONCE on HEAD (pre-edit) to confirm the
    // literal, then keep it frozen. Expected ≈ min(1*0.4+1*0.25+0.98*0.2+..., cap).
    expect(geometryOnly.overallConfidence).toBeCloseTo(0.6, 5);
    expect(geometryOnly.qualityIssues).toContain(
      'No weather data available - confidence capped at 60%',
    );
  });
});
