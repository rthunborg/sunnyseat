using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Service for fetching weather data from external APIs
/// </summary>
public interface IWeatherService
{
    /// <summary>
    /// Fetches current weather data for Gothenburg area
    /// </summary>
    /// <param name="latitude">Latitude of location</param>
    /// <param name="longitude">Longitude of location</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Weather data or null if unavailable</returns>
    Task<WeatherSlice?> GetCurrentWeatherAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Fetches weather forecast data for the next 48 hours
    /// </summary>
    /// <param name="latitude">Latitude of location</param>
    /// <param name="longitude">Longitude of location</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of weather forecasts</returns>
    Task<IReadOnlyList<WeatherSlice>> GetForecastAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the source name for this weather service
    /// </summary>
    string SourceName { get; }

    /// <summary>
    /// Checks if the service is currently available
    /// </summary>
    Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default);
}
