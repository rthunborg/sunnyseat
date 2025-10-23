using Microsoft.Extensions.Diagnostics.HealthChecks;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Services;

namespace SunnySeat.Api.HealthChecks;

/// <summary>
/// Health check for weather data services
/// </summary>
public class WeatherServiceHealthCheck : IHealthCheck
{
    private readonly MetNoWeatherService _metNoService;
    private readonly OpenWeatherMapService _openWeatherMapService;
    private readonly IWeatherRepository _weatherRepository;
    private readonly ILogger<WeatherServiceHealthCheck> _logger;

    public WeatherServiceHealthCheck(
        MetNoWeatherService metNoService,
        OpenWeatherMapService openWeatherMapService,
        IWeatherRepository weatherRepository,
        ILogger<WeatherServiceHealthCheck> logger)
    {
        _metNoService = metNoService ?? throw new ArgumentNullException(nameof(metNoService));
        _openWeatherMapService = openWeatherMapService ?? throw new ArgumentNullException(nameof(openWeatherMapService));
        _weatherRepository = weatherRepository ?? throw new ArgumentNullException(nameof(weatherRepository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var data = new Dictionary<string, object>();

            // Check primary source (Met.no)
            var metNoAvailable = await _metNoService.IsAvailableAsync(cancellationToken);
            data["met_no_available"] = metNoAvailable;

            // Check fallback source (OpenWeatherMap)
            var owmAvailable = await _openWeatherMapService.IsAvailableAsync(cancellationToken);
            data["openweathermap_available"] = owmAvailable;

            // Check weather data count in database
            var weatherDataCount = await _weatherRepository.GetWeatherDataCountAsync(cancellationToken);
            data["weather_data_count"] = weatherDataCount;

            // Check if we have recent weather data (data exists, assuming background service runs regularly)
            var hasRecentData = weatherDataCount > 0;
            data["has_recent_data"] = hasRecentData;

            // Determine health status
            if ((metNoAvailable || owmAvailable) && hasRecentData)
            {
                return HealthCheckResult.Healthy("Weather services are operational", data);
            }
            else if (metNoAvailable || owmAvailable)
            {
                return HealthCheckResult.Degraded("Weather API available but no recent data", data: data);
            }
            else
            {
                return HealthCheckResult.Unhealthy("All weather sources are unavailable", data: data);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking weather service health");
            return HealthCheckResult.Unhealthy("Weather health check failed", ex);
        }
    }
}
