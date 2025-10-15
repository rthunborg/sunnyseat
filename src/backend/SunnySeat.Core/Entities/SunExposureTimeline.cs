using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Entities;

/// <summary>
/// Represents comprehensive sun exposure data over a time period
/// </summary>
public class SunExposureTimeline
{
    public int PatioId { get; set; }
    public Patio? Patio { get; set; }
    
    /// <summary>
    /// Timeline start time (UTC)
    /// </summary>
    public DateTime StartTime { get; set; }
    
    /// <summary>
    /// Timeline end time (UTC)
    /// </summary>
    public DateTime EndTime { get; set; }
    
    /// <summary>
    /// Data point interval (e.g., 10 minutes)
    /// </summary>
    public TimeSpan Interval { get; set; }
    
    /// <summary>
    /// Timezone for local time display
    /// </summary>
    public string TimeZone { get; set; } = "Europe/Stockholm";
    
    /// <summary>
    /// Individual timeline data points
    /// </summary>
    public IEnumerable<SunExposureTimelinePoint> Points { get; set; } = new List<SunExposureTimelinePoint>();
    
    /// <summary>
    /// Identified sun windows in this timeline
    /// </summary>
    public IEnumerable<SunWindow> SunWindows { get; set; } = new List<SunWindow>();
    
    /// <summary>
    /// Timeline metadata and quality information
    /// </summary>
    public TimelineMetadata Metadata { get; set; } = new();
    
    /// <summary>
    /// Average confidence across all data points
    /// </summary>
    public double AverageConfidence { get; set; }
    
    /// <summary>
    /// Overall confidence factors for the timeline
    /// </summary>
    public ConfidenceFactors OverallQuality { get; set; } = new ConfidenceFactors();
    
    /// <summary>
    /// Number of data points in the timeline
    /// </summary>
    public int PointCount => Points.Count();
    
    /// <summary>
    /// Duration covered by the timeline
    /// </summary>
    public TimeSpan Duration => EndTime - StartTime;
    
    /// <summary>
    /// Number of points from precomputed data
    /// </summary>
    public int PrecomputedPointsCount { get; set; }
    
    /// <summary>
    /// Number of interpolated data points
    /// </summary>
    public int InterpolatedPointsCount { get; set; }
    
    /// <summary>
    /// When this timeline was generated
    /// </summary>
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Enhanced individual time point in sun exposure timeline
/// </summary>
public class SunExposureTimelinePoint
{
    /// <summary>
    /// UTC timestamp for this data point
    /// </summary>
    public DateTime Timestamp { get; set; }
    
    /// <summary>
    /// Local time (Stockholm timezone) for this data point
    /// </summary>
    public DateTime LocalTime { get; set; }
    
    /// <summary>
    /// Sun exposure percentage (0-100)
    /// </summary>
    public double SunExposurePercent { get; set; }
    
    /// <summary>
    /// Sun exposure state classification
    /// </summary>
    public SunExposureState State { get; set; }
    
    /// <summary>
    /// Confidence score for this data point (0-100)
    /// </summary>
    public double Confidence { get; set; }
    
    /// <summary>
    /// Whether sun is visible above horizon
    /// </summary>
    public bool IsSunVisible { get; set; }
    
    /// <summary>
    /// Solar elevation angle at this time
    /// </summary>
    public double SolarElevation { get; set; }
    
    /// <summary>
    /// Solar azimuth angle at this time
    /// </summary>
    public double SolarAzimuth { get; set; }
    
    /// <summary>
    /// Source of this data point
    /// </summary>
    public DataSource Source { get; set; }
    
    /// <summary>
    /// Time taken to calculate this point (if calculated)
    /// </summary>
    public TimeSpan? CalculationTime { get; set; }
}

/// <summary>
/// Enhanced timeline metadata
/// </summary>
public class TimelineMetadata
{
    /// <summary>
    /// Weather data source (for future Epic 3 integration)
    /// </summary>
    public string WeatherSource { get; set; } = "None";
    
    /// <summary>
    /// When the underlying data was last updated
    /// </summary>
    public DateTime LastDataUpdate { get; set; }
    
    /// <summary>
    /// Total number of sun windows identified
    /// </summary>
    public int TotalSunWindows { get; set; }
    
    /// <summary>
    /// Total duration of sun exposure
    /// </summary>
    public TimeSpan TotalSunDuration { get; set; }
    
    /// <summary>
    /// Total daylight hours for this date
    /// </summary>
    public double DayLightHours { get; set; }
    
    /// <summary>
    /// Sunrise and sunset times
    /// </summary>
    public SunTimes? SunTimes { get; set; }
    
    /// <summary>
    /// Data quality notes and observations
    /// </summary>
    public IEnumerable<string> DataQualityNotes { get; set; } = new List<string>();
    
    /// <summary>
    /// Percentage of timeline data from precomputed sources
    /// </summary>
    public double PrecomputedDataPercent { get; set; }
    
    /// <summary>
    /// Average calculation time per data point
    /// </summary>
    public TimeSpan AverageCalculationTime { get; set; }
}

/// <summary>
/// Source of timeline data points
/// </summary>
public enum DataSource
{
    /// <summary>
    /// From precomputation pipeline (Story 2.4)
    /// </summary>
    Precomputed,
    
    /// <summary>
    /// Interpolated from nearby precomputed points
    /// </summary>
    Interpolated,
    
    /// <summary>
    /// Real-time calculation
    /// </summary>
    Calculated,
    
    /// <summary>
    /// From cache layers
    /// </summary>
    Cached
}

/// <summary>
/// Summary statistics for sun exposure timeline
/// </summary>
public class SunExposureTimelineSummary
{
    public double AverageSunExposure { get; set; }
    public double MaxSunExposure { get; set; }
    public double MinSunExposure { get; set; }
    public int SunnyPeriods { get; set; }      // Count of Sunny state periods
    public int PartialPeriods { get; set; }   // Count of Partial state periods
    public int ShadedPeriods { get; set; }    // Count of Shaded state periods
    public int NoSunPeriods { get; set; }     // Count of NoSun state periods
    public TimeSpan TotalSunnyTime { get; set; }
    public TimeSpan TotalPartialTime { get; set; }
    public TimeSpan TotalShadedTime { get; set; }
    public DateTime BestSunPeriodStart { get; set; }
    public TimeSpan BestSunPeriodDuration { get; set; }
    public DateTime WorstShadePeriodStart { get; set; }
    public TimeSpan WorstShadePeriodDuration { get; set; }
}