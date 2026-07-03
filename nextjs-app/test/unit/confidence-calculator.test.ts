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

const freshWeather: WeatherSlice = {
  cloudCover: 10,
  temperature: 22,
  isForecast: false,
  source: 'metno',
  createdAt: new Date(),
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

function shadowInfo(overrides: Partial<VenueShadowInfo>): VenueShadowInfo {
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
    ...overrides,
  };
}

describe('coverage-aware confidence calculation', () => {
  it('caps empty shadow results below High when coverage is unknown', () => {
    const factors = calculateConfidenceFactors(
      1,
      shadowInfo({
        shadowDataCoverage: {
          clusterId: 'inom-vallgraven',
          clusterName: 'Inom Vallgraven',
          status: 'unknown',
          checkedCount: 0,
          agreementRate: null,
          missingConditions: [],
          uncertaintyCounts: {},
          evidenceFiles: [],
          allowsHighConfidence: false,
          confidenceCap: 0.6,
        },
      }),
      baseSolarPosition,
      freshWeather
    );

    expect(factors.buildingDataQuality).toBeLessThan(0.7);
    expect(factors.overallConfidence).toBeLessThan(0.7);
    expect(factors.confidenceCategory).not.toBe('High');
    expect(factors.qualityIssues).toContain('Shadow-caster coverage is not validated for this launch cluster');
  });

  it('allows high confidence for empty shadow results only when cluster coverage is eligible', () => {
    const factors = calculateConfidenceFactors(
      1,
      shadowInfo({
        shadowDataCoverage: eligibleCoverage,
      }),
      baseSolarPosition,
      freshWeather
    );

    expect(factors.buildingDataQuality).toBe(1);
    expect(factors.confidenceCategory).toBe('High');
  });

  it('keeps low-sun confidence low even with eligible cluster coverage', () => {
    const factors = calculateConfidenceFactors(
      1,
      shadowInfo({
        confidence: 0.3,
        shadowDataCoverage: eligibleCoverage,
      }),
      { ...baseSolarPosition, elevation: 3 },
      freshWeather
    );

    expect(factors.overallConfidence).toBeLessThan(0.4);
    expect(factors.confidenceCategory).toBe('Low');
  });

  it('applies obstruction caps separately from building-data quality', () => {
    const factors = calculateConfidenceFactors(
      1,
      shadowInfo({
        obstructionRisks: ['awning'],
        shadowDataCoverage: {
          ...eligibleCoverage,
          missingConditions: [],
          uncertaintyCounts: { awning: 1 },
        },
      }),
      baseSolarPosition,
      freshWeather
    );

    expect(factors.buildingDataQuality).toBe(1);
    expect(factors.overallConfidence).toBeLessThan(0.7);
    expect(factors.qualityIssues).toContain('Known unmodelled obstruction risk caps confidence');
  });

  it('caps confidence when weather is unavailable', () => {
    const factors = calculateConfidenceFactors(
      1,
      shadowInfo({ shadowDataCoverage: eligibleCoverage }),
      baseSolarPosition,
      null
    );

    expect(factors.overallConfidence).toBeLessThanOrEqual(0.6);
    expect(factors.qualityIssues).toContain('No weather data available - confidence capped at 60%');
  });

  it('reduces confidence and reports stale weather', () => {
    const freshFactors = calculateConfidenceFactors(
      1,
      shadowInfo({ shadowDataCoverage: eligibleCoverage }),
      baseSolarPosition,
      freshWeather
    );
    const staleFactors = calculateConfidenceFactors(
      1,
      shadowInfo({ shadowDataCoverage: eligibleCoverage }),
      baseSolarPosition,
      {
        ...freshWeather,
        createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
      }
    );

    expect(staleFactors.overallConfidence).toBeLessThan(freshFactors.overallConfidence);
    expect(staleFactors.qualityIssues.some((issue) => issue.startsWith('Weather data is '))).toBe(true);
  });

  it('caps confidence when using forecast weather', () => {
    const factors = calculateConfidenceFactors(
      1,
      shadowInfo({ shadowDataCoverage: eligibleCoverage }),
      baseSolarPosition,
      {
        ...freshWeather,
        isForecast: true,
      }
    );

    expect(factors.overallConfidence).toBeLessThanOrEqual(0.9);
    expect(factors.qualityIssues).toContain('Using forecast data - confidence capped at 90%');
  });
});

describe('FR12 cloud-cover confidence sensitivity (Story 10.1 AC3)', () => {
  // Two calls with IDENTICAL geometry / solar / shadow / freshness inputs, differing
  // ONLY in weather.cloudCover — total overcast must yield MATERIALLY lower displayed
  // confidence than clear sky. Asserts relative behaviour (100 < 0) so a re-tune of
  // the cloud floor cannot break it. This was the exact FR12 gap: `calcCloudCertainty`
  // ignored cloudCover, so a downpour still scored ~0.9 cloud certainty.
  it('total overcast (100%) yields materially lower confidence than clear sky (0%), all else equal', () => {
    const clear = calculateConfidenceFactors(
      1,
      shadowInfo({ shadowDataCoverage: eligibleCoverage }),
      baseSolarPosition,
      { ...freshWeather, cloudCover: 0 }
    );
    const overcast = calculateConfidenceFactors(
      1,
      shadowInfo({ shadowDataCoverage: eligibleCoverage }),
      baseSolarPosition,
      { ...freshWeather, cloudCover: 100 }
    );

    expect(overcast.overallConfidence).toBeLessThan(clear.overallConfidence);
    // "Materially" lower — not a rounding wobble. The cloud term is 40% of the
    // weather-enhanced blend and halves at full overcast, so expect a clear gap.
    expect(clear.overallConfidence - overcast.overallConfidence).toBeGreaterThan(0.05);
    // cloudCertainty itself must respond monotonically to cover.
    expect(overcast.cloudCertainty).toBeLessThan(clear.cloudCertainty);
  });

  it('is monotonic across the cover range (more cloud never RAISES confidence)', () => {
    const at = (cover: number) =>
      calculateConfidenceFactors(
        1,
        shadowInfo({ shadowDataCoverage: eligibleCoverage }),
        baseSolarPosition,
        { ...freshWeather, cloudCover: cover }
      ).cloudCertainty;

    const covers = [0, 25, 50, 75, 100];
    for (let i = 1; i < covers.length; i++) {
      expect(at(covers[i])).toBeLessThanOrEqual(at(covers[i - 1]));
    }
  });

  it('UNKNOWN cloud (cloudCover undefined) is NEUTRAL — not penalised as 100% overcast (AC2 interplay)', () => {
    const unknownCloud = calculateConfidenceFactors(
      1,
      shadowInfo({ shadowDataCoverage: eligibleCoverage }),
      baseSolarPosition,
      { ...freshWeather, cloudCover: undefined }
    );
    const clear = calculateConfidenceFactors(
      1,
      shadowInfo({ shadowDataCoverage: eligibleCoverage }),
      baseSolarPosition,
      { ...freshWeather, cloudCover: 0 }
    );
    const overcast = calculateConfidenceFactors(
      1,
      shadowInfo({ shadowDataCoverage: eligibleCoverage }),
      baseSolarPosition,
      { ...freshWeather, cloudCover: 100 }
    );

    // Unknown cloud falls back to the freshness-only behaviour (identical to clear),
    // NOT to the fully-overcast penalty.
    expect(unknownCloud.cloudCertainty).toBe(clear.cloudCertainty);
    expect(unknownCloud.cloudCertainty).toBeGreaterThan(overcast.cloudCertainty);
  });

  it('BYTE-IDENTICAL GUARD: the geometry-only (no-weather) path is unchanged by the FR12 edit', () => {
    // The AC3 edit is confined to calcCloudCertainty inside the `if (weatherData)`
    // branch. The no-weather branch must be untouched. Pin its overallConfidence to
    // the exact pre-change value: with eligible coverage + high sun the raw geometry
    // score is ~0.996 and the no-weather cap clamps it to exactly 0.6.
    const noWeather = calculateConfidenceFactors(
      1,
      shadowInfo({ shadowDataCoverage: eligibleCoverage }),
      baseSolarPosition,
      null
    );
    expect(noWeather.overallConfidence).toBe(0.6);
    // cloudCertainty is only computed in the weather branch → stays 0 here.
    expect(noWeather.cloudCertainty).toBe(0);
    expect(noWeather.qualityIssues).toContain('No weather data available - confidence capped at 60%');
  });
});
