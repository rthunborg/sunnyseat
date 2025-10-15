using System;

namespace SunnySeat.Core.Entities
{
    /// <summary>
    /// Represents sunrise and sunset times for a specific date and location
    /// </summary>
    public class SunTimes
    {
        /// <summary>
        /// Sunrise time in UTC
        /// </summary>
        public DateTime SunriseUtc { get; set; }

        /// <summary>
        /// Sunset time in UTC
        /// </summary>
        public DateTime SunsetUtc { get; set; }

        /// <summary>
        /// Sunrise time in local timezone (Europe/Stockholm)
        /// </summary>
        public DateTime SunriseLocal { get; set; }

        /// <summary>
        /// Sunset time in local timezone (Europe/Stockholm)
        /// </summary>
        public DateTime SunsetLocal { get; set; }

        /// <summary>
        /// Total daylight duration
        /// </summary>
        public TimeSpan DayLength => SunsetUtc - SunriseUtc;

        /// <summary>
        /// Solar noon time in UTC (when sun reaches maximum elevation)
        /// </summary>
        public DateTime SolarNoon { get; set; }

        /// <summary>
        /// Maximum solar elevation angle for the day
        /// </summary>
        public double MaxElevation { get; set; }

        /// <summary>
        /// Date for these sun times
        /// </summary>
        public DateOnly Date { get; set; }

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