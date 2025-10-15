using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Core.Services;

/// <summary>
/// Service implementation for sending alerts and notifications
/// Currently uses logging - can be extended for email/Slack integration
/// </summary>
public class AlertingService : IAlertingService
{
    private readonly ILogger<AlertingService> _logger;
    private readonly IMemoryCache _cache;
    private const string AlertSuppressionKeyPrefix = "alert_suppression_";

    public AlertingService(ILogger<AlertingService> logger, IMemoryCache cache)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
    }

    public async Task SendAccuracyDegradationAlertAsync(
        double accuracyRate,
        double threshold,
        int consecutiveDays,
        CancellationToken cancellationToken = default)
    {
        var alertKey = $"accuracy_degradation_{threshold}_{consecutiveDays}";

        // Check if we should suppress this alert
        if (await ShouldSuppressAlertAsync(alertKey, suppressionWindowHours: 6))
        {
            _logger.LogDebug("Suppressing duplicate accuracy degradation alert for key: {AlertKey}", alertKey);
            return;
        }

        // Log critical alert (would send email/Slack notification in production)
        _logger.LogCritical(
            "🚨 ACCURACY ALERT: System accuracy has fallen to {AccuracyRate}% (threshold: {Threshold}%) for {ConsecutiveDays} consecutive days!",
            accuracyRate,
            threshold,
            consecutiveDays);

        // TODO: Send email notification to administrators
        // TODO: Send Slack notification to monitoring channel
        // Example integration points:
        // - await _emailService.SendEmailAsync(adminEmails, subject, body);
        // - await _slackService.PostMessageAsync(monitoringChannel, message);

        // Mark alert as sent to prevent spam
        _cache.Set($"{AlertSuppressionKeyPrefix}{alertKey}", true, TimeSpan.FromHours(6));

        await Task.CompletedTask;
    }

    public async Task SendProblematicVenueAlertAsync(
        int venueId,
        string venueName,
        double accuracyRate,
        int feedbackCount,
        CancellationToken cancellationToken = default)
    {
        var alertKey = $"problematic_venue_{venueId}";

        // Check if we should suppress this alert
        if (await ShouldSuppressAlertAsync(alertKey, suppressionWindowHours: 24))
        {
            _logger.LogDebug("Suppressing duplicate problematic venue alert for venue: {VenueId}", venueId);
            return;
        }

        // Log warning alert (would send notification in production)
        _logger.LogWarning(
            "⚠️  VENUE ALERT: Venue '{VenueName}' (ID: {VenueId}) has low accuracy: {AccuracyRate}% based on {FeedbackCount} feedback responses",
            venueName,
            venueId,
            accuracyRate,
            feedbackCount);

        // TODO: Send email notification to venue managers
        // TODO: Send Slack notification for problematic venue tracking

        // Mark alert as sent to prevent spam
        _cache.Set($"{AlertSuppressionKeyPrefix}{alertKey}", true, TimeSpan.FromHours(24));

        await Task.CompletedTask;
    }

    public Task<bool> ShouldSuppressAlertAsync(string alertKey, int suppressionWindowHours = 24)
    {
        var cacheKey = $"{AlertSuppressionKeyPrefix}{alertKey}";
        var isSuppressed = _cache.TryGetValue(cacheKey, out _);
        return Task.FromResult(isSuppressed);
    }
}
