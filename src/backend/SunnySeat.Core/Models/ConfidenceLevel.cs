namespace SunnySeat.Core.Models;

/// <summary>
/// Confidence level categories for sun exposure predictions
/// </summary>
public enum ConfidenceLevel
{
    /// <summary>
    /// Low confidence: Less than 40%
    /// Predictions may be unreliable, multiple quality issues present
    /// </summary>
    Low = 0,

    /// <summary>
    /// Medium confidence: 40-69%
    /// Predictions generally reliable, some quality limitations
    /// </summary>
    Medium = 1,

    /// <summary>
    /// High confidence: 70% or greater
    /// Predictions highly reliable, good data quality across all factors
    /// </summary>
    High = 2
}

/// <summary>
/// Confidence level display information
/// </summary>
public static class ConfidenceLevelExtensions
{
    /// <summary>
    /// Get display color for confidence level
    /// </summary>
    public static string GetBadgeColor(this ConfidenceLevel level)
    {
        return level switch
        {
            ConfidenceLevel.High => "#28a745",    // Green
            ConfidenceLevel.Medium => "#ffc107",  // Yellow
            ConfidenceLevel.Low => "#dc3545",     // Red
            _ => "#6c757d"                        // Gray (fallback)
        };
    }

    /// <summary>
    /// Get user-friendly explanation for confidence level
    /// </summary>
    public static string GetExplanation(this ConfidenceLevel level)
    {
        return level switch
        {
            ConfidenceLevel.High => "High reliability - Good data quality across building geometry, weather conditions, and sun calculations. Predictions are highly trustworthy.",
            ConfidenceLevel.Medium => "Moderate reliability - Some data quality limitations present. Predictions are generally reliable but consider checking conditions on-site.",
            ConfidenceLevel.Low => "Low reliability - Multiple quality issues affect prediction accuracy. Use these predictions as rough estimates only.",
            _ => "Unknown confidence level"
        };
    }

    /// <summary>
    /// Get short description for confidence level
    /// </summary>
    public static string GetShortDescription(this ConfidenceLevel level)
    {
        return level switch
        {
            ConfidenceLevel.High => "Highly Reliable (≥70%)",
            ConfidenceLevel.Medium => "Generally Reliable (40-69%)",
            ConfidenceLevel.Low => "Limited Reliability (<40%)",
            _ => "Unknown"
        };
    }

    /// <summary>
    /// Convert confidence percentage to confidence level enum
    /// </summary>
    public static ConfidenceLevel FromPercentage(double confidencePercent)
    {
        return confidencePercent switch
        {
            >= 70.0 => ConfidenceLevel.High,
            >= 40.0 => ConfidenceLevel.Medium,
            _ => ConfidenceLevel.Low
        };
    }

    /// <summary>
    /// Convert confidence score (0-1) to confidence level enum
    /// </summary>
    public static ConfidenceLevel FromScore(double confidenceScore)
    {
        return FromPercentage(confidenceScore * 100.0);
    }
}
