using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Service for calculating patio sun exposure combining solar position and shadow data
/// </summary>
public interface ISunExposureService
{
    /// <summary>
    /// Calculate sun exposure for a specific patio at given timestamp
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="timestamp">Timestamp for calculation (UTC)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Complete sun exposure information</returns>
    Task<PatioSunExposure> CalculatePatioSunExposureAsync(int patioId, 
        DateTime timestamp, CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculate sun exposure for multiple patios at given timestamp (optimized batch operation)
    /// </summary>
    /// <param name="patioIds">IDs of patios to calculate</param>
    /// <param name="timestamp">Timestamp for calculation (UTC)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Dictionary mapping patio IDs to sun exposure information</returns>
    Task<Dictionary<int, PatioSunExposure>> CalculateBatchSunExposureAsync(
        IEnumerable<int> patioIds, DateTime timestamp,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get current sun exposure for a patio (uses current UTC time)
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Current sun exposure information</returns>
    Task<PatioSunExposure> GetCurrentSunExposureAsync(int patioId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculate sun exposure timeline for a patio over a time period
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="startTime">Start of timeline (UTC)</param>
    /// <param name="endTime">End of timeline (UTC)</param>
    /// <param name="interval">Time interval between calculations</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Sun exposure timeline data</returns>
    Task<SunExposureTimeline> CalculateSunExposureTimelineAsync(int patioId,
        DateTime startTime, DateTime endTime, TimeSpan interval,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Find sunny patios near a given location
    /// </summary>
    /// <param name="location">Geographic location to search near</param>
    /// <param name="radiusKm">Search radius in kilometers</param>
    /// <param name="timestamp">Timestamp for sun exposure calculation (optional, defaults to current time)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Collection of sunny patios with their sun exposure information</returns>
    Task<IEnumerable<PatioSunExposure>> GetSunnyPatiosNearLocationAsync(
        Point location, double radiusKm, DateTime? timestamp = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Determine if sun exposure calculation is reliable for given conditions
    /// </summary>
    /// <param name="solarPosition">Solar position to evaluate</param>
    /// <param name="confidenceFactors">Confidence factors from calculation</param>
    /// <returns>True if calculation is considered reliable</returns>
    bool IsSunExposureCalculationReliable(SolarPosition solarPosition, ConfidenceFactors confidenceFactors);
}