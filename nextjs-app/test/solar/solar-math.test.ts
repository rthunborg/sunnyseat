import { describe, it, expect } from 'vitest';
import {
  calculateJulianDay,
  calculateJulianCenturies,
  normalizeDegrees,
  normalizeDegreesSymmetric,
  calculateSolarElevation,
  calculateSolarAzimuth,
  applyAtmosphericRefraction,
  calculateGeometricalMeanLongitudeSun,
  calculateGeometricalMeanAnomalySun,
  calculateEccentricityEarthOrbit,
} from '@/lib/solar/solar-math';
import { calculateSolarPosition, getSunTimes } from '@/lib/solar/solar-calculation-service';
import { calculateShadowLength } from '@/lib/solar/shadow-geometry';
import { SOLAR_CONSTANTS } from '@/lib/solar/constants';

describe('SolarMath - Julian Day', () => {
  it('should calculate J2000.0 epoch correctly', () => {
    const j2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
    const jd = calculateJulianDay(j2000);
    expect(jd).toBeCloseTo(2451545.0, 4);
  });

  it('should calculate JD for a known date', () => {
    // 2003-10-17 12:30:30 UTC — NREL validation case
    const date = new Date(Date.UTC(2003, 9, 17, 12, 30, 30));
    const jd = calculateJulianDay(date);
    expect(jd).toBeCloseTo(2452930.0212, 2);
  });

  it('should handle leap years', () => {
    const feb29 = new Date(Date.UTC(2024, 1, 29, 12, 0, 0));
    const jd = calculateJulianDay(feb29);
    expect(jd).toBeGreaterThan(2451545.0);
  });
});

describe('SolarMath - Julian Centuries', () => {
  it('should return 0 at J2000.0', () => {
    const T = calculateJulianCenturies(SOLAR_CONSTANTS.JULIAN_DAY_2000);
    expect(T).toBeCloseTo(0.0, 10);
  });

  it('should return ~0.0378 for 2003-10-17', () => {
    const jd = calculateJulianDay(new Date(Date.UTC(2003, 9, 17, 12, 30, 30)));
    const T = calculateJulianCenturies(jd);
    expect(T).toBeCloseTo(0.0379, 3);
  });
});

describe('SolarMath - Normalization', () => {
  it('normalizeDegrees should wrap to 0-360', () => {
    expect(normalizeDegrees(370)).toBeCloseTo(10, 5);
    expect(normalizeDegrees(-10)).toBeCloseTo(350, 5);
    expect(normalizeDegrees(0)).toBeCloseTo(0, 5);
    expect(normalizeDegrees(360)).toBeCloseTo(0, 5);
  });

  it('normalizeDegreesSymmetric should wrap to -180..180', () => {
    expect(normalizeDegreesSymmetric(190)).toBeCloseTo(-170, 5);
    expect(normalizeDegreesSymmetric(-190)).toBeCloseTo(170, 5);
    expect(normalizeDegreesSymmetric(90)).toBeCloseTo(90, 5);
  });
});

describe('SolarMath - Orbital elements', () => {
  it('should produce reasonable mean longitude', () => {
    const L0 = calculateGeometricalMeanLongitudeSun(0);
    expect(L0).toBeCloseTo(280.466, 1);
  });

  it('should produce reasonable mean anomaly', () => {
    const M = calculateGeometricalMeanAnomalySun(0);
    expect(M).toBeCloseTo(357.529, 1);
  });

  it('should produce known eccentricity at J2000', () => {
    const e = calculateEccentricityEarthOrbit(0);
    expect(e).toBeCloseTo(0.016708634, 6);
  });
});

describe('SolarMath - Atmospheric refraction', () => {
  it('should not change below -0.5°', () => {
    expect(applyAtmosphericRefraction(-1.0)).toBe(-1.0);
  });

  it('should apply horizon correction near 0°', () => {
    const corrected = applyAtmosphericRefraction(0.0);
    expect(corrected).toBeGreaterThan(0.0);
  });

  it('should apply Bennett formula above 0.5°', () => {
    const corrected = applyAtmosphericRefraction(10.0);
    expect(corrected).toBeGreaterThan(10.0);
    expect(corrected - 10.0).toBeLessThan(1.0);
  });
});

describe('SolarCalculationService - NREL Validation', () => {
  it('should produce reasonable elevation for Gothenburg summer noon', () => {
    // June 21 solar noon UTC ~11:00 for Gothenburg
    const date = new Date(Date.UTC(2025, 5, 21, 11, 0, 0));
    const pos = calculateSolarPosition(date);

    // Gothenburg at 57.7°N, summer solstice: sun elevation ~55-56°
    expect(pos.elevation).toBeGreaterThan(50);
    expect(pos.elevation).toBeLessThan(60);
    // Azimuth should be roughly south (~180°) at solar noon
    expect(pos.azimuth).toBeGreaterThan(150);
    expect(pos.azimuth).toBeLessThan(210);
  });

  it('should produce reasonable elevation for Gothenburg winter noon', () => {
    const date = new Date(Date.UTC(2025, 11, 21, 12, 0, 0));
    const pos = calculateSolarPosition(date);

    // Winter solstice at 57.7°N: max elevation ~8-9°
    expect(pos.elevation).toBeGreaterThan(5);
    expect(pos.elevation).toBeLessThan(15);
  });

  it('should mark sun as visible during Gothenburg summer midday', () => {
    const summerNoon = new Date(Date.UTC(2025, 5, 21, 11, 0, 0));
    const pos = calculateSolarPosition(summerNoon);
    expect(pos.isSunVisible).toBe(true);
    expect(pos.elevation).toBeGreaterThan(40);
  });

  it('should mark sun as not visible during winter night', () => {
    const winterNight = new Date(Date.UTC(2025, 11, 21, 23, 0, 0));
    const pos = calculateSolarPosition(winterNight);
    expect(pos.isSunVisible).toBe(false);
  });
});

describe('SolarCalculationService - Sun Times', () => {
  it('should find sunrise before sunset for summer solstice', () => {
    const times = getSunTimes('2025-06-21');
    expect(times.sunriseUtc.getTime()).toBeLessThan(times.sunsetUtc.getTime());
    expect(times.maxElevation).toBeGreaterThan(50);
  });

  it('should have shorter day on winter solstice', () => {
    const summer = getSunTimes('2025-06-21');
    const winter = getSunTimes('2025-12-21');
    const summerDayLength = summer.sunsetUtc.getTime() - summer.sunriseUtc.getTime();
    const winterDayLength = winter.sunsetUtc.getTime() - winter.sunriseUtc.getTime();
    expect(summerDayLength).toBeGreaterThan(winterDayLength);
  });
});

describe('ShadowGeometry - Shadow Length', () => {
  it('should return 0 when sun is at or below horizon', () => {
    expect(calculateShadowLength(10, 0)).toBe(0);
    expect(calculateShadowLength(10, -5)).toBe(0);
  });

  it('should equal building height at 45°', () => {
    expect(calculateShadowLength(10, 45)).toBeCloseTo(10, 1);
  });

  it('should produce longer shadows at lower angles', () => {
    const low = calculateShadowLength(10, 10);
    const high = calculateShadowLength(10, 45);
    expect(low).toBeGreaterThan(high);
  });
});
