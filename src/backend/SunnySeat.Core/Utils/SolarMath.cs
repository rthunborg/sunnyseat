using System;
using SunnySeat.Core.Constants;

namespace SunnySeat.Core.Utils
{
    /// <summary>
    /// Utility functions for solar mathematical calculations
    /// Implements core algorithms from NREL Solar Position Algorithm (SPA)
    /// </summary>
    public static class SolarMath
    {
        /// <summary>
        /// Calculate Julian Day Number from UTC DateTime
        /// </summary>
        /// <param name="utcDateTime">UTC DateTime</param>
        /// <returns>Julian Day Number</returns>
        public static double CalculateJulianDay(DateTime utcDateTime)
        {
            int year = utcDateTime.Year;
            int month = utcDateTime.Month;
            int day = utcDateTime.Day;
            double hour = utcDateTime.Hour + utcDateTime.Minute / 60.0 + utcDateTime.Second / 3600.0 + utcDateTime.Millisecond / 3600000.0;

            // Adjust for months January and February
            if (month <= 2)
            {
                year -= 1;
                month += 12;
            }

            // Gregorian calendar correction
            int a = year / 100;
            int b = 0;

            // Only apply Gregorian correction for dates after October 15, 1582
            if (year > 1582 || (year == 1582 && month > 10) || (year == 1582 && month == 10 && day >= 15))
            {
                b = 2 - a + (a / 4);
            }

            // Calculate Julian Day Number
            double jd = Math.Floor(365.25 * (year + 4716)) + Math.Floor(30.6001 * (month + 1)) + day + b - 1524.5;

            // Add fractional day
            jd += hour / 24.0;

            return jd;
        }

        /// <summary>
        /// Calculate Julian centuries from J2000.0 epoch
        /// </summary>
        /// <param name="julianDay">Julian Day Number</param>
        /// <returns>Julian centuries since J2000.0</returns>
        public static double CalculateJulianCenturies(double julianDay)
        {
            return (julianDay - SolarConstants.JulianDay2000) / SolarConstants.DaysPerJulianCentury;
        }

        /// <summary>
        /// Calculate geocentric longitude of the sun (degrees)
        /// </summary>
        /// <param name="julianCenturies">Julian centuries since J2000.0</param>
        /// <returns>Geocentric longitude in degrees</returns>
        public static double CalculateGeometricalMeanLongitudeSun(double julianCenturies)
        {
            double l0 = 280.46646 + julianCenturies * (36000.76983 + julianCenturies * 0.0003032);
            return NormalizeDegrees(l0);
        }

        /// <summary>
        /// Calculate mean anomaly of the sun (degrees)
        /// </summary>
        /// <param name="julianCenturies">Julian centuries since J2000.0</param>
        /// <returns>Mean anomaly in degrees</returns>
        public static double CalculateGeometricalMeanAnomalySun(double julianCenturies)
        {
            return 357.52911 + julianCenturies * (35999.05029 - 0.0001537 * julianCenturies);
        }

        /// <summary>
        /// Calculate eccentricity of Earth's orbit
        /// </summary>
        /// <param name="julianCenturies">Julian centuries since J2000.0</param>
        /// <returns>Orbital eccentricity</returns>
        public static double CalculateEccentricityEarthOrbit(double julianCenturies)
        {
            return 0.016708634 - julianCenturies * (0.000042037 + 0.0000001267 * julianCenturies);
        }

        /// <summary>
        /// Calculate equation of center for the sun
        /// </summary>
        /// <param name="meanAnomalyDegrees">Mean anomaly in degrees</param>
        /// <param name="julianCenturies">Julian centuries since J2000.0</param>
        /// <returns>Equation of center in degrees</returns>
        public static double CalculateSunEquationOfCenter(double meanAnomalyDegrees, double julianCenturies)
        {
            double meanAnomalyRad = meanAnomalyDegrees * SolarConstants.DegreesToRadians;

            return Math.Sin(meanAnomalyRad) * (1.914602 - julianCenturies * (0.004817 + 0.000014 * julianCenturies)) +
                   Math.Sin(2 * meanAnomalyRad) * (0.019993 - 0.000101 * julianCenturies) +
                   Math.Sin(3 * meanAnomalyRad) * 0.000289;
        }

        /// <summary>
        /// Calculate true longitude of the sun
        /// </summary>
        /// <param name="geometricMeanLongitude">Geometric mean longitude</param>
        /// <param name="equationOfCenter">Equation of center</param>
        /// <returns>True longitude in degrees</returns>
        public static double CalculateSunTrueLongitude(double geometricMeanLongitude, double equationOfCenter)
        {
            return NormalizeDegrees(geometricMeanLongitude + equationOfCenter);
        }

        /// <summary>
        /// Calculate apparent longitude of the sun
        /// </summary>
        /// <param name="trueLongitude">True longitude in degrees</param>
        /// <param name="julianCenturies">Julian centuries since J2000.0</param>
        /// <returns>Apparent longitude in degrees</returns>
        public static double CalculateSunApparentLongitude(double trueLongitude, double julianCenturies)
        {
            double omega = 125.04 - 1934.136 * julianCenturies;
            return trueLongitude - 0.00569 - 0.00478 * Math.Sin(omega * SolarConstants.DegreesToRadians);
        }

        /// <summary>
        /// Calculate mean obliquity of the ecliptic
        /// </summary>
        /// <param name="julianCenturies">Julian centuries since J2000.0</param>
        /// <returns>Mean obliquity in degrees</returns>
        public static double CalculateMeanObliquityOfEcliptic(double julianCenturies)
        {
            double seconds = 21.448 - julianCenturies * (46.8150 + julianCenturies * (0.00059 - julianCenturies * 0.001813));
            return 23.0 + (26.0 + (seconds / 60.0)) / 60.0;
        }

        /// <summary>
        /// Calculate corrected obliquity of the ecliptic
        /// </summary>
        /// <param name="meanObliquity">Mean obliquity in degrees</param>
        /// <param name="julianCenturies">Julian centuries since J2000.0</param>
        /// <returns>Corrected obliquity in degrees</returns>
        public static double CalculateCorrectedObliquity(double meanObliquity, double julianCenturies)
        {
            double omega = 125.04 - 1934.136 * julianCenturies;
            return meanObliquity + 0.00256 * Math.Cos(omega * SolarConstants.DegreesToRadians);
        }

        /// <summary>
        /// Calculate solar declination angle
        /// </summary>
        /// <param name="apparentLongitude">Apparent longitude in degrees</param>
        /// <param name="correctedObliquity">Corrected obliquity in degrees</param>
        /// <returns>Solar declination in degrees</returns>
        public static double CalculateSolarDeclination(double apparentLongitude, double correctedObliquity)
        {
            double apparentLongitudeRad = apparentLongitude * SolarConstants.DegreesToRadians;
            double correctedObliquityRad = correctedObliquity * SolarConstants.DegreesToRadians;

            return Math.Asin(Math.Sin(correctedObliquityRad) * Math.Sin(apparentLongitudeRad)) * SolarConstants.RadiansToDegrees;
        }

        /// <summary>
        /// Calculate equation of time
        /// </summary>
        /// <param name="julianCenturies">Julian centuries since J2000.0</param>
        /// <param name="correctedObliquity">Corrected obliquity in degrees</param>
        /// <param name="geometricMeanLongitude">Geometric mean longitude in degrees</param>
        /// <param name="eccentricity">Orbital eccentricity</param>
        /// <param name="meanAnomaly">Mean anomaly in degrees</param>
        /// <returns>Equation of time in minutes</returns>
        public static double CalculateEquationOfTime(double julianCenturies, double correctedObliquity,
            double geometricMeanLongitude, double eccentricity, double meanAnomaly)
        {
            double obliquityRad = correctedObliquity * SolarConstants.DegreesToRadians;
            double meanLongRad = geometricMeanLongitude * SolarConstants.DegreesToRadians;
            double meanAnomalyRad = meanAnomaly * SolarConstants.DegreesToRadians;

            double y = Math.Tan(obliquityRad / 2.0);
            y *= y;

            double sin2MeanLong = Math.Sin(2.0 * meanLongRad);
            double sinMeanAnomaly = Math.Sin(meanAnomalyRad);
            double cos2MeanLong = Math.Cos(2.0 * meanLongRad);
            double sin4MeanLong = Math.Sin(4.0 * meanLongRad);
            double sin2MeanAnomaly = Math.Sin(2.0 * meanAnomalyRad);

            double eTime = y * sin2MeanLong - 2.0 * eccentricity * sinMeanAnomaly +
                          4.0 * eccentricity * y * sinMeanAnomaly * cos2MeanLong -
                          0.5 * y * y * sin4MeanLong -
                          1.25 * eccentricity * eccentricity * sin2MeanAnomaly;

            return 4.0 * (eTime * SolarConstants.RadiansToDegrees);
        }

        /// <summary>
        /// Calculate hour angle
        /// </summary>
        /// <param name="longitude">Longitude in degrees</param>
        /// <param name="utcDateTime">UTC DateTime</param>
        /// <param name="equationOfTime">Equation of time in minutes</param>
        /// <returns>Hour angle in degrees</returns>
        public static double CalculateHourAngle(double longitude, DateTime utcDateTime, double equationOfTime)
        {
            // Convert UTC time to minutes since midnight
            double utcMinutes = utcDateTime.Hour * 60.0 + utcDateTime.Minute + utcDateTime.Second / 60.0;

            // Calculate true solar time in minutes
            // TST = UTC + 4*longitude + equationOfTime
            double trueSolarTime = utcMinutes + 4.0 * longitude + equationOfTime;

            // Convert to hour angle in degrees
            // Hour angle is 0 at solar noon (12:00), negative before noon, positive after
            // HA = (TST/4) - 180
            double hourAngle = (trueSolarTime / 4.0) - 180.0;

            return NormalizeDegreesSymmetric(hourAngle);
        }

        /// <summary>
        /// Calculate solar elevation angle
        /// </summary>
        /// <param name="latitude">Latitude in degrees</param>
        /// <param name="declination">Solar declination in degrees</param>
        /// <param name="hourAngle">Hour angle in degrees</param>
        /// <returns>Solar elevation angle in degrees</returns>
        public static double CalculateSolarElevation(double latitude, double declination, double hourAngle)
        {
            double latRad = latitude * SolarConstants.DegreesToRadians;
            double declRad = declination * SolarConstants.DegreesToRadians;
            double hourAngleRad = hourAngle * SolarConstants.DegreesToRadians;

            double elevation = Math.Asin(Math.Sin(latRad) * Math.Sin(declRad) +
                                       Math.Cos(latRad) * Math.Cos(declRad) * Math.Cos(hourAngleRad));

            return elevation * SolarConstants.RadiansToDegrees;
        }

        /// <summary>
        /// Calculate solar azimuth angle
        /// </summary>
        /// <param name="latitude">Latitude in degrees</param>
        /// <param name="declination">Solar declination in degrees</param>
        /// <param name="hourAngle">Hour angle in degrees</param>
        /// <param name="elevation">Solar elevation in degrees</param>
        /// <returns>Solar azimuth angle in degrees (0� = North, 90� = East, 180� = South, 270� = West)</returns>
        public static double CalculateSolarAzimuth(double latitude, double declination, double hourAngle, double elevation)
        {
            double latRad = latitude * SolarConstants.DegreesToRadians;
            double declRad = declination * SolarConstants.DegreesToRadians;
            double hourAngleRad = hourAngle * SolarConstants.DegreesToRadians;

            // NREL SPA azimuth formula
            // Γ = atan2(sin H, cos H × sin φ − tan δ × cos φ)
            // Azimuth = Γ + 180° (to convert to North = 0° convention)
            double gamma = Math.Atan2(Math.Sin(hourAngleRad),
                Math.Cos(hourAngleRad) * Math.Sin(latRad) - Math.Tan(declRad) * Math.Cos(latRad));

            double azimuth = gamma * SolarConstants.RadiansToDegrees;
            return NormalizeDegrees(azimuth + 180.0);
        }

        /// <summary>
        /// Calculate Earth-Sun distance in astronomical units
        /// </summary>
        /// <param name="trueAnomaly">True anomaly in degrees</param>
        /// <param name="eccentricity">Orbital eccentricity</param>
        /// <returns>Earth-Sun distance in AU</returns>
        public static double CalculateEarthSunDistance(double trueAnomaly, double eccentricity)
        {
            double trueAnomalyRad = trueAnomaly * SolarConstants.DegreesToRadians;
            return (1.000001018 * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.Cos(trueAnomalyRad));
        }

        /// <summary>
        /// Normalize angle to 0-360 degree range
        /// </summary>
        /// <param name="degrees">Angle in degrees</param>
        /// <returns>Normalized angle between 0 and 360 degrees</returns>
        public static double NormalizeDegrees(double degrees)
        {
            double normalized = degrees % 360.0;
            return normalized < 0 ? normalized + 360.0 : normalized;
        }

        /// <summary>
        /// Normalize angle to -180 to 180 degree range
        /// </summary>
        /// <param name="degrees">Angle in degrees</param>
        /// <returns>Normalized angle between -180 and 180 degrees</returns>
        public static double NormalizeDegreesSymmetric(double degrees)
        {
            double normalized = NormalizeDegrees(degrees);
            return normalized > 180.0 ? normalized - 360.0 : normalized;
        }

        /// <summary>
        /// Apply atmospheric refraction correction to elevation angle
        /// </summary>
        /// <param name="trueElevation">True geometric elevation in degrees</param>
        /// <param name="pressure">Atmospheric pressure in millibars</param>
        /// <param name="temperature">Temperature in Celsius</param>
        /// <returns>Apparent elevation in degrees</returns>
        public static double ApplyAtmosphericRefraction(double trueElevation, double pressure = SolarConstants.StandardPressure,
            double temperature = SolarConstants.StandardTemperature)
        {
            // Don't apply refraction below horizon
            if (trueElevation <= -0.5)
                return trueElevation;

            // Handle horizon case specially (approximately 34 arc minutes or 0.57 degrees)
            if (trueElevation <= 0.5)
            {
                double refraction = (pressure / 1010.0) * (283.0 / (273.0 + temperature)) * 34.0;
                return trueElevation + refraction / 60.0;
            }

            // Bennett's formula for atmospheric refraction (simplified)
            // Refraction in arc minutes
            double refractionMinutes = (pressure / 1010.0) * (283.0 / (273.0 + temperature)) *
                               (1.02 / Math.Tan((trueElevation + 10.3 / (trueElevation + 5.11)) * SolarConstants.DegreesToRadians));

            return trueElevation + refractionMinutes / 60.0; // Convert arc minutes to degrees
        }
    }
}