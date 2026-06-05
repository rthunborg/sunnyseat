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
