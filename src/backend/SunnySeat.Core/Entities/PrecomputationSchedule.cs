namespace SunnySeat.Core.Entities;

/// <summary>
/// Tracks precomputation pipeline execution schedules and status
/// </summary>
public class PrecomputationSchedule
{
    public int Id { get; set; }
    
    /// <summary>
    /// Date being precomputed
    /// </summary>
    public DateOnly TargetDate { get; set; }
    
    /// <summary>
    /// Current status of precomputation
    /// </summary>
    public PrecomputationStatus Status { get; set; } = PrecomputationStatus.Scheduled;
    
    /// <summary>
    /// When this precomputation was scheduled
    /// </summary>
    public DateTime ScheduledAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// When precomputation started executing
    /// </summary>
    public DateTime? StartedAt { get; set; }
    
    /// <summary>
    /// When precomputation completed
    /// </summary>
    public DateTime? CompletedAt { get; set; }
    
    /// <summary>
    /// Total execution duration
    /// </summary>
    public TimeSpan? Duration => CompletedAt - StartedAt;
    
    /// <summary>
    /// Number of patios successfully processed
    /// </summary>
    public int PatiosProcessed { get; set; }
    
    /// <summary>
    /// Total number of patios to process
    /// </summary>
    public int PatiosTotal { get; set; }
    
    /// <summary>
    /// Progress percentage (0-100)
    /// </summary>
    public double ProgressPercent => PatiosTotal > 0 ? (double)PatiosProcessed / PatiosTotal * 100.0 : 0.0;
    
    /// <summary>
    /// Error message if precomputation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
    
    /// <summary>
    /// Additional metrics and metadata (JSON serialized)
    /// </summary>
    public Dictionary<string, object> Metrics { get; set; } = new();
    
    /// <summary>
    /// Background job ID for tracking
    /// </summary>
    public string? JobId { get; set; }
    
    /// <summary>
    /// Number of retry attempts
    /// </summary>
    public int RetryCount { get; set; }
    
    /// <summary>
    /// When this schedule record was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Status enumeration for precomputation schedules
/// </summary>
public enum PrecomputationStatus
{
    /// <summary>
    /// Precomputation is scheduled but not yet started
    /// </summary>
    Scheduled = 0,
    
    /// <summary>
    /// Precomputation is currently running
    /// </summary>
    Running = 1,
    
    /// <summary>
    /// Precomputation completed successfully
    /// </summary>
    Completed = 2,
    
    /// <summary>
    /// Precomputation failed
    /// </summary>
    Failed = 3,
    
    /// <summary>
    /// Precomputation was cancelled
    /// </summary>
    Cancelled = 4
}

/// <summary>
/// Progress reporting model for precomputation operations
/// </summary>
public class PrecomputationProgress
{
    /// <summary>
    /// Number of patios processed so far
    /// </summary>
    public int PatiosProcessed { get; set; }
    
    /// <summary>
    /// Total number of patios to process
    /// </summary>
    public int PatiosTotal { get; set; }
    
    /// <summary>
    /// Currently processing patio ID
    /// </summary>
    public int CurrentPatio { get; set; }
    
    /// <summary>
    /// Estimated completion time
    /// </summary>
    public DateTime? EstimatedCompletion { get; set; }
    
    /// <summary>
    /// Current processing rate (patios per minute)
    /// </summary>
    public double ProcessingRate { get; set; }
    
    /// <summary>
    /// Progress percentage (0-100)
    /// </summary>
    public double ProgressPercent => PatiosTotal > 0 ? (double)PatiosProcessed / PatiosTotal * 100.0 : 0.0;
}

/// <summary>
/// Metrics for precomputation performance analysis
/// </summary>
public class PrecomputationMetrics
{
    /// <summary>
    /// Date of the metrics
    /// </summary>
    public DateOnly Date { get; set; }
    
    /// <summary>
    /// Total execution time
    /// </summary>
    public TimeSpan TotalDuration { get; set; }
    
    /// <summary>
    /// Number of patios processed
    /// </summary>
    public int PatiosProcessed { get; set; }
    
    /// <summary>
    /// Average calculation time per time slot
    /// </summary>
    public TimeSpan AverageCalculationTime { get; set; }
    
    /// <summary>
    /// Cache efficiency score (0-1)
    /// </summary>
    public double CacheEfficiency { get; set; }
    
    /// <summary>
    /// Data quality score (0-1)
    /// </summary>
    public double DataQualityScore { get; set; }
    
    /// <summary>
    /// Error rate percentage (0-100)
    /// </summary>
    public double ErrorRate { get; set; }
    
    /// <summary>
    /// Processing rate (patios per hour)
    /// </summary>
    public double ProcessingRate => TotalDuration.TotalHours > 0 ? PatiosProcessed / TotalDuration.TotalHours : 0;
}