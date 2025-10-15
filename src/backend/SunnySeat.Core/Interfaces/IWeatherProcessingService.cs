using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Service for processing raw weather data into sun-relevant conditions
/// </summary>
public interface IWeatherProcessingService
{
    /// <summary>
    /// Processes a raw weather slice into normalized, sun-relevant data
    /// </summary>
    /// <param name="weatherSlice">Raw weather data from external API</param>
    /// <param name="location">Optional patio location for spatial estimation</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Processed weather data</returns>
    Task<ProcessedWeather> ProcessWeatherDataAsync(
        WeatherSlice weatherSlice,
        Point? location = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Processes multiple weather slices in batch for efficiency
    /// </summary>
    /// <param name="weatherSlices">Collection of raw weather data</param>
    /// <param name="location">Optional patio location for spatial estimation</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Collection of processed weather data</returns>
    Task<IReadOnlyList<ProcessedWeather>> ProcessWeatherDataBatchAsync(
        IEnumerable<WeatherSlice> weatherSlices,
        Point? location = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets processed weather for a specific patio location and time range
    /// </summary>
    /// <param name="location">Patio location</param>
    /// <param name="startTime">Start of time range</param>
    /// <param name="endTime">End of time range</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Processed weather data for the location and time range</returns>
    Task<IReadOnlyList<ProcessedWeather>> GetProcessedWeatherForPatioAsync(
        Point location,
        DateTime startTime,
        DateTime endTime,
        CancellationToken cancellationToken = default);
}
