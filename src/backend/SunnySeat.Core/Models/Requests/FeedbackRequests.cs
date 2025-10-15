using System.ComponentModel.DataAnnotations;

namespace SunnySeat.Core.Models.Requests;

/// <summary>
/// Request for submitting user feedback on sun prediction accuracy
/// </summary>
public class SubmitFeedbackRequest
{
    /// <summary>
    /// ID of the patio the feedback is about
    /// </summary>
    [Required]
    public int PatioId { get; set; }

    /// <summary>
    /// When the user observed the conditions (UTC)
    /// </summary>
    [Required]
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// Whether it was actually sunny (true) or not (false)
    /// </summary>
    [Required]
    public bool WasSunny { get; set; }

    /// <summary>
    /// Optional: The predicted sun exposure percentage shown to the user
    /// </summary>
    [Range(0, 100)]
    public double? PredictedSunExposure { get; set; }

    /// <summary>
    /// Optional: The confidence level shown to the user
    /// </summary>
    [Range(0, 100)]
    public double? PredictedConfidence { get; set; }
}

/// <summary>
/// Request for querying feedback data with filters
/// </summary>
public class QueryFeedbackRequest
{
    /// <summary>
    /// Filter by venue ID (optional)
    /// </summary>
    public int? VenueId { get; set; }

    /// <summary>
    /// Filter by patio ID (optional)
    /// </summary>
    public int? PatioId { get; set; }

    /// <summary>
    /// Start date for filtering feedback (UTC)
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// End date for filtering feedback (UTC)
    /// </summary>
    public DateTime? EndDate { get; set; }

    /// <summary>
    /// Number of results to return (default: 100)
    /// </summary>
    [Range(1, 1000)]
    public int Limit { get; set; } = 100;

    /// <summary>
    /// Number of results to skip for pagination
    /// </summary>
    [Range(0, int.MaxValue)]
    public int Offset { get; set; } = 0;
}
