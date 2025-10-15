using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Service for managing precomputation of sun exposure data
/// </summary>
public interface IPrecomputationService
{
    // Schedule management
    /// <summary>
    /// Schedule precomputation for a specific date
    /// </summary>
    /// <param name="targetDate">Date to precompute</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Created precomputation schedule</returns>
    Task<PrecomputationSchedule> SchedulePrecomputationAsync(DateOnly targetDate,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Execute precomputation for a specific date
    /// </summary>
    /// <param name="targetDate">Date to precompute</param>
    /// <param name="progress">Progress reporting callback</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task ExecutePrecomputationAsync(DateOnly targetDate,
        IProgress<PrecomputationProgress>? progress = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if precomputation is complete for a specific date
    /// </summary>
    /// <param name="date">Date to check</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if precomputation is complete</returns>
    Task<bool> IsPrecomputationCompleteAsync(DateOnly date, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get precomputation status for a specific date
    /// </summary>
    /// <param name="date">Date to check</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Precomputation schedule status</returns>
    Task<PrecomputationSchedule?> GetPrecomputationStatusAsync(DateOnly date,
        CancellationToken cancellationToken = default);

    // Data invalidation
    /// <summary>
    /// Invalidate precomputed data for a specific patio
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="specificDate">Optional specific date to invalidate (null = all future dates)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task InvalidatePrecomputedDataAsync(int patioId, DateOnly? specificDate = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Invalidate precomputed data for multiple patios
    /// </summary>
    /// <param name="patioIds">Collection of patio IDs</param>
    /// <param name="specificDate">Optional specific date to invalidate (null = all future dates)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task InvalidateMultiplePatiosDataAsync(IEnumerable<int> patioIds, DateOnly? specificDate = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Invalidate precomputed data affected by building changes
    /// </summary>
    /// <param name="buildingId">ID of the changed building</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task InvalidateDataForBuildingChangeAsync(int buildingId,
        CancellationToken cancellationToken = default);

    // Metrics and monitoring
    /// <summary>
    /// Get precomputation metrics for a specific date
    /// </summary>
    /// <param name="date">Date to get metrics for</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Precomputation metrics</returns>
    Task<PrecomputationMetrics?> GetPrecomputationMetricsAsync(DateOnly date,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get recent precomputation schedules for monitoring
    /// </summary>
    /// <param name="days">Number of days to look back</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Collection of recent schedules</returns>
    Task<IEnumerable<PrecomputationSchedule>> GetRecentSchedulesAsync(int days = 7,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get overall precomputation health status
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Health status information</returns>
    Task<PrecomputationHealthStatus> GetHealthStatusAsync(CancellationToken cancellationToken = default);

    // Maintenance operations
    /// <summary>
    /// Clean up expired precomputed data
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Number of records cleaned up</returns>
    Task<int> CleanupExpiredDataAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Recompute data for patios with stale data
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Number of patios recomputed</returns>
    Task<int> RecomputeStaleDataAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Validate data integrity for a specific date
    /// </summary>
    /// <param name="date">Date to validate</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Data integrity validation results</returns>
    Task<DataIntegrityValidation> ValidateDataIntegrityAsync(DateOnly date,
        CancellationToken cancellationToken = default);

    // Configuration and optimization
    /// <summary>
    /// Get current algorithm version for tracking
    /// </summary>
    /// <returns>Current computation algorithm version</returns>
    string GetCurrentAlgorithmVersion();

    /// <summary>
    /// Get optimal time slots for precomputation (peak hours)
    /// </summary>
    /// <returns>Array of time slots for precomputation</returns>
    TimeOnly[] GetComputationTimeSlots();

    /// <summary>
    /// Estimate completion time for precomputation
    /// </summary>
    /// <param name="patioCount">Number of patios to process</param>
    /// <param name="startTime">Processing start time</param>
    /// <returns>Estimated completion time</returns>
    DateTime EstimateCompletionTime(int patioCount, DateTime startTime);
}

/// <summary>
/// Precomputation health status information
/// </summary>
public class PrecomputationHealthStatus
{
    /// <summary>
    /// Overall health status
    /// </summary>
    public HealthStatus OverallStatus { get; set; }
    
    /// <summary>
    /// Today's precomputation status
    /// </summary>
    public ScheduleHealthInfo TodayPrecomputation { get; set; } = new();
    
    /// <summary>
    /// Tomorrow's precomputation status
    /// </summary>
    public ScheduleHealthInfo TomorrowPrecomputation { get; set; } = new();
    
    /// <summary>
    /// Day after tomorrow's precomputation status
    /// </summary>
    public ScheduleHealthInfo DayAfterTomorrowPrecomputation { get; set; } = new();
    
    /// <summary>
    /// Last successful precomputation run
    /// </summary>
    public DateTime? LastSuccessfulRun { get; set; }
    
    /// <summary>
    /// Next scheduled precomputation run
    /// </summary>
    public DateTime? NextScheduledRun { get; set; }
    
    /// <summary>
    /// Number of active background jobs
    /// </summary>
    public int ActiveJobsCount { get; set; }
    
    /// <summary>
    /// Data freshness information
    /// </summary>
    public DataFreshnessInfo DataFreshness { get; set; } = new();
    
    /// <summary>
    /// Health issues or warnings
    /// </summary>
    public List<string> Issues { get; set; } = new();
    
    /// <summary>
    /// Health check timestamp
    /// </summary>
    public DateTime CheckTime { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Individual schedule health information
/// </summary>
public class ScheduleHealthInfo
{
    /// <summary>
    /// Target date for this schedule
    /// </summary>
    public DateOnly Date { get; set; }
    
    /// <summary>
    /// Schedule status
    /// </summary>
    public PrecomputationStatus Status { get; set; }
    
    /// <summary>
    /// Completion percentage (0-100)
    /// </summary>
    public double CompletionPercent { get; set; }
    
    /// <summary>
    /// Whether this schedule is healthy
    /// </summary>
    public bool IsHealthy { get; set; }
    
    /// <summary>
    /// Health status message
    /// </summary>
    public string? StatusMessage { get; set; }
    
    /// <summary>
    /// Last update time
    /// </summary>
    public DateTime? LastUpdate { get; set; }
}

/// <summary>
/// Data integrity validation results
/// </summary>
public class DataIntegrityValidation
{
    /// <summary>
    /// Target date for validation
    /// </summary>
    public DateOnly Date { get; set; }
    
    /// <summary>
    /// Whether data integrity is valid
    /// </summary>
    public bool IsValid { get; set; }
    
    /// <summary>
    /// Expected number of data points
    /// </summary>
    public int ExpectedDataPoints { get; set; }
    
    /// <summary>
    /// Actual number of data points
    /// </summary>
    public int ActualDataPoints { get; set; }
    
    /// <summary>
    /// Completeness percentage (0-100)
    /// </summary>
    public double CompletenessPercent => ExpectedDataPoints > 0 
        ? (double)ActualDataPoints / ExpectedDataPoints * 100.0 : 0.0;
    
    /// <summary>
    /// Number of stale data points
    /// </summary>
    public int StaleDataPoints { get; set; }
    
    /// <summary>
    /// Number of expired data points
    /// </summary>
    public int ExpiredDataPoints { get; set; }
    
    /// <summary>
    /// Validation issues found
    /// </summary>
    public List<string> Issues { get; set; } = new();
    
    /// <summary>
    /// Validation timestamp
    /// </summary>
    public DateTime ValidatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Health status enumeration
/// </summary>
public enum HealthStatus
{
    /// <summary>
    /// System is operating normally
    /// </summary>
    Healthy,
    
    /// <summary>
    /// System has minor issues but is functional
    /// </summary>
    Warning,
    
    /// <summary>
    /// System has significant issues affecting performance
    /// </summary>
    Critical
}