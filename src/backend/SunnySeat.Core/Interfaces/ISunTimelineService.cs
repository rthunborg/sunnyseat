using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Service for generating sun exposure timelines and forecasts
/// </summary>
public interface ISunTimelineService
{
    // Core timeline generation
    /// <summary>
    /// Generate comprehensive sun exposure timeline for a patio
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="startTime">Timeline start time (UTC)</param>
    /// <param name="endTime">Timeline end time (UTC)</param>
    /// <param name="resolution">Data point interval (optional, defaults to 10 minutes)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Complete sun exposure timeline</returns>
    Task<SunExposureTimeline> GenerateTimelineAsync(int patioId, 
        DateTime startTime, DateTime endTime, TimeSpan? resolution = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate timelines for multiple patios (batch operation)
    /// </summary>
    /// <param name="patioIds">Collection of patio IDs</param>
    /// <param name="startTime">Timeline start time (UTC)</param>
    /// <param name="endTime">Timeline end time (UTC)</param>
    /// <param name="resolution">Data point interval (optional, defaults to 10 minutes)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Collection of sun exposure timelines</returns>
    Task<IEnumerable<SunExposureTimeline>> GenerateBatchTimelinesAsync(
        IEnumerable<int> patioIds, DateTime startTime, DateTime endTime,
        TimeSpan? resolution = null, CancellationToken cancellationToken = default);

    // Convenience methods for common time ranges
    /// <summary>
    /// Get today's sun exposure timeline for a patio
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Today's timeline from sunrise to sunset</returns>
    Task<SunExposureTimeline> GetTodayTimelineAsync(int patioId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get tomorrow's sun exposure timeline for a patio
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Tomorrow's timeline from sunrise to sunset</returns>
    Task<SunExposureTimeline> GetTomorrowTimelineAsync(int patioId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get next 12 hours timeline for a patio
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Timeline for next 12 hours</returns>
    Task<SunExposureTimeline> GetNext12HoursTimelineAsync(int patioId,
        CancellationToken cancellationToken = default);

    // Sun window analysis
    /// <summary>
    /// Get the best sun windows for a patio within a time range
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="startTime">Search start time (UTC)</param>
    /// <param name="endTime">Search end time (UTC)</param>
    /// <param name="maxWindows">Maximum number of windows to return</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Best sun windows sorted by quality</returns>
    Task<IEnumerable<SunWindow>> GetBestSunWindowsAsync(int patioId,
        DateTime startTime, DateTime endTime, int maxWindows = 3,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get sun window recommendations for today
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Today's recommended sun windows</returns>
    Task<IEnumerable<SunWindow>> GetTodayRecommendationsAsync(int patioId,
        CancellationToken cancellationToken = default);

    // Venue comparison
    /// <summary>
    /// Compare sun exposure timelines between multiple patios
    /// </summary>
    /// <param name="patioIds">Collection of patio IDs to compare</param>
    /// <param name="startTime">Comparison start time (UTC)</param>
    /// <param name="endTime">Comparison end time (UTC)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Timeline comparison with recommendations</returns>
    Task<TimelineComparison> CompareVenueTimelinesAsync(
        IEnumerable<int> patioIds, DateTime startTime, DateTime endTime,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Find the best patio among a collection for a specific time range
    /// </summary>
    /// <param name="patioIds">Collection of patio IDs to evaluate</param>
    /// <param name="startTime">Evaluation start time (UTC)</param>
    /// <param name="endTime">Evaluation end time (UTC)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Recommended patio with reasoning</returns>
    Task<RecommendedTime> FindBestPatioAsync(IEnumerable<int> patioIds,
        DateTime startTime, DateTime endTime, CancellationToken cancellationToken = default);

    // Timeline optimization and analysis
    /// <summary>
    /// Generate timeline summary statistics
    /// </summary>
    /// <param name="timeline">Timeline to summarize</param>
    /// <returns>Summary statistics</returns>
    SunExposureTimelineSummary GenerateTimelineSummary(SunExposureTimeline timeline);

    /// <summary>
    /// Validate timeline data quality and completeness
    /// </summary>
    /// <param name="timeline">Timeline to validate</param>
    /// <returns>Data quality assessment</returns>
    Task<TimelineQualityAssessment> ValidateTimelineQualityAsync(SunExposureTimeline timeline);

    /// <summary>
    /// Get timeline generation performance metrics
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Performance metrics for monitoring</returns>
    Task<TimelinePerformanceMetrics> GetPerformanceMetricsAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Timeline quality assessment results
/// </summary>
public class TimelineQualityAssessment
{
    /// <summary>
    /// Overall quality score (0-100)
    /// </summary>
    public double QualityScore { get; set; }
    
    /// <summary>
    /// Data completeness percentage (0-100)
    /// </summary>
    public double CompletenessPercent { get; set; }
    
    /// <summary>
    /// Confidence reliability score (0-100)
    /// </summary>
    public double ConfidenceReliability { get; set; }
    
    /// <summary>
    /// Percentage of data from high-quality sources
    /// </summary>
    public double HighQualityDataPercent { get; set; }
    
    /// <summary>
    /// Identified quality issues
    /// </summary>
    public IEnumerable<string> QualityIssues { get; set; } = new List<string>();
    
    /// <summary>
    /// Recommendations for improving quality
    /// </summary>
    public IEnumerable<string> ImprovementRecommendations { get; set; } = new List<string>();
    
    /// <summary>
    /// Whether the timeline meets quality standards
    /// </summary>
    public bool MeetsQualityStandards => QualityScore >= 70.0;
}

/// <summary>
/// Timeline service performance metrics
/// </summary>
public class TimelinePerformanceMetrics
{
    /// <summary>
    /// Average timeline generation time
    /// </summary>
    public TimeSpan AverageGenerationTime { get; set; }
    
    /// <summary>
    /// Cache hit rate for timeline requests
    /// </summary>
    public double CacheHitRate { get; set; }
    
    /// <summary>
    /// Percentage of data served from precomputed sources
    /// </summary>
    public double PrecomputedDataUsage { get; set; }
    
    /// <summary>
    /// Number of timelines generated in last hour
    /// </summary>
    public int TimelinesGeneratedLastHour { get; set; }
    
    /// <summary>
    /// Average data points per timeline
    /// </summary>
    public double AverageDataPointsPerTimeline { get; set; }
    
    /// <summary>
    /// System performance status
    /// </summary>
    public string PerformanceStatus { get; set; } = "Healthy";
}