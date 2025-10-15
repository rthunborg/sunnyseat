namespace SunnySeat.Core.Entities;

/// <summary>
/// Represents user feedback on sun prediction accuracy
/// </summary>
public class Feedback
{
    public int Id { get; set; }

    /// <summary>
    /// Reference to the patio the feedback is about
    /// </summary>
    public int PatioId { get; set; }
    public Patio Patio { get; set; } = null!;

    /// <summary>
    /// Reference to the venue (for easier querying)
    /// </summary>
    public int VenueId { get; set; }
    public Venue Venue { get; set; } = null!;

    /// <summary>
    /// When the user observed the conditions
    /// </summary>
    public DateTime UserTimestamp { get; set; }

    /// <summary>
    /// What our system predicted at the time
    /// </summary>
    public string PredictedState { get; set; } = string.Empty; // "sunny", "partial", "shaded"

    /// <summary>
    /// Confidence level our system had at prediction time
    /// </summary>
    public double ConfidenceAtPrediction { get; set; }

    /// <summary>
    /// Whether the user confirmed it was sunny (true) or not (false)
    /// </summary>
    public bool WasSunny { get; set; }

    /// <summary>
    /// Timestamp rounded to 5-minute bins for analysis
    /// </summary>
    public DateTime BinnedTimestamp { get; set; }

    /// <summary>
    /// IP address of the user submitting feedback (for spam prevention)
    /// </summary>
    public string IpAddress { get; set; } = string.Empty;

    /// <summary>
    /// Timestamp when this feedback was submitted
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}