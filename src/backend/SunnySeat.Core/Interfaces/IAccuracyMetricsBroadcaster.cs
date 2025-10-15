using SunnySeat.Core.Models.Responses;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Interface for broadcasting accuracy metrics updates to connected clients
/// </summary>
public interface IAccuracyMetricsBroadcaster
{
    /// <summary>
    /// Broadcasts overall accuracy metrics update to all connected clients
    /// </summary>
    Task BroadcastAccuracyMetricsAsync(AccuracyMetricsResponse metrics, CancellationToken cancellationToken = default);

    /// <summary>
    /// Broadcasts problematic venues update to all connected clients
    /// </summary>
    Task BroadcastProblematicVenuesAsync(IEnumerable<ProblematicVenueResponse> venues, CancellationToken cancellationToken = default);

    /// <summary>
    /// Broadcasts accuracy alert status update to all connected clients
    /// </summary>
    Task BroadcastAlertStatusAsync(bool isAlertActive, CancellationToken cancellationToken = default);
}
