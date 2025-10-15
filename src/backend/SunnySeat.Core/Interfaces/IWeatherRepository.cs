using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Repository for weather data persistence
/// </summary>
public interface IWeatherRepository
{
    /// <summary>
    /// Stores weather data
    /// </summary>
    Task AddWeatherDataAsync(WeatherSlice weatherSlice, CancellationToken cancellationToken = default);

    /// <summary>
    /// Stores multiple weather data entries
    /// </summary>
    Task AddWeatherDataBatchAsync(IEnumerable<WeatherSlice> weatherSlices, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets latest weather data for a location within a time range
    /// </summary>
    Task<WeatherSlice?> GetLatestWeatherAsync(
        DateTime timestamp,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets weather forecast data within a time range
    /// </summary>
    Task<IReadOnlyList<WeatherSlice>> GetForecastDataAsync(
        DateTime startTime,
        DateTime endTime,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes weather data older than the specified date
    /// </summary>
    Task DeleteOldWeatherDataAsync(DateTime olderThan, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the count of weather records in database
    /// </summary>
    Task<int> GetWeatherDataCountAsync(CancellationToken cancellationToken = default);

    // ProcessedWeather operations

    /// <summary>
    /// Stores processed weather data
    /// </summary>
    Task AddProcessedWeatherAsync(ProcessedWeather processedWeather, CancellationToken cancellationToken = default);

    /// <summary>
    /// Stores multiple processed weather entries
    /// </summary>
    Task AddProcessedWeatherBatchAsync(IEnumerable<ProcessedWeather> processedWeathers, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets processed weather data for a specific location and time range
    /// </summary>
    Task<IReadOnlyList<ProcessedWeather>> GetProcessedWeatherAsync(
        Point? location,
        DateTime startTime,
        DateTime endTime,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets processed weather data by timestamp range
    /// </summary>
    Task<IReadOnlyList<ProcessedWeather>> GetProcessedWeatherByTimeRangeAsync(
        DateTime startTime,
        DateTime endTime,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes processed weather data older than the specified date
    /// </summary>
    Task DeleteOldProcessedWeatherAsync(DateTime olderThan, CancellationToken cancellationToken = default);
}
