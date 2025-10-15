using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Core.Services;

/// <summary>
/// Fallback weather service implementation using OpenWeatherMap API
/// </summary>
public class OpenWeatherMapService : IWeatherService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<OpenWeatherMapService> _logger;
    private readonly string _apiKey;
    private const string ApiBaseUrl = "https://api.openweathermap.org/data/2.5";
    private const string HttpClientName = "OpenWeatherMap";

    public string SourceName => "openweathermap";

    public OpenWeatherMapService(
        IHttpClientFactory httpClientFactory,
        ILogger<OpenWeatherMapService> logger,
        IOptions<WeatherOptions> options)
    {
        _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _apiKey = options?.Value?.OpenWeatherMapApiKey ?? throw new ArgumentNullException(nameof(options));
    }

    /// <inheritdoc />
    public async Task<WeatherSlice?> GetCurrentWeatherAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var client = _httpClientFactory.CreateClient(HttpClientName);
            var url = $"{ApiBaseUrl}/weather?lat={latitude:F4}&lon={longitude:F4}&appid={_apiKey}&units=metric";

            _logger.LogDebug("Fetching OpenWeatherMap current weather from {Url}", url);

            var response = await client.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("OpenWeatherMap API returned {StatusCode} for lat={Latitude}, lon={Longitude}",
                    response.StatusCode, latitude, longitude);
                return null;
            }

            var data = await response.Content.ReadFromJsonAsync<OpenWeatherMapCurrentResponse>(cancellationToken: cancellationToken);

            if (data == null)
            {
                _logger.LogWarning("OpenWeatherMap returned null data");
                return null;
            }

            var weatherSlice = new WeatherSlice
            {
                Timestamp = DateTime.UtcNow,
                CloudCover = data.Clouds?.All ?? 0,
                Temperature = data.Main?.Temp ?? 0,
                Visibility = (data.Visibility ?? 0) / 1000.0, // Convert meters to kilometers
                PrecipitationProbability = data.Rain?.OneHour > 0 || data.Snow?.OneHour > 0 ? 0.7 : 0,
                IsForecast = false,
                Source = SourceName,
                CreatedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Successfully fetched current weather from OpenWeatherMap");
            return weatherSlice;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching current weather from OpenWeatherMap for lat={Latitude}, lon={Longitude}",
                latitude, longitude);
            return null;
        }
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<WeatherSlice>> GetForecastAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var client = _httpClientFactory.CreateClient(HttpClientName);
            var url = $"{ApiBaseUrl}/forecast?lat={latitude:F4}&lon={longitude:F4}&appid={_apiKey}&units=metric";

            _logger.LogDebug("Fetching OpenWeatherMap forecast from {Url}", url);

            var response = await client.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("OpenWeatherMap API returned {StatusCode} for lat={Latitude}, lon={Longitude}",
                    response.StatusCode, latitude, longitude);
                return Array.Empty<WeatherSlice>();
            }

            var data = await response.Content.ReadFromJsonAsync<OpenWeatherMapForecastResponse>(cancellationToken: cancellationToken);

            if (data?.List == null || data.List.Count == 0)
            {
                _logger.LogWarning("OpenWeatherMap returned empty forecast data");
                return Array.Empty<WeatherSlice>();
            }

            var weatherSlices = new List<WeatherSlice>();

            foreach (var forecast in data.List.Take(16)) // 48 hours (16 x 3-hour intervals)
            {
                weatherSlices.Add(new WeatherSlice
                {
                    Timestamp = DateTimeOffset.FromUnixTimeSeconds(forecast.Dt).UtcDateTime,
                    CloudCover = forecast.Clouds?.All ?? 0,
                    Temperature = forecast.Main?.Temp ?? 0,
                    Visibility = (forecast.Visibility ?? 0) / 1000.0,
                    PrecipitationProbability = forecast.Pop ?? 0,
                    IsForecast = true,
                    Source = SourceName,
                    CreatedAt = DateTime.UtcNow
                });
            }

            _logger.LogInformation("Successfully fetched {Count} forecast data points from OpenWeatherMap", weatherSlices.Count);
            return weatherSlices;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching forecast from OpenWeatherMap for lat={Latitude}, lon={Longitude}",
                latitude, longitude);
            return Array.Empty<WeatherSlice>();
        }
    }

    /// <inheritdoc />
    public async Task<bool> IsAvailableAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var client = _httpClientFactory.CreateClient(HttpClientName);
            client.Timeout = TimeSpan.FromSeconds(5);

            // Test with Gothenburg coordinates
            var url = $"{ApiBaseUrl}/weather?lat=57.7089&lon=11.9746&appid={_apiKey}";
            var response = await client.GetAsync(url, cancellationToken);

            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OpenWeatherMap availability check failed");
            return false;
        }
    }

    #region DTOs for OpenWeatherMap API Response

    private class OpenWeatherMapCurrentResponse
    {
        public OWMMain? Main { get; set; }
        public OWMClouds? Clouds { get; set; }
        public OWMRain? Rain { get; set; }
        public OWMSnow? Snow { get; set; }
        public long? Visibility { get; set; }
    }

    private class OpenWeatherMapForecastResponse
    {
        public List<OWMForecastItem>? List { get; set; }
    }

    private class OWMForecastItem
    {
        public long Dt { get; set; }
        public OWMMain? Main { get; set; }
        public OWMClouds? Clouds { get; set; }
        public double? Pop { get; set; } // Probability of precipitation
        public long? Visibility { get; set; }
    }

    private class OWMMain
    {
        public double? Temp { get; set; }
    }

    private class OWMClouds
    {
        public double? All { get; set; }
    }

    private class OWMRain
    {
        public double? OneHour { get; set; }

        // JSON property mapping for "1h"
        public double? _1h { get; set; }
    }

    private class OWMSnow
    {
        public double? OneHour { get; set; }

        // JSON property mapping for "1h"
        public double? _1h { get; set; }
    }

    #endregion
}

/// <summary>
/// Configuration options for weather services
/// </summary>
public class WeatherOptions
{
    public const string SectionName = "Weather";

    public string OpenWeatherMapApiKey { get; set; } = string.Empty;
    public int UpdateIntervalMinutes { get; set; } = 10;
    public int DataRetentionDays { get; set; } = 7;
}
