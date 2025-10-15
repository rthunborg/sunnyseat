using SunnySeat.Core.Entities;
using SunnySeat.Core.Models.Requests;
using SunnySeat.Core.Models.Responses;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Service interface for accuracy tracking and feedback operations
/// </summary>
public interface IAccuracyTrackingService
{
    // Feedback submission
    Task<FeedbackResponse> SubmitFeedbackAsync(SubmitFeedbackRequest request, string ipAddress, CancellationToken cancellationToken = default);
    Task<bool> ValidateFeedbackSubmissionAsync(int patioId, DateTime timestamp, string ipAddress, CancellationToken cancellationToken = default);

    // Feedback retrieval
    Task<IEnumerable<FeedbackResponse>> GetFeedbackAsync(QueryFeedbackRequest request, CancellationToken cancellationToken = default);
    Task<FeedbackResponse?> GetFeedbackByIdAsync(int id, CancellationToken cancellationToken = default);

    // Accuracy metrics
    Task<AccuracyMetricsResponse> GetAccuracyMetricsAsync(DateTime startDate, DateTime endDate, int? venueId = null, CancellationToken cancellationToken = default);
    Task<IEnumerable<AccuracyTrendResponse>> GetAccuracyTrendAsync(DateTime startDate, DateTime endDate, int? venueId = null, CancellationToken cancellationToken = default);

    // Problematic venues identification
    Task<IEnumerable<ProblematicVenueResponse>> GetProblematicVenuesAsync(double thresholdAccuracy = 80.0, int minFeedbackCount = 10, CancellationToken cancellationToken = default);

    // Alerts and monitoring
    Task<bool> CheckAccuracyAlertThresholdAsync(double thresholdAccuracy = 80.0, int consecutiveDays = 3, CancellationToken cancellationToken = default);
}
