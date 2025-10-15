namespace SunnySeat.Core.Entities;

/// <summary>
/// Shadow information for a patio over a time period
/// </summary>
public class ShadowTimeline
{
    /// <summary>
    /// ID of the patio
    /// </summary>
    public int PatioId { get; set; }

    /// <summary>
    /// Start time of timeline (UTC)
    /// </summary>
    public DateTime StartTime { get; set; }

    /// <summary>
    /// End time of timeline (UTC)
    /// </summary>
    public DateTime EndTime { get; set; }

    /// <summary>
    /// Time interval between data points
    /// </summary>
    public TimeSpan Interval { get; set; }

    /// <summary>
    /// Shadow data points over time
    /// </summary>
    public IEnumerable<ShadowTimelinePoint> Points { get; set; } = [];

    /// <summary>
    /// Average confidence across all timeline points
    /// </summary>
    public double AverageConfidence { get; set; }
}

/// <summary>
/// Single point in shadow timeline
/// </summary>
public class ShadowTimelinePoint
{
    /// <summary>
    /// Timestamp for this data point (UTC)
    /// </summary>
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// Percentage of patio area in shadow (0-100)
    /// </summary>
    public double ShadowedAreaPercent { get; set; }

    /// <summary>
    /// Percentage of patio area in sunlight (0-100)
    /// </summary>
    public double SunlitAreaPercent { get; set; }

    /// <summary>
    /// Confidence of this calculation (0.0 to 1.0)
    /// </summary>
    public double Confidence { get; set; }

    /// <summary>
    /// Whether sun is visible at this time
    /// </summary>
    public bool IsSunVisible { get; set; }
}