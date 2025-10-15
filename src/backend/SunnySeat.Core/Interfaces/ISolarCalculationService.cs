using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Interfaces
{
    /// <summary>
    /// Service for calculating solar position data with high accuracy and performance
    /// </summary>
    public interface ISolarCalculationService
    {
        /// <summary>
        /// Calculate solar position for a specific timestamp and location
        /// </summary>
        /// <param name="utcTimestamp">UTC timestamp for calculation</param>
        /// <param name="latitude">Latitude in decimal degrees</param>
        /// <param name="longitude">Longitude in decimal degrees</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Solar position data</returns>
        Task<SolarPosition> CalculateSolarPositionAsync(DateTime utcTimestamp, 
            double latitude = Constants.GothenburgCoordinates.Latitude, 
            double longitude = Constants.GothenburgCoordinates.Longitude,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Calculate solar positions for a time range with specified interval
        /// </summary>
        /// <param name="startUtc">Start timestamp in UTC</param>
        /// <param name="endUtc">End timestamp in UTC</param>
        /// <param name="interval">Time interval between calculations</param>
        /// <param name="latitude">Latitude in decimal degrees</param>
        /// <param name="longitude">Longitude in decimal degrees</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Collection of solar position data points</returns>
        Task<IEnumerable<SolarPosition>> CalculateSolarTimelineAsync(DateTime startUtc, 
            DateTime endUtc, TimeSpan interval,
            double latitude = Constants.GothenburgCoordinates.Latitude, 
            double longitude = Constants.GothenburgCoordinates.Longitude,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Get current solar position based on system time
        /// </summary>
        /// <param name="latitude">Latitude in decimal degrees</param>
        /// <param name="longitude">Longitude in decimal degrees</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Current solar position data</returns>
        Task<SolarPosition> GetCurrentSolarPositionAsync(
            double latitude = Constants.GothenburgCoordinates.Latitude,
            double longitude = Constants.GothenburgCoordinates.Longitude,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Calculate sunrise, sunset, and solar noon times for a specific date
        /// </summary>
        /// <param name="date">Date for sun times calculation</param>
        /// <param name="latitude">Latitude in decimal degrees</param>
        /// <param name="longitude">Longitude in decimal degrees</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Sun times data</returns>
        Task<SunTimes> GetSunTimesAsync(DateOnly date,
            double latitude = Constants.GothenburgCoordinates.Latitude,
            double longitude = Constants.GothenburgCoordinates.Longitude,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Determine if the sun is visible above the horizon
        /// </summary>
        /// <param name="position">Solar position to check</param>
        /// <returns>True if sun is visible</returns>
        bool IsSunVisible(SolarPosition position);

        /// <summary>
        /// Calculate solar position for a venue using its coordinates
        /// </summary>
        /// <param name="venueId">Venue ID to get coordinates from</param>
        /// <param name="timestamp">UTC timestamp for calculation</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Solar position for the venue location</returns>
        Task<SolarPosition> CalculateForVenueAsync(int venueId, DateTime timestamp,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Calculate solar position for a patio using its centroid coordinates
        /// </summary>
        /// <param name="patioId">Patio ID to get coordinates from</param>
        /// <param name="timestamp">UTC timestamp for calculation</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Solar position for the patio location</returns>
        Task<SolarPosition> CalculateForPatioAsync(int patioId, DateTime timestamp,
            CancellationToken cancellationToken = default);
    }
}