using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Repository interface for precomputed sun exposure data and schedule management
/// </summary>
public interface IPrecomputationRepository
{
    // Precomputed data operations
    /// <summary>
    /// Get precomputed sun exposure data for a specific patio and timestamp
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="timestamp">Target timestamp (UTC)</param>
    /// <param name="toleranceMinutes">Tolerance in minutes for timestamp matching</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Precomputed sun exposure data if available</returns>
    Task<PrecomputedSunExposure?> GetPrecomputedSunExposureAsync(int patioId, DateTime timestamp, 
        int toleranceMinutes = 5, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get all precomputed data for a specific date
    /// </summary>
    /// <param name="date">Target date</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Collection of precomputed data for the date</returns>
    Task<IEnumerable<PrecomputedSunExposure>> GetPrecomputedDataForDateAsync(DateOnly date, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get precomputed data for a patio over a date range
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="startDate">Start date</param>
    /// <param name="endDate">End date</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Collection of precomputed data for the patio and date range</returns>
    Task<IEnumerable<PrecomputedSunExposure>> GetPrecomputedDataForPatioAsync(int patioId, 
        DateOnly startDate, DateOnly endDate, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bulk insert precomputed sun exposure data
    /// </summary>
    /// <param name="precomputedData">Collection of precomputed data to insert</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Number of records inserted</returns>
    Task<int> BulkInsertPrecomputedDataAsync(IEnumerable<PrecomputedSunExposure> precomputedData, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Mark precomputed data as stale for a specific patio
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="fromDate">Optional start date for marking stale (defaults to today)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Number of records marked as stale</returns>
    Task<int> MarkPatioDataStaleAsync(int patioId, DateOnly? fromDate = null, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Delete expired precomputed data
    /// </summary>
    /// <param name="beforeDate">Delete data with ExpiresAt before this date</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Number of records deleted</returns>
    Task<int> DeleteExpiredDataAsync(DateTime beforeDate, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get count of precomputed data records for a specific date
    /// </summary>
    /// <param name="date">Target date</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Count of precomputed records</returns>
    Task<int> GetPrecomputedDataCountAsync(DateOnly date, CancellationToken cancellationToken = default);

    // Schedule management operations
    /// <summary>
    /// Get precomputation schedule for a specific date
    /// </summary>
    /// <param name="date">Target date</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Precomputation schedule if exists</returns>
    Task<PrecomputationSchedule?> GetScheduleAsync(DateOnly date, CancellationToken cancellationToken = default);

    /// <summary>
    /// Create a new precomputation schedule
    /// </summary>
    /// <param name="schedule">Schedule to create</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Created schedule with assigned ID</returns>
    Task<PrecomputationSchedule> CreateScheduleAsync(PrecomputationSchedule schedule, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Update an existing precomputation schedule
    /// </summary>
    /// <param name="schedule">Schedule to update</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Updated schedule</returns>
    Task<PrecomputationSchedule> UpdateScheduleAsync(PrecomputationSchedule schedule, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get recent precomputation schedules
    /// </summary>
    /// <param name="days">Number of days to look back</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Collection of recent schedules</returns>
    Task<IEnumerable<PrecomputationSchedule>> GetRecentSchedulesAsync(int days = 7, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get precomputation schedules by status
    /// </summary>
    /// <param name="status">Status to filter by</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Collection of schedules with the specified status</returns>
    Task<IEnumerable<PrecomputationSchedule>> GetSchedulesByStatusAsync(PrecomputationStatus status, 
        CancellationToken cancellationToken = default);

    // Analytics and monitoring
    /// <summary>
    /// Get precomputation metrics for a specific date
    /// </summary>
    /// <param name="date">Target date</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Precomputation metrics</returns>
    Task<PrecomputationMetrics?> GetPrecomputationMetricsAsync(DateOnly date, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Check if precomputation is complete for a specific date
    /// </summary>
    /// <param name="date">Target date</param>
    /// <param name="completionThreshold">Minimum completion percentage (0-1)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if precomputation is complete</returns>
    Task<bool> IsPrecomputationCompleteAsync(DateOnly date, double completionThreshold = 0.95, 
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get data freshness information for precomputed data
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Data freshness statistics</returns>
    Task<DataFreshnessInfo> GetDataFreshnessInfoAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Information about data freshness and staleness
/// </summary>
public class DataFreshnessInfo
{
    /// <summary>
    /// Total number of precomputed records
    /// </summary>
    public int TotalRecords { get; set; }
    
    /// <summary>
    /// Number of fresh (non-stale) records
    /// </summary>
    public int FreshRecords { get; set; }
    
    /// <summary>
    /// Number of stale records
    /// </summary>
    public int StaleRecords { get; set; }
    
    /// <summary>
    /// Number of expired records
    /// </summary>
    public int ExpiredRecords { get; set; }
    
    /// <summary>
    /// Freshness percentage (0-100)
    /// </summary>
    public double FreshnessPercent => TotalRecords > 0 ? (double)FreshRecords / TotalRecords * 100.0 : 0.0;
    
    /// <summary>
    /// Oldest data timestamp
    /// </summary>
    public DateTime? OldestDataTime { get; set; }
    
    /// <summary>
    /// Newest data timestamp
    /// </summary>
    public DateTime? NewestDataTime { get; set; }
}