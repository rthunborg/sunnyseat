using Microsoft.Extensions.Logging;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Core.Services;

/// <summary>
/// Service for processing raw weather data into sun-relevant conditions
/// Implements cloud cover normalization, precipitation analysis, and weather categorization
/// </summary>
public class WeatherProcessingService : IWeatherProcessingService
{
    private readonly ILogger<WeatherProcessingService> _logger;
    private readonly IWeatherRepository _weatherRepository;

    // Weather thresholds for sun prediction
    private const double ClearSkyThreshold = 20.0;
    private const double CloudyThreshold = 70.0;
    private const double OvercastThreshold = 80.0;
    private const double SunBlockingCloudThreshold = 80.0;
    private const double PrecipitationProbabilityThreshold = 0.20; // 20%
    private const double PrecipitationIntensityThreshold = 0.1; // mm/hour
    private const double LowVisibilityThreshold = 5.0; // km

    public WeatherProcessingService(
        ILogger<WeatherProcessingService> logger,
        IWeatherRepository weatherRepository)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _weatherRepository = weatherRepository ?? throw new ArgumentNullException(nameof(weatherRepository));
    }

    /// <inheritdoc />
    public async Task<ProcessedWeather> ProcessWeatherDataAsync(
        WeatherSlice weatherSlice,
        Point? location = null,
        CancellationToken cancellationToken = default)
    {
        if (weatherSlice == null)
            throw new ArgumentNullException(nameof(weatherSlice));

        _logger.LogDebug("Processing weather data for timestamp {Timestamp} from source {Source}",
            weatherSlice.Timestamp, weatherSlice.Source);

        // Normalize cloud cover to 0-100 scale
        var normalizedCloudCover = NormalizeCloudCover(weatherSlice.CloudCover, weatherSlice.Source);

        // Calculate precipitation intensity from probability
        var precipitationIntensity = CalculatePrecipitationIntensity(weatherSlice.PrecipitationProbability);

        // Categorize weather condition
        var condition = CategorizeWeatherCondition(
            normalizedCloudCover,
            precipitationIntensity,
            weatherSlice.Visibility);

        // Determine if conditions block sun
        var isSunBlocking = IsSunBlockingCondition(
            normalizedCloudCover,
            precipitationIntensity,
            weatherSlice.Visibility);

        // Calculate confidence level based on data source and type
        var confidenceLevel = CalculateConfidenceLevel(weatherSlice);

        var processedWeather = new ProcessedWeather
        {
            WeatherSliceId = weatherSlice.Id,
            WeatherSlice = weatherSlice,
            Timestamp = weatherSlice.Timestamp,
            NormalizedCloudCover = normalizedCloudCover,
            PrecipitationIntensity = precipitationIntensity,
            Condition = condition,
            IsSunBlocking = isSunBlocking,
            ConfidenceLevel = confidenceLevel,
            Location = location,
            ProcessedAt = DateTime.UtcNow
        };

        _logger.LogDebug("Processed weather: {Condition}, CloudCover={CloudCover}%, SunBlocking={SunBlocking}",
            condition, normalizedCloudCover, isSunBlocking);

        return await Task.FromResult(processedWeather);
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<ProcessedWeather>> ProcessWeatherDataBatchAsync(
        IEnumerable<WeatherSlice> weatherSlices,
        Point? location = null,
        CancellationToken cancellationToken = default)
    {
        if (weatherSlices == null)
            throw new ArgumentNullException(nameof(weatherSlices));

        var slicesList = weatherSlices.ToList();
        _logger.LogInformation("Processing batch of {Count} weather slices", slicesList.Count);

        var tasks = slicesList.Select(slice => ProcessWeatherDataAsync(slice, location, cancellationToken));
        var results = await Task.WhenAll(tasks);

        _logger.LogInformation("Successfully processed {Count} weather slices", results.Length);
        return results.ToList();
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<ProcessedWeather>> GetProcessedWeatherForPatioAsync(
        Point location,
        DateTime startTime,
        DateTime endTime,
        CancellationToken cancellationToken = default)
    {
        if (location == null)
            throw new ArgumentNullException(nameof(location));

        _logger.LogDebug("Getting processed weather for patio at ({Lat}, {Lon}) from {Start} to {End}",
            location.Y, location.X, startTime, endTime);

        // Get raw weather data from repository
        var rawWeatherData = await _weatherRepository.GetForecastDataAsync(startTime, endTime, cancellationToken);

        if (rawWeatherData.Count == 0)
        {
            _logger.LogWarning("No weather data available for time range {Start} to {End}", startTime, endTime);
            return Array.Empty<ProcessedWeather>();
        }

        // Process each weather slice with spatial estimation
        // For now, we use the same weather data for all locations in Gothenburg
        // Future enhancement: implement actual spatial interpolation
        var processedData = await ProcessWeatherDataBatchAsync(rawWeatherData, location, cancellationToken);

        return processedData;
    }

    #region Private Helper Methods

    /// <summary>
    /// Normalizes cloud cover percentage to 0-100 scale regardless of source
    /// </summary>
    private double NormalizeCloudCover(double cloudCover, string source)
    {
        // Met.no and OpenWeatherMap both provide 0-100 scale
        // Ensure value is clamped to valid range
        var normalized = Math.Max(0, Math.Min(100, cloudCover));

        _logger.LogTrace("Normalized cloud cover from {Source}: {Original} -> {Normalized}",
            source, cloudCover, normalized);

        return normalized;
    }

    /// <summary>
    /// Calculates precipitation intensity from probability
    /// </summary>
    private double CalculatePrecipitationIntensity(double precipitationProbability)
    {
        // Simple heuristic: assume moderate intensity when probability is high
        // This is a simplification; actual APIs may provide intensity directly
        if (precipitationProbability >= 0.7)
            return 2.0; // Heavy rain
        if (precipitationProbability >= 0.4)
            return 0.5; // Moderate rain
        if (precipitationProbability >= 0.2)
            return 0.1; // Light rain

        return 0.0; // No precipitation
    }

    /// <summary>
    /// Categorizes weather condition based on cloud cover, precipitation, and visibility
    /// </summary>
    private WeatherCondition CategorizeWeatherCondition(
        double cloudCover,
        double precipitationIntensity,
        double? visibility)
    {
        // Check for precipitation first
        if (precipitationIntensity > PrecipitationIntensityThreshold)
            return WeatherCondition.Precipitation;

        // Check for low visibility
        if (visibility.HasValue && visibility.Value < LowVisibilityThreshold)
            return WeatherCondition.LowVisibility;

        // Categorize by cloud cover
        if (cloudCover >= OvercastThreshold)
            return WeatherCondition.Overcast;
        if (cloudCover >= CloudyThreshold)
            return WeatherCondition.Cloudy;
        if (cloudCover >= ClearSkyThreshold)
            return WeatherCondition.PartlyCloudy;

        return WeatherCondition.Clear;
    }

    /// <summary>
    /// Determines if weather conditions block sun exposure
    /// </summary>
    private bool IsSunBlockingCondition(
        double cloudCover,
        double precipitationIntensity,
        double? visibility)
    {
        // Precipitation blocks sun
        if (precipitationIntensity > PrecipitationIntensityThreshold)
            return true;

        // Heavy cloud cover blocks sun
        if (cloudCover > SunBlockingCloudThreshold)
            return true;

        // Low visibility blocks sun
        if (visibility.HasValue && visibility.Value < LowVisibilityThreshold)
            return true;

        return false;
    }

    /// <summary>
    /// Calculates confidence level based on data source and forecast type
    /// </summary>
    private double CalculateConfidenceLevel(WeatherSlice weatherSlice)
    {
        // Base confidence depends on whether it's forecast or nowcast
        var baseConfidence = weatherSlice.IsForecast ? 0.7 : 0.9;

        // Met.no is considered more reliable for Nordic regions
        var sourceBonus = weatherSlice.Source.Contains("met.no", StringComparison.OrdinalIgnoreCase) ? 0.05 : 0.0;

        // Adjust confidence based on forecast horizon
        if (weatherSlice.IsForecast)
        {
            var hoursAhead = (weatherSlice.Timestamp - DateTime.UtcNow).TotalHours;
            if (hoursAhead > 24)
                baseConfidence -= 0.1; // Reduce confidence for long-range forecasts
            if (hoursAhead > 48)
                baseConfidence -= 0.1; // Further reduce for very long-range
        }

        return Math.Max(0.5, Math.Min(1.0, baseConfidence + sourceBonus));
    }

    #endregion
}
