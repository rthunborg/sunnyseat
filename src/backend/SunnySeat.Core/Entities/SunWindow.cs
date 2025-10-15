namespace SunnySeat.Core.Entities;

/// <summary>
/// Represents a continuous period of sun exposure on a patio with enhanced timeline features
/// </summary>
public class SunWindow
{
    public int Id { get; set; }
    
    /// <summary>
    /// Reference to the patio this sun window belongs to
    /// </summary>
    public int PatioId { get; set; }
    public Patio? Patio { get; set; }
    
    /// <summary>
    /// Date this sun window applies to
    /// </summary>
    public DateOnly Date { get; set; }
    
    /// <summary>
    /// Start time of direct sun exposure (UTC)
    /// </summary>
    public DateTime StartTime { get; set; }
    
    /// <summary>
    /// End time of direct sun exposure (UTC)
    /// </summary>
    public DateTime EndTime { get; set; }
    
    /// <summary>
    /// Local start time (Stockholm timezone)
    /// </summary>
    public DateTime LocalStartTime { get; set; }
    
    /// <summary>
    /// Local end time (Stockholm timezone)
    /// </summary>
    public DateTime LocalEndTime { get; set; }
    
    /// <summary>
    /// Duration of the sun window
    /// </summary>
    public TimeSpan Duration => EndTime - StartTime;
    
    // Enhanced sun exposure characteristics
    /// <summary>
    /// Peak sun exposure percentage during this window (0-100)
    /// </summary>
    public double PeakExposure { get; set; }
    
    /// <summary>
    /// Minimum sun exposure percentage in this window
    /// </summary>
    public double MinExposurePercent { get; set; }
    
    /// <summary>
    /// Maximum sun exposure percentage in this window
    /// </summary>
    public double MaxExposurePercent { get; set; }
    
    /// <summary>
    /// Average sun exposure percentage in this window
    /// </summary>
    public double AverageExposurePercent { get; set; }
    
    /// <summary>
    /// Time when peak sun exposure occurs (UTC)
    /// </summary>
    public DateTime PeakExposureTime { get; set; }
    
    /// <summary>
    /// Local time when peak sun exposure occurs
    /// </summary>
    public DateTime LocalPeakExposureTime { get; set; }
    
    // Window quality assessment
    /// <summary>
    /// Overall quality rating for this sun window
    /// </summary>
    public SunWindowQuality Quality { get; set; }
    
    /// <summary>
    /// Confidence level for this calculation (0-100)
    /// </summary>
    public double Confidence { get; set; }
    
    /// <summary>
    /// Human-readable description of the window
    /// </summary>
    public string Description { get; set; } = "";
    
    // User recommendations
    /// <summary>
    /// Whether this window is recommended for visiting
    /// </summary>
    public bool IsRecommended { get; set; }
    
    /// <summary>
    /// Reason why this window is or is not recommended
    /// </summary>
    public string RecommendationReason { get; set; } = "";
    
    /// <summary>
    /// Priority score for this window (higher = better)
    /// </summary>
    public double PriorityScore { get; set; }
    
    /// <summary>
    /// Number of data points used to create this window
    /// </summary>
    public int DataPointCount { get; set; }
    
    /// <summary>
    /// Timestamp when this sun window was calculated
    /// </summary>
    public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Quality levels for sun windows
/// </summary>
public enum SunWindowQuality
{
    /// <summary>
    /// Excellent sun exposure (>80% exposure, >2 hours, high confidence)
    /// </summary>
    Excellent,
    
    /// <summary>
    /// Good sun exposure (>60% exposure, >1 hour, good confidence)
    /// </summary>
    Good,
    
    /// <summary>
    /// Fair sun exposure (>40% exposure, >30 min, medium confidence)
    /// </summary>
    Fair,
    
    /// <summary>
    /// Poor sun exposure (<40% exposure, short duration, or low confidence)
    /// </summary>
    Poor
}

/// <summary>
/// Timeline comparison between multiple patios
/// </summary>
public class TimelineComparison
{
    /// <summary>
    /// All timelines being compared
    /// </summary>
    public IEnumerable<SunExposureTimeline> Timelines { get; set; } = new List<SunExposureTimeline>();
    
    /// <summary>
    /// Summary of the comparison
    /// </summary>
    public ComparisonSummary Summary { get; set; } = new();
    
    /// <summary>
    /// Best recommended times across all patios
    /// </summary>
    public IEnumerable<RecommendedTime> BestTimes { get; set; } = new List<RecommendedTime>();
    
    /// <summary>
    /// When this comparison was generated
    /// </summary>
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Summary of timeline comparison
/// </summary>
public class ComparisonSummary
{
    /// <summary>
    /// Number of venues compared
    /// </summary>
    public int VenuesCompared { get; set; }
    
    /// <summary>
    /// Best overall time across all venues
    /// </summary>
    public DateTime BestOverallTime { get; set; }
    
    /// <summary>
    /// Name of venue with best overall sun exposure
    /// </summary>
    public string BestOverallVenue { get; set; } = "";
    
    /// <summary>
    /// Patio ID with best overall sun exposure
    /// </summary>
    public int BestOverallPatioId { get; set; }
    
    /// <summary>
    /// Average confidence across all timelines
    /// </summary>
    public double AverageConfidence { get; set; }
    
    /// <summary>
    /// Duration covered by the comparison
    /// </summary>
    public TimeSpan ComparisonDuration { get; set; }
    
    /// <summary>
    /// Total number of sun windows across all venues
    /// </summary>
    public int TotalSunWindows { get; set; }
}

/// <summary>
/// Specific time recommendation
/// </summary>
public class RecommendedTime
{
    /// <summary>
    /// Recommended time (local Stockholm time)
    /// </summary>
    public DateTime Time { get; set; }
    
    /// <summary>
    /// Patio ID for this recommendation
    /// </summary>
    public int PatioId { get; set; }
    
    /// <summary>
    /// Venue name
    /// </summary>
    public string VenueName { get; set; } = "";
    
    /// <summary>
    /// Expected sun exposure percentage at this time
    /// </summary>
    public double SunExposure { get; set; }
    
    /// <summary>
    /// Reason for this recommendation
    /// </summary>
    public string Reason { get; set; } = "";
    
    /// <summary>
    /// Confidence score for this recommendation
    /// </summary>
    public double Confidence { get; set; }
    
    /// <summary>
    /// Priority ranking (1 = highest priority)
    /// </summary>
    public int Rank { get; set; }
}