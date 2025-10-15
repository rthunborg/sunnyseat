using System;

namespace SunnySeat.Core.Constants
{
    /// <summary>
    /// Constants used in solar position calculations based on NREL Solar Position Algorithm
    /// </summary>
    public static class SolarConstants
    {
        /// <summary>
        /// Julian Day Number for January 1, 2000, 12:00:00 UT
        /// </summary>
        public const double JulianDay2000 = 2451545.0;

        /// <summary>
        /// Number of days in a Julian century
        /// </summary>
        public const double DaysPerJulianCentury = 36525.0;

        /// <summary>
        /// Conversion factor from degrees to radians
        /// </summary>
        public const double DegreesToRadians = Math.PI / 180.0;

        /// <summary>
        /// Conversion factor from radians to degrees
        /// </summary>
        public const double RadiansToDegrees = 180.0 / Math.PI;

        /// <summary>
        /// Earth's mean orbital eccentricity
        /// </summary>
        public const double EarthEccentricity = 0.016708634;

        /// <summary>
        /// Mean obliquity of the ecliptic at J2000.0 epoch in degrees
        /// </summary>
        public const double MeanObliquity = 23.439291;

        /// <summary>
        /// Atmospheric refraction correction at horizon in degrees
        /// </summary>
        public const double AtmosphericRefraction = 0.5667;

        /// <summary>
        /// Solar disk semi-diameter in degrees
        /// </summary>
        public const double SolarSemiDiameter = 0.2667;

        /// <summary>
        /// Standard atmospheric pressure in millibars
        /// </summary>
        public const double StandardPressure = 1013.25;

        /// <summary>
        /// Standard temperature in Celsius
        /// </summary>
        public const double StandardTemperature = 15.0;

        /// <summary>
        /// Maximum acceptable error in solar position calculations (degrees)
        /// </summary>
        public const double MaxCalculationError = 0.01;

        /// <summary>
        /// Performance target: maximum calculation time in milliseconds
        /// </summary>
        public const double MaxCalculationTimeMs = 1.0;
    }
}