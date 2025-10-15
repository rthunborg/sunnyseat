using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SunnySeat.Core.Constants;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Core.Services;

/// <summary>
/// Background service for ingesting weather data from external APIs with fallback support
/// </summary>
public class WeatherIngestionService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<WeatherIngestionService> _logger;
    private readonly WeatherOptions _options;
    private readonly TimeSpan _updateInterval;
    private readonly TimeSpan _retentionPeriod;

    // Gothenburg coordinates for weather data
    private const double GothenburgLat = GothenburgCoordinates.Latitude;
    private const double GothenburgLon = GothenburgCoordinates.Longitude;

    public WeatherIngestionService(
        IServiceProvider serviceProvider,
        ILogger<WeatherIngestionService> logger,
        IOptions<WeatherOptions> options)
    {
        _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));

        _updateInterval = TimeSpan.FromMinutes(_options.UpdateIntervalMinutes);
        _retentionPeriod = TimeSpan.FromDays(_options.DataRetentionDays);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Weather Ingestion Service starting with {IntervalMinutes} minute update interval",
            _options.UpdateIntervalMinutes);

        // Initial delay to allow application startup
        await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await IngestWeatherDataAsync(stoppingToken);
                await CleanupOldWeatherDataAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in weather ingestion cycle");
            }

            try
            {
                await Task.Delay(_updateInterval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                // Expected when stopping
                break;
            }
        }

        _logger.LogInformation("Weather Ingestion Service stopping");
    }

    private async Task IngestWeatherDataAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();

        var metNoService = scope.ServiceProvider.GetRequiredService<MetNoWeatherService>();
        var openWeatherMapService = scope.ServiceProvider.GetRequiredService<OpenWeatherMapService>();
        var weatherRepository = scope.ServiceProvider.GetRequiredService<IWeatherRepository>();
        var weatherProcessingService = scope.ServiceProvider.GetRequiredService<IWeatherProcessingService>();

        var ingestionStartTime = DateTime.UtcNow;

        try
        {
            _logger.LogDebug("Starting weather data ingestion for Gothenburg (lat={Lat}, lon={Lon})",
                GothenburgLat, GothenburgLon);

            // Try primary source (Met.no) first
            var weatherData = await metNoService.GetForecastAsync(GothenburgLat, GothenburgLon, cancellationToken);

            if (weatherData.Count > 0)
            {
                _logger.LogInformation("Successfully fetched {Count} weather data points from Met.no (primary source)",
                    weatherData.Count);

                await weatherRepository.AddWeatherDataBatchAsync(weatherData, cancellationToken);

                // Process weather data immediately after ingestion
                await ProcessIngestedWeatherAsync(weatherData, weatherProcessingService, ingestionStartTime, cancellationToken);
                return;
            }

            // Fallback to OpenWeatherMap if primary source failed
            _logger.LogWarning("Primary source (Met.no) returned no data, falling back to OpenWeatherMap");

            weatherData = await openWeatherMapService.GetForecastAsync(GothenburgLat, GothenburgLon, cancellationToken);

            if (weatherData.Count > 0)
            {
                _logger.LogInformation("Successfully fetched {Count} weather data points from OpenWeatherMap (fallback source)",
                    weatherData.Count);

                await weatherRepository.AddWeatherDataBatchAsync(weatherData, cancellationToken);

                // Process weather data immediately after ingestion
                await ProcessIngestedWeatherAsync(weatherData, weatherProcessingService, ingestionStartTime, cancellationToken);
            }
            else
            {
                _logger.LogError("Both weather sources failed to provide data");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ingesting weather data");
        }
    }

    private async Task ProcessIngestedWeatherAsync(
        IReadOnlyList<SunnySeat.Core.Entities.WeatherSlice> weatherData,
        IWeatherProcessingService processingService,
        DateTime ingestionStartTime,
        CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogDebug("Starting weather data processing for {Count} weather slices", weatherData.Count);

            var processingStartTime = DateTime.UtcNow;

            // Process weather data in batch
            var processedData = await processingService.ProcessWeatherDataBatchAsync(
                weatherData,
                null, // No specific location - processing for general area
                cancellationToken);

            var processingDuration = DateTime.UtcNow - processingStartTime;
            var totalLatency = DateTime.UtcNow - ingestionStartTime;

            _logger.LogInformation(
                "Weather processing completed: {Count} slices processed in {ProcessingMs}ms (total latency: {LatencyMs}ms)",
                processedData.Count,
                processingDuration.TotalMilliseconds,
                totalLatency.TotalMilliseconds);

            // Alert if processing exceeds 30 second requirement
            if (totalLatency.TotalSeconds > 30)
            {
                _logger.LogWarning(
                    "Weather processing latency ({LatencySec}s) exceeded 30 second requirement!",
                    totalLatency.TotalSeconds);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing ingested weather data");
        }
    }

    private async Task CleanupOldWeatherDataAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var weatherRepository = scope.ServiceProvider.GetRequiredService<IWeatherRepository>();

            var cutoffDate = DateTime.UtcNow.Subtract(_retentionPeriod);

            _logger.LogDebug("Cleaning up weather data older than {CutoffDate}", cutoffDate);

            await weatherRepository.DeleteOldWeatherDataAsync(cutoffDate, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cleaning up old weather data");
        }
    }

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Weather Ingestion Service is starting");
        await base.StartAsync(cancellationToken);
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Weather Ingestion Service is stopping");
        await base.StopAsync(cancellationToken);
    }
}
