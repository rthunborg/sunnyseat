using System.ComponentModel.DataAnnotations;
using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Models.Responses;

/// <summary>
/// Response for a single feedback entry
/// </summary>
public class FeedbackResponse
{
    /// <summary>
    /// Feedback identifier
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Patio identifier
    /// </summary>
    public int PatioId { get; set; }

    /// <summary>
    /// Patio name
    /// </summary>
    public string PatioName { get; set; } = "";

    /// <summary>
    /// Venue identifier
    /// </summary>
    public int VenueId { get; set; }

    /// <summary>
    /// Venue name
    /// </summary>
    public string VenueName { get; set; } = "";

    /// <summary>
    /// When the user observed the conditions
    /// </summary>
    public DateTime UserTimestamp { get; set; }

    /// <summary>
    /// What the system predicted (sunny, partial, shaded)
    /// </summary>
    public string PredictedState { get; set; } = "";

    /// <summary>
    /// Confidence level at prediction time
    /// </summary>
    public double ConfidenceAtPrediction { get; set; }

    /// <summary>
    /// Whether user confirmed it was sunny
    /// </summary>
    public bool WasSunny { get; set; }

    /// <summary>
    /// Whether the prediction was correct
    /// </summary>
    public bool WasAccurate { get; set; }

    /// <summary>
    /// When the feedback was submitted
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Convert from Feedback entity
    /// </summary>
    public static FeedbackResponse FromFeedback(Feedback feedback)
    {
        return new FeedbackResponse
        {
            Id = feedback.Id,
            PatioId = feedback.PatioId,
            PatioName = feedback.Patio?.Name ?? "",
            VenueId = feedback.VenueId,
            VenueName = feedback.Venue?.Name ?? "",
            UserTimestamp = feedback.UserTimestamp,
            PredictedState = feedback.PredictedState,
            ConfidenceAtPrediction = feedback.ConfidenceAtPrediction,
            WasSunny = feedback.WasSunny,
            WasAccurate = (feedback.PredictedState == "sunny" && feedback.WasSunny) ||
                         (feedback.PredictedState != "sunny" && !feedback.WasSunny),
            CreatedAt = feedback.CreatedAt
        };
    }
}

/// <summary>
/// Response for accuracy metrics
/// </summary>
public class AccuracyMetricsResponse
{
    /// <summary>
    /// Start date of the metrics period
    /// </summary>
    public DateTime StartDate { get; set; }

    /// <summary>
    /// End date of the metrics period
    /// </summary>
    public DateTime EndDate { get; set; }

    /// <summary>
    /// Total number of feedback entries
    /// </summary>
    public int TotalFeedback { get; set; }

    /// <summary>
    /// Number of correct predictions
    /// </summary>
    public int CorrectPredictions { get; set; }

    /// <summary>
    /// Accuracy rate as a percentage (0-100)
    /// </summary>
    public double AccuracyRate { get; set; }

    /// <summary>
    /// Optional: Venue ID if metrics are venue-specific
    /// </summary>
    public int? VenueId { get; set; }

    /// <summary>
    /// Optional: Venue name if metrics are venue-specific
    /// </summary>
    public string? VenueName { get; set; }
}

/// <summary>
/// Response for accuracy trend data
/// </summary>
public class AccuracyTrendResponse
{
    /// <summary>
    /// Date for this data point
    /// </summary>
    public DateTime Date { get; set; }

    /// <summary>
    /// Accuracy rate for this period
    /// </summary>
    public double AccuracyRate { get; set; }

    /// <summary>
    /// Number of feedback entries for this period
    /// </summary>
    public int FeedbackCount { get; set; }
}

/// <summary>
/// Response for problematic venue identification
/// </summary>
public class ProblematicVenueResponse
{
    /// <summary>
    /// Venue identifier
    /// </summary>
    public int VenueId { get; set; }

    /// <summary>
    /// Venue name
    /// </summary>
    public string VenueName { get; set; } = "";

    /// <summary>
    /// Accuracy rate for this venue (0-100)
    /// </summary>
    public double AccuracyRate { get; set; }

    /// <summary>
    /// Total feedback count for this venue
    /// </summary>
    public int FeedbackCount { get; set; }

    /// <summary>
    /// Number of days the venue has been below threshold
    /// </summary>
    public int DaysBelowThreshold { get; set; }
}

