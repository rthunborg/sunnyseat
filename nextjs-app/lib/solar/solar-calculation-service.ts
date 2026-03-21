import { GOTHENBURG } from './constants';
import * as SM from './solar-math';
import { convertUtcToStockholm } from './timezone-utils';
import type { SolarPosition, SunTimes } from './types';

export function calculateSolarPosition(
  utcTimestamp: Date,
  latitude = GOTHENBURG.LATITUDE,
  longitude = GOTHENBURG.LONGITUDE
): SolarPosition {
  validateCoordinates(latitude, longitude);
  validateTimestamp(utcTimestamp);

  const jd = SM.calculateJulianDay(utcTimestamp);
  const T = SM.calculateJulianCenturies(jd);

  const L0 = SM.calculateGeometricalMeanLongitudeSun(T);
  const M = SM.calculateGeometricalMeanAnomalySun(T);
  const e = SM.calculateEccentricityEarthOrbit(T);

  const C_eq = SM.calculateSunEquationOfCenter(M, T);
  const trueLon = SM.calculateSunTrueLongitude(L0, C_eq);
  const apparentLon = SM.calculateSunApparentLongitude(trueLon, T);

  const meanObliquity = SM.calculateMeanObliquityOfEcliptic(T);
  const corrObliquity = SM.calculateCorrectedObliquity(meanObliquity, T);

  const declination = SM.calculateSolarDeclination(apparentLon, corrObliquity);
  const eqOfTime = SM.calculateEquationOfTime(T, corrObliquity, L0, e, M);
  const hourAngle = SM.calculateHourAngle(longitude, utcTimestamp, eqOfTime);

  const elevation = SM.calculateSolarElevation(latitude, declination, hourAngle);
  const azimuth = SM.calculateSolarAzimuth(latitude, declination, hourAngle, elevation);
  const correctedElevation = SM.applyAtmosphericRefraction(elevation);

  const trueAnomaly = SM.normalizeDegrees(M + C_eq);
  const earthDistance = SM.calculateEarthSunDistance(trueAnomaly, e);

  const localTime = convertUtcToStockholm(utcTimestamp);

  return {
    azimuth,
    elevation: correctedElevation,
    zenith: 90.0 - correctedElevation,
    declination,
    hourAngle,
    earthDistance,
    timestamp: utcTimestamp,
    localTime,
    isSunVisible: correctedElevation > 0,
    latitude,
    longitude,
  };
}

export function calculateSolarTimeline(
  startUtc: Date,
  endUtc: Date,
  intervalMs: number,
  latitude = GOTHENBURG.LATITUDE,
  longitude = GOTHENBURG.LONGITUDE
): SolarPosition[] {
  if (endUtc <= startUtc) throw new Error('End time must be after start time');
  if (intervalMs <= 0) throw new Error('Interval must be positive');

  const positions: SolarPosition[] = [];
  let current = new Date(startUtc.getTime());

  while (current <= endUtc) {
    positions.push(calculateSolarPosition(current, latitude, longitude));
    current = new Date(current.getTime() + intervalMs);
  }

  return positions;
}

export function getCurrentSolarPosition(
  latitude = GOTHENBURG.LATITUDE,
  longitude = GOTHENBURG.LONGITUDE
): SolarPosition {
  return calculateSolarPosition(new Date(), latitude, longitude);
}

export function getSunTimes(
  dateStr: string,
  latitude = GOTHENBURG.LATITUDE,
  longitude = GOTHENBURG.LONGITUDE
): SunTimes {
  validateCoordinates(latitude, longitude);

  const [y, m, d] = dateStr.split('-').map(Number);
  const dateStart = new Date(Date.UTC(y, m - 1, d));

  const solarNoon = findSolarNoon(dateStart, latitude, longitude);
  const noonPos = calculateSolarPosition(solarNoon, latitude, longitude);
  const sunrise = findSunEvent(dateStart, latitude, longitude, -0.833, true);
  const sunset = findSunEvent(dateStart, latitude, longitude, -0.833, false);

  return {
    sunriseUtc: sunrise,
    sunsetUtc: sunset,
    sunriseLocal: convertUtcToStockholm(sunrise),
    sunsetLocal: convertUtcToStockholm(sunset),
    solarNoon,
    maxElevation: noonPos.elevation,
    date: dateStr,
    latitude,
    longitude,
  };
}

function findSolarNoon(
  date: Date,
  latitude: number,
  longitude: number
): Date {
  let start = new Date(date.getTime() + 10 * 3600000);
  let end = new Date(date.getTime() + 16 * 3600000);
  const toleranceMs = 1000;

  while (end.getTime() - start.getTime() > toleranceMs) {
    const mid = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
    const p1 = calculateSolarPosition(new Date(mid.getTime() - 300000), latitude, longitude);
    const p2 = calculateSolarPosition(new Date(mid.getTime() + 300000), latitude, longitude);

    if (p1.elevation > p2.elevation) {
      end = mid;
    } else {
      start = mid;
    }
  }

  return new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
}

function findSunEvent(
  date: Date,
  latitude: number,
  longitude: number,
  targetElevation: number,
  isSunrise: boolean
): Date {
  let start: Date;
  let end: Date;

  if (isSunrise) {
    start = new Date(date.getTime() + 2 * 3600000);
    end = new Date(date.getTime() + 10 * 3600000);
  } else {
    start = new Date(date.getTime() + 16 * 3600000);
    end = new Date(date.getTime() + 22 * 3600000);
  }

  const toleranceMs = 10000;

  while (end.getTime() - start.getTime() > toleranceMs) {
    const mid = new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
    const pos = calculateSolarPosition(mid, latitude, longitude);

    if (
      (isSunrise && pos.elevation < targetElevation) ||
      (!isSunrise && pos.elevation > targetElevation)
    ) {
      start = mid;
    } else {
      end = mid;
    }
  }

  return new Date(start.getTime() + (end.getTime() - start.getTime()) / 2);
}

function validateCoordinates(lat: number, lng: number): void {
  if (lat < -90 || lat > 90)
    throw new RangeError(`Latitude must be between -90 and 90, got ${lat}`);
  if (lng < -180 || lng > 180)
    throw new RangeError(`Longitude must be between -180 and 180, got ${lng}`);
}

function validateTimestamp(ts: Date): void {
  const year = ts.getUTCFullYear();
  if (year < 1000 || year > 3000)
    throw new RangeError(`Year must be between 1000 and 3000, got ${year}`);
}
