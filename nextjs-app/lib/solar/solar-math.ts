import { SOLAR_CONSTANTS as C } from './constants';

/**
 * NREL Solar Position Algorithm (SPA) implementation.
 * All angles in degrees unless noted. Input times must be UTC.
 */

export function calculateJulianDay(utc: Date): number {
  let year = utc.getUTCFullYear();
  let month = utc.getUTCMonth() + 1;
  const day = utc.getUTCDate();
  const hour =
    utc.getUTCHours() +
    utc.getUTCMinutes() / 60 +
    utc.getUTCSeconds() / 3600 +
    utc.getUTCMilliseconds() / 3600000;

  if (month <= 2) {
    year -= 1;
    month += 12;
  }

  const a = Math.trunc(year / 100);
  let b = 0;
  if (
    year > 1582 ||
    (year === 1582 && month > 10) ||
    (year === 1582 && month === 10 && day >= 15)
  ) {
    b = 2 - a + Math.trunc(a / 4);
  }

  const jd =
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    b -
    1524.5;

  return jd + hour / 24.0;
}

export function calculateJulianCenturies(jd: number): number {
  return (jd - C.JULIAN_DAY_2000) / C.DAYS_PER_JULIAN_CENTURY;
}

export function calculateGeometricalMeanLongitudeSun(T: number): number {
  const l0 = 280.46646 + T * (36000.76983 + T * 0.0003032);
  return normalizeDegrees(l0);
}

export function calculateGeometricalMeanAnomalySun(T: number): number {
  return 357.52911 + T * (35999.05029 - 0.0001537 * T);
}

export function calculateEccentricityEarthOrbit(T: number): number {
  return 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
}

export function calculateSunEquationOfCenter(
  meanAnomalyDeg: number,
  T: number
): number {
  const M = meanAnomalyDeg * C.DEG_TO_RAD;
  return (
    Math.sin(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * M) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * M) * 0.000289
  );
}

export function calculateSunTrueLongitude(L0: number, C_eq: number): number {
  return normalizeDegrees(L0 + C_eq);
}

export function calculateSunApparentLongitude(
  trueLon: number,
  T: number
): number {
  const omega = 125.04 - 1934.136 * T;
  return trueLon - 0.00569 - 0.00478 * Math.sin(omega * C.DEG_TO_RAD);
}

export function calculateMeanObliquityOfEcliptic(T: number): number {
  const seconds = 21.448 - T * (46.815 + T * (0.00059 - T * 0.001813));
  return 23.0 + (26.0 + seconds / 60.0) / 60.0;
}

export function calculateCorrectedObliquity(
  meanObliquity: number,
  T: number
): number {
  const omega = 125.04 - 1934.136 * T;
  return meanObliquity + 0.00256 * Math.cos(omega * C.DEG_TO_RAD);
}

export function calculateSolarDeclination(
  apparentLon: number,
  corrObliquity: number
): number {
  const lonRad = apparentLon * C.DEG_TO_RAD;
  const oblRad = corrObliquity * C.DEG_TO_RAD;
  return Math.asin(Math.sin(oblRad) * Math.sin(lonRad)) * C.RAD_TO_DEG;
}

export function calculateEquationOfTime(
  T: number,
  corrObliquity: number,
  L0: number,
  e: number,
  M: number
): number {
  const oblRad = corrObliquity * C.DEG_TO_RAD;
  const l0Rad = L0 * C.DEG_TO_RAD;
  const mRad = M * C.DEG_TO_RAD;

  let y = Math.tan(oblRad / 2.0);
  y *= y;

  const sin2L0 = Math.sin(2.0 * l0Rad);
  const sinM = Math.sin(mRad);
  const cos2L0 = Math.cos(2.0 * l0Rad);
  const sin4L0 = Math.sin(4.0 * l0Rad);
  const sin2M = Math.sin(2.0 * mRad);

  const eTime =
    y * sin2L0 -
    2.0 * e * sinM +
    4.0 * e * y * sinM * cos2L0 -
    0.5 * y * y * sin4L0 -
    1.25 * e * e * sin2M;

  return 4.0 * eTime * C.RAD_TO_DEG;
}

export function calculateHourAngle(
  longitude: number,
  utc: Date,
  eqOfTime: number
): number {
  const utcMinutes =
    utc.getUTCHours() * 60 + utc.getUTCMinutes() + utc.getUTCSeconds() / 60;
  const trueSolarTime = utcMinutes + 4.0 * longitude + eqOfTime;
  const hourAngle = trueSolarTime / 4.0 - 180.0;
  return normalizeDegreesSymmetric(hourAngle);
}

export function calculateSolarElevation(
  latitude: number,
  declination: number,
  hourAngle: number
): number {
  const latRad = latitude * C.DEG_TO_RAD;
  const declRad = declination * C.DEG_TO_RAD;
  const haRad = hourAngle * C.DEG_TO_RAD;

  const elevation = Math.asin(
    Math.sin(latRad) * Math.sin(declRad) +
      Math.cos(latRad) * Math.cos(declRad) * Math.cos(haRad)
  );

  return elevation * C.RAD_TO_DEG;
}

export function calculateSolarAzimuth(
  latitude: number,
  declination: number,
  hourAngle: number,
  _elevation: number
): number {
  const latRad = latitude * C.DEG_TO_RAD;
  const declRad = declination * C.DEG_TO_RAD;
  const haRad = hourAngle * C.DEG_TO_RAD;

  const gamma = Math.atan2(
    Math.sin(haRad),
    Math.cos(haRad) * Math.sin(latRad) - Math.tan(declRad) * Math.cos(latRad)
  );

  return normalizeDegrees(gamma * C.RAD_TO_DEG + 180.0);
}

export function calculateEarthSunDistance(
  trueAnomaly: number,
  eccentricity: number
): number {
  const taRad = trueAnomaly * C.DEG_TO_RAD;
  return (
    (1.000001018 * (1 - eccentricity * eccentricity)) /
    (1 + eccentricity * Math.cos(taRad))
  );
}

export function applyAtmosphericRefraction(
  trueElevation: number,
  pressure = C.STANDARD_PRESSURE,
  temperature = C.STANDARD_TEMPERATURE
): number {
  if (trueElevation <= -0.5) return trueElevation;

  if (trueElevation <= 0.5) {
    const refraction =
      (pressure / 1010.0) * (283.0 / (273.0 + temperature)) * 34.0;
    return trueElevation + refraction / 60.0;
  }

  const refractionMinutes =
    (pressure / 1010.0) *
    (283.0 / (273.0 + temperature)) *
    (1.02 /
      Math.tan(
        (trueElevation + 10.3 / (trueElevation + 5.11)) * C.DEG_TO_RAD
      ));

  return trueElevation + refractionMinutes / 60.0;
}

export function normalizeDegrees(degrees: number): number {
  let normalized = degrees % 360.0;
  return normalized < 0 ? normalized + 360.0 : normalized;
}

export function normalizeDegreesSymmetric(degrees: number): number {
  const normalized = normalizeDegrees(degrees);
  return normalized > 180.0 ? normalized - 360.0 : normalized;
}
