using Microsoft.AspNetCore.SignalR;
using SunnySeat.Api.Hubs;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Models.Responses;

namespace SunnySeat.Api.Services;

/// <summary>
/// SignalR implementation of accuracy metrics broadcaster
/// </summary>
public class SignalRAccuracyMetricsBroadcaster : IAccuracyMetricsBroadcaster
{
    private readonly IHubContext<AccuracyMetricsHub> _hubContext;
    private readonly ILogger<SignalRAccuracyMetricsBroadcaster> _logger;

    public SignalRAccuracyMetricsBroadcaster(
        IHubContext<AccuracyMetricsHub> hubContext,
        ILogger<SignalRAccuracyMetricsBroadcaster> logger)
    {
        _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public async Task BroadcastAccuracyMetricsAsync(AccuracyMetricsResponse metrics, CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients.All.SendAsync("AccuracyMetricsUpdated", metrics, cancellationToken);
            _logger.LogDebug("Broadcasted accuracy metrics update: {AccuracyRate}% with {TotalFeedback} feedback",
                metrics.AccuracyRate, metrics.TotalFeedback);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error broadcasting accuracy metrics update");
        }
    }

    /// <inheritdoc />
    public async Task BroadcastProblematicVenuesAsync(IEnumerable<ProblematicVenueResponse> venues, CancellationToken cancellationToken = default)
    {
        try
        {
            var venueList = venues.ToList();
            await _hubContext.Clients.All.SendAsync("ProblematicVenuesUpdated", venueList, cancellationToken);
            _logger.LogDebug("Broadcasted problematic venues update: {Count} venues", venueList.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error broadcasting problematic venues update");
        }
    }

    /// <inheritdoc />
    public async Task BroadcastAlertStatusAsync(bool isAlertActive, CancellationToken cancellationToken = default)
    {
        try
        {
            await _hubContext.Clients.All.SendAsync("AlertStatusUpdated", isAlertActive, cancellationToken);
            _logger.LogDebug("Broadcasted alert status update: {IsActive}", isAlertActive);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error broadcasting alert status update");
        }
    }
}
