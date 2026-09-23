import type { SolarPosition } from './types';
import * as solarMath from './solar-math';

/** Additive g2 correction. The legacy solver includes milliseconds in Julian
 * time but omits them from UTC minutes in hour angle. Keep g1 unchanged; g2
 * producers bind this source/version and apply it before projecting shadows. */
export function correctG2SubsecondPosition(position: SolarPosition): SolarPosition {
  const milliseconds = position.timestamp.getUTCMilliseconds();
  if (milliseconds === 0) return position;
  const hourAngle = solarMath.normalizeDegreesSymmetric(position.hourAngle + milliseconds / 240000);
  const rawElevation = solarMath.calculateSolarElevation(position.latitude, position.declination, hourAngle);
  const elevation = solarMath.applyAtmosphericRefraction(rawElevation);
  return {
    ...position, hourAngle, elevation, zenith: 90 - elevation,
    azimuth: solarMath.calculateSolarAzimuth(position.latitude, position.declination, hourAngle, rawElevation),
    isSunVisible: elevation > 0,
  };
}
