using System;

namespace SunnySeat.Core.Entities
{
    /// <summary>
    /// Represents the calculated solar position for a specific timestamp and location
    /// </summary>
    public class SolarPosition
    {
        /// <summary>
        /// Solar azimuth angle in degrees (0° = North, 90° = East, 180° = South, 270° = West)
        /// </summary>
        public double Azimuth { get; set; }

        /// <summary>
        /// Solar elevation angle in degrees (0° = horizon, 90° = directly overhead)
        /// </summary>
        public double Elevation { get; set; }

        /// <summary>
        /// Solar zenith angle in degrees (90° - elevation)
        /// </summary>
        public double Zenith => 90.0 - Elevation;

        /// <summary>
        /// Solar declination angle in degrees
        /// </summary>
        public double Declination { get; set; }

        /// <summary>
        /// Hour angle in degrees
        /// </summary>
        public double HourAngle { get; set; }

        /// <summary>
        /// Earth-Sun distance in astronomical units (AU)
        /// </summary>
        public double EarthDistance { get; set; }

        /// <summary>
        /// UTC timestamp for this calculation
        /// </summary>
        public DateTime Timestamp { get; set; }

        /// <summary>
        /// Local time (Europe/Stockholm timezone) for this calculation
        /// </summary>
        public DateTime LocalTime { get; set; }

        /// <summary>
        /// Whether the sun is visible above the horizon
        /// </summary>
        public bool IsSunVisible => Elevation > 0;

        /// <summary>
        /// Latitude used for calculation
        /// </summary>
        public double Latitude { get; set; }

        /// <summary>
        /// Longitude used for calculation
        /// </summary>
        public double Longitude { get; set; }
    }
}