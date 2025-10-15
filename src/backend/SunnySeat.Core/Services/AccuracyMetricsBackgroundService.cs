using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Core.Services;

/// <summary>
/// Background service for periodic calculation and caching of accuracy metrics
/// </summary>
public class AccuracyMetricsBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<AccuracyMetricsBackgroundService> _logger;
    private readonly IMemoryCache _cache;
    private readonly TimeSpan _updateInterval = TimeSpan.FromMinutes(15); // Update every 15 minutes
    private const string OverallMetricsCacheKey = "accuracy_metrics_overall";
    private const string ProblematicVenuesCacheKey = "accuracy_problematic_venues";
    private const string AlertStatusCacheKey = "accuracy_alert_status";

    public AccuracyMetricsBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<AccuracyMetricsBackgroundService> logger,
        IMemoryCache cache)
    {
        _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Accuracy Metrics Background Service starting with {IntervalMinutes} minute update interval",
            _updateInterval.TotalMinutes);

        // Initial delay to allow application startup
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CalculateAndCacheMetricsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in accuracy metrics calculation cycle");
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

        _logger.LogInformation("Accuracy Metrics Background Service stopping");
    }

    private async Task CalculateAndCacheMetricsAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var accuracyService = scope.ServiceProvider.GetRequiredService<IAccuracyTrackingService>();
        var alertingService = scope.ServiceProvider.GetRequiredService<IAlertingService>();
        var broadcaster = scope.ServiceProvider.GetService<IAccuracyMetricsBroadcaster>();

        try
        {
            _logger.LogDebug("Starting accuracy metrics calculation and caching");

            var startTime = DateTime.UtcNow;

            // Calculate 14-day rolling window
            var endDate = DateTime.UtcNow;
            var startDate = endDate.AddDays(-14);

            // Calculate and cache overall accuracy metrics
            var overallMetrics = await accuracyService.GetAccuracyMetricsAsync(startDate, endDate, null, cancellationToken);
            _cache.Set(OverallMetricsCacheKey, overallMetrics, TimeSpan.FromMinutes(20));
            _logger.LogDebug("Cached overall accuracy metrics: {AccuracyRate}% accuracy with {TotalFeedback} total feedback",
                overallMetrics.AccuracyRate, overallMetrics.TotalFeedback);

            // Broadcast metrics update via SignalR (if available)
            if (broadcaster != null)
            {
                await broadcaster.BroadcastAccuracyMetricsAsync(overallMetrics, cancellationToken);
            }

            // Calculate and cache problematic venues
            var problematicVenues = (await accuracyService.GetProblematicVenuesAsync(80.0, 10, cancellationToken)).ToList();
            _cache.Set(ProblematicVenuesCacheKey, problematicVenues, TimeSpan.FromMinutes(20));
            _logger.LogDebug("Cached {Count} problematic venues below 80% accuracy threshold",
                problematicVenues.Count);

            // Broadcast problematic venues update via SignalR (if available)
            if (broadcaster != null)
            {
                await broadcaster.BroadcastProblematicVenuesAsync(problematicVenues, cancellationToken);
            }

            // Send alerts for problematic venues
            foreach (var venue in problematicVenues)
            {
                await alertingService.SendProblematicVenueAlertAsync(
                    venue.VenueId,
                    venue.VenueName,
                    venue.AccuracyRate,
                    venue.FeedbackCount,
                    cancellationToken);
            }

            // Calculate and cache alert status
            var alertStatus = await accuracyService.CheckAccuracyAlertThresholdAsync(80.0, 3, cancellationToken);
            _cache.Set(AlertStatusCacheKey, alertStatus, TimeSpan.FromMinutes(20));

            // Broadcast alert status update via SignalR (if available)
            if (broadcaster != null)
            {
                await broadcaster.BroadcastAlertStatusAsync(alertStatus, cancellationToken);
            }

            if (alertStatus)
            {
                // Send accuracy degradation alert
                await alertingService.SendAccuracyDegradationAlertAsync(
                    overallMetrics.AccuracyRate,
                    80.0,
                    3,
                    cancellationToken);
            }

            var duration = DateTime.UtcNow - startTime;
            _logger.LogInformation("Accuracy metrics calculation completed in {DurationMs}ms",
                duration.TotalMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating and caching accuracy metrics");
        }
    }

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Accuracy Metrics Background Service is starting");
        await base.StartAsync(cancellationToken);
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Accuracy Metrics Background Service is stopping");
        await base.StopAsync(cancellationToken);
    }
}
