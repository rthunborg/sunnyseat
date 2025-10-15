using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Core.Services;

/// <summary>
/// Weather service implementation for Met.no (Yr.no) API
/// Primary weather data source for SunnySeat
/// </summary>
public class MetNoWeatherService : IWeatherService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<MetNoWeatherService> _logger;
    private const string ApiBaseUrl = "https://api.met.no/weatherapi";
    private const string UserAgent = "SunnySeat/1.0 github.com/sunnyseat/app";
    private const string HttpClientName = "MetNo";

    public string SourceName => "met.no";

    public MetNoWeatherService(
        IHttpClientFactory httpClientFactory,
        ILogger<MetNoWeatherService> logger)
    {
        _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public async Task<WeatherSlice?> GetCurrentWeatherAsync(
        double latitude,
        double longitude,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var forecast = await GetForecastAsync(latitude, longitude, cancellationToken);
            return forecast.FirstOrDefault();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch current weather from Met.no for lat={Latitude}, lon={Longitude}",
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

            var url = $"{ApiBaseUrl}/locationforecast/2.0/compact?lat={latitude:F4}&lon={longitude:F4}";

            _logger.LogDebug("Fetching Met.no forecast from {Url}", url);

            var response = await client.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Met.no API returned {StatusCode} for lat={Latitude}, lon={Longitude}",
                    response.StatusCode, latitude, longitude);
                return Array.Empty<WeatherSlice>();
            }

            var data = await response.Content.ReadFromJsonAsync<MetNoForecastResponse>(cancellationToken: cancellationToken);

            if (data?.Properties?.Timeseries == null || data.Properties.Timeseries.Count == 0)
            {
                _logger.LogWarning("Met.no returned empty timeseries data");
                return Array.Empty<WeatherSlice>();
            }

            var weatherSlices = new List<WeatherSlice>();
            var now = DateTime.UtcNow;

            foreach (var timeseries in data.Properties.Timeseries.Take(48)) // Next 48 hours
            {
                var instant = timeseries.Data?.Instant?.Details;
                if (instant == null) continue;

                var isForecast = timeseries.Time > now.AddMinutes(30);

                weatherSlices.Add(new WeatherSlice
                {
                    Timestamp = timeseries.Time,
                    CloudCover = instant.CloudAreaFraction ?? 0,
                    Temperature = instant.AirTemperature ?? 0,
                    Visibility = instant.FogAreaFraction.HasValue
                        ? (100 - instant.FogAreaFraction.Value) / 10.0  // Convert fog to visibility estimate
                        : null,
                    PrecipitationProbability = timeseries.Data?.Next1Hours?.Details?.PrecipitationAmount > 0 ? 0.5 : 0,
                    IsForecast = isForecast,
                    Source = SourceName,
                    CreatedAt = DateTime.UtcNow
                });
            }

            _logger.LogInformation("Successfully fetched {Count} weather data points from Met.no", weatherSlices.Count);
            return weatherSlices;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching forecast from Met.no for lat={Latitude}, lon={Longitude}",
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
            var url = $"{ApiBaseUrl}/locationforecast/2.0/compact?lat=57.7089&lon=11.9746";
            var response = await client.GetAsync(url, cancellationToken);

            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Met.no availability check failed");
            return false;
        }
    }

    #region DTOs for Met.no API Response

    private class MetNoForecastResponse
    {
        public MetNoProperties? Properties { get; set; }
    }

    private class MetNoProperties
    {
        public List<MetNoTimeseries>? Timeseries { get; set; }
    }

    private class MetNoTimeseries
    {
        public DateTime Time { get; set; }
        public MetNoData? Data { get; set; }
    }

    private class MetNoData
    {
        public MetNoInstant? Instant { get; set; }
        public MetNoNext1Hours? Next_1_hours { get; set; }

        public MetNoNext1Hours? Next1Hours => Next_1_hours;
    }

    private class MetNoInstant
    {
        public MetNoInstantDetails? Details { get; set; }
    }

    private class MetNoInstantDetails
    {
        public double? Air_temperature { get; set; }
        public double? Cloud_area_fraction { get; set; }
        public double? Fog_area_fraction { get; set; }

        public double? AirTemperature => Air_temperature;
        public double? CloudAreaFraction => Cloud_area_fraction;
        public double? FogAreaFraction => Fog_area_fraction;
    }

    private class MetNoNext1Hours
    {
        public MetNoNext1HoursDetails? Details { get; set; }
    }

    private class MetNoNext1HoursDetails
    {
        public double? Precipitation_amount { get; set; }

        public double? PrecipitationAmount => Precipitation_amount;
    }

    #endregion
}
