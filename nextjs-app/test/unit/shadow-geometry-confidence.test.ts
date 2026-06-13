import { describe, expect, it } from 'vitest';
import { calculateShadowConfidence } from '@/lib/solar/shadow-geometry';
import type { Building, SolarPosition } from '@/lib/solar/types';

const solarPosition: SolarPosition = {
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

const geometry: GeoJSON.Polygon = {
  type: 'Polygon',
  coordinates: [[
    [11.9740, 57.7080],
    [11.9744, 57.7080],
    [11.9744, 57.7083],
    [11.9740, 57.7083],
    [11.9740, 57.7080],
  ]],
};

function building(overrides: Partial<Building>): Building {
  return {
    id: 1,
    geometry,
    height: 12,
    source: 'goteborg-open-derived-shadow-casters-v1',
    qualityScore: 0.95,
    heightSource: 'Surveyed',
    shadowCasterTier: 'primary',
    sourcePriority: 40,
    filterDecision: 'include',
    casterClass: 'building',
    sourceFlags: [],
    ...overrides,
  };
}

describe('shadow caster metadata confidence weighting', () => {
  it('scores primary high-quality casters above uncertain low-quality casters', () => {
    const primary = calculateShadowConfidence(building({}), solarPosition, 20);
    const uncertain = calculateShadowConfidence(
      building({
        qualityScore: 0.45,
        shadowCasterTier: 'uncertain',
        sourcePriority: 90,
        filterDecision: 'review',
        casterClass: 'structure',
      }),
      solarPosition,
      20
    );

    expect(primary).toBeGreaterThan(uncertain);
    expect(uncertain).toBeLessThan(0.5);
  });

  it('degrades unknown tier and filter metadata instead of trusting it', () => {
    const trusted = calculateShadowConfidence(building({}), solarPosition, 20);
    const unknown = calculateShadowConfidence(
      building({
        shadowCasterTier: 'unknown',
        filterDecision: 'unknown',
        sourcePriority: undefined,
      }),
      solarPosition,
      20
    );

    expect(unknown).toBeLessThan(trusted);
  });
});
