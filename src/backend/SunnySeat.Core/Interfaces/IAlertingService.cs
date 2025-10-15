namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Service interface for sending alerts and notifications to administrators
/// </summary>
public interface IAlertingService
{
    /// <summary>
    /// Send an accuracy degradation alert to administrators
    /// </summary>
    /// <param name="accuracyRate">The current accuracy rate percentage</param>
    /// <param name="threshold">The threshold that was breached</param>
    /// <param name="consecutiveDays">Number of consecutive days below threshold</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SendAccuracyDegradationAlertAsync(double accuracyRate, double threshold, int consecutiveDays, CancellationToken cancellationToken = default);

    /// <summary>
    /// Send alert about a problematic venue
    /// </summary>
    /// <param name="venueId">The venue ID</param>
    /// <param name="venueName">The venue name</param>
    /// <param name="accuracyRate">The venue's accuracy rate</param>
    /// <param name="feedbackCount">Number of feedback responses for this venue</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SendProblematicVenueAlertAsync(int venueId, string venueName, double accuracyRate, int feedbackCount, CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if an alert should be suppressed (to prevent spam)
    /// </summary>
    /// <param name="alertKey">Unique key identifying the type of alert</param>
    /// <param name="suppressionWindowHours">How many hours to suppress duplicate alerts</param>
    /// <returns>True if alert should be suppressed, false otherwise</returns>
    Task<bool> ShouldSuppressAlertAsync(string alertKey, int suppressionWindowHours = 24);
}
