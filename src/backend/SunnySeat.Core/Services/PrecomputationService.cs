using Microsoft.Extensions.Logging;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Core.Services;

/// <summary>
/// Service for managing precomputation of sun exposure data
/// </summary>
public class PrecomputationService : IPrecomputationService
{
    private readonly ISunExposureService _sunExposureService;
    private readonly IPatioRepository _patioRepository;
    private readonly IPrecomputationRepository _precomputationRepository;
    private readonly ICacheService _cacheService;
    private readonly ILogger<PrecomputationService> _logger;

    // Algorithm version for tracking data compatibility
    private const string CURRENT_ALGORITHM_VERSION = "1.0";

    // Time slots for precomputation (peak hours: 8 AM - 8 PM, 10-minute intervals)
    private static readonly TimeOnly[] ComputationTimeSlots = GenerateTimeSlots();

    public PrecomputationService(
        ISunExposureService sunExposureService,
        IPatioRepository patioRepository,
        IPrecomputationRepository precomputationRepository,
        ICacheService cacheService,
        ILogger<PrecomputationService> logger)
    {
        _sunExposureService = sunExposureService;
        _patioRepository = patioRepository;
        _precomputationRepository = precomputationRepository;
        _cacheService = cacheService;
        _logger = logger;
    }

    /// <summary>
    /// Schedule precomputation for a specific date
    /// </summary>
    public async Task<PrecomputationSchedule> SchedulePrecomputationAsync(DateOnly targetDate,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Scheduling precomputation for {Date}", targetDate);

        // Check if already scheduled
        var existingSchedule = await _precomputationRepository.GetScheduleAsync(targetDate, cancellationToken);
        if (existingSchedule != null)
        {
            _logger.LogInformation("Precomputation for {Date} already scheduled with status {Status}", 
                targetDate, existingSchedule.Status);
            return existingSchedule;
        }

        // Create new schedule
        var schedule = new PrecomputationSchedule
        {
            TargetDate = targetDate,
            Status = PrecomputationStatus.Scheduled,
            ScheduledAt = DateTime.UtcNow
        };

        var createdSchedule = await _precomputationRepository.CreateScheduleAsync(schedule, cancellationToken);
        
        _logger.LogInformation("Created precomputation schedule {ScheduleId} for {Date}", 
            createdSchedule.Id, targetDate);

        return createdSchedule;
    }

    /// <summary>
    /// Execute precomputation for a specific date
    /// </summary>
    public async Task ExecutePrecomputationAsync(DateOnly targetDate,
        IProgress<PrecomputationProgress>? progress = null,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting precomputation execution for {Date}", targetDate);

        var schedule = await _precomputationRepository.GetScheduleAsync(targetDate, cancellationToken);
        if (schedule == null)
        {
            schedule = await SchedulePrecomputationAsync(targetDate, cancellationToken);
        }

        try
        {
            // Update status to running
            schedule.Status = PrecomputationStatus.Running;
            schedule.StartedAt = DateTime.UtcNow;
            await _precomputationRepository.UpdateScheduleAsync(schedule, cancellationToken);

            // Get all mapped patios
            var allPatios = await _patioRepository.GetAllAsync(cancellationToken);
            var mappedPatios = allPatios.Where(p => p.Geometry != null).ToList();
            
            schedule.PatiosTotal = mappedPatios.Count;
            var processedCount = 0;

            _logger.LogInformation("Processing {TotalPatios} patios for {Date} with {TimeSlots} time slots", 
                mappedPatios.Count, targetDate, ComputationTimeSlots.Length);

            // Process patios in batches for better performance
            var batchSize = 10;
            var patioBatches = mappedPatios.Chunk(batchSize);

            foreach (var batch in patioBatches)
            {
                if (cancellationToken.IsCancellationRequested)
                {
                    _logger.LogWarning("Precomputation cancelled for {Date}", targetDate);
                    schedule.Status = PrecomputationStatus.Cancelled;
                    await _precomputationRepository.UpdateScheduleAsync(schedule, cancellationToken);
                    return;
                }

                var batchTasks = batch.Select(async patio =>
                {
                    try
                    {
                        await PrecomputePatioForDateAsync(patio.Id, targetDate, cancellationToken);
                        Interlocked.Increment(ref processedCount);

                        // Report progress
                        progress?.Report(new PrecomputationProgress
                        {
                            PatiosProcessed = processedCount,
                            PatiosTotal = schedule.PatiosTotal,
                            CurrentPatio = patio.Id,
                            EstimatedCompletion = EstimateCompletionTime(processedCount, schedule.StartedAt.Value),
                            ProcessingRate = CalculateProcessingRate(processedCount, schedule.StartedAt.Value)
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error precomputing patio {PatioId} for {Date}", patio.Id, targetDate);
                    }
                });

                await Task.WhenAll(batchTasks);

                // Update progress checkpoint
                schedule.PatiosProcessed = processedCount;
                await _precomputationRepository.UpdateScheduleAsync(schedule, cancellationToken);
            }

            // Mark as completed
            schedule.Status = PrecomputationStatus.Completed;
            schedule.CompletedAt = DateTime.UtcNow;
            schedule.PatiosProcessed = processedCount;
            
            await _precomputationRepository.UpdateScheduleAsync(schedule, cancellationToken);

            _logger.LogInformation("Completed precomputation for {Date}. Processed {ProcessedCount}/{TotalCount} patios in {Duration}", 
                targetDate, processedCount, schedule.PatiosTotal, schedule.Duration);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Precomputation failed for {Date}", targetDate);
            
            schedule.Status = PrecomputationStatus.Failed;
            schedule.ErrorMessage = ex.Message;
            await _precomputationRepository.UpdateScheduleAsync(schedule, cancellationToken);
            
            throw;
        }
    }

    /// <summary>
    /// Check if precomputation is complete for a specific date
    /// </summary>
    public async Task<bool> IsPrecomputationCompleteAsync(DateOnly date, 
        CancellationToken cancellationToken = default)
    {
        return await _precomputationRepository.IsPrecomputationCompleteAsync(date, 
            completionThreshold: 0.95, cancellationToken);
    }

    /// <summary>
    /// Get precomputation status for a specific date
    /// </summary>
    public async Task<PrecomputationSchedule?> GetPrecomputationStatusAsync(DateOnly date,
        CancellationToken cancellationToken = default)
    {
        return await _precomputationRepository.GetScheduleAsync(date, cancellationToken);
    }

    /// <summary>
    /// Invalidate precomputed data for a specific patio
    /// </summary>
    public async Task InvalidatePrecomputedDataAsync(int patioId, DateOnly? specificDate = null,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Invalidating precomputed data for patio {PatioId}, date: {Date}", 
            patioId, specificDate);

        await _precomputationRepository.MarkPatioDataStaleAsync(patioId, specificDate, cancellationToken);
        await _cacheService.InvalidateCacheAsync(patioId, specificDate, cancellationToken);
    }

    /// <summary>
    /// Invalidate precomputed data for multiple patios
    /// </summary>
    public async Task InvalidateMultiplePatiosDataAsync(IEnumerable<int> patioIds, DateOnly? specificDate = null,
        CancellationToken cancellationToken = default)
    {
        var tasks = patioIds.Select(patioId => 
            InvalidatePrecomputedDataAsync(patioId, specificDate, cancellationToken));
        await Task.WhenAll(tasks);
    }

    /// <summary>
    /// Invalidate precomputed data affected by building changes
    /// </summary>
    public async Task InvalidateDataForBuildingChangeAsync(int buildingId,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Invalidating data affected by building {BuildingId} change", buildingId);
        // TODO: Find patios affected by building shadow changes
    }

    /// <summary>
    /// Get precomputation metrics for a specific date
    /// </summary>
    public async Task<PrecomputationMetrics?> GetPrecomputationMetricsAsync(DateOnly date,
        CancellationToken cancellationToken = default)
    {
        return await _precomputationRepository.GetPrecomputationMetricsAsync(date, cancellationToken);
    }

    /// <summary>
    /// Get recent precomputation schedules for monitoring
    /// </summary>
    public async Task<IEnumerable<PrecomputationSchedule>> GetRecentSchedulesAsync(int days = 7,
        CancellationToken cancellationToken = default)
    {
        return await _precomputationRepository.GetRecentSchedulesAsync(days, cancellationToken);
    }

    /// <summary>
    /// Get overall precomputation health status
    /// </summary>
    public async Task<PrecomputationHealthStatus> GetHealthStatusAsync(CancellationToken cancellationToken = default)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var tomorrow = today.AddDays(1);
        var dayAfter = today.AddDays(2);

        var healthStatus = new PrecomputationHealthStatus
        {
            OverallStatus = HealthStatus.Healthy,
            DataFreshness = await _precomputationRepository.GetDataFreshnessInfoAsync(cancellationToken)
        };

        return healthStatus;
    }

    /// <summary>
    /// Clean up expired precomputed data
    /// </summary>
    public async Task<int> CleanupExpiredDataAsync(CancellationToken cancellationToken = default)
    {
        var cutoffDate = DateTime.UtcNow.AddDays(-3);
        return await _precomputationRepository.DeleteExpiredDataAsync(cutoffDate, cancellationToken);
    }

    /// <summary>
    /// Recompute data for patios with stale data
    /// </summary>
    public async Task<int> RecomputeStaleDataAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogWarning("Stale data recomputation not implemented yet");
        return 0;
    }

    /// <summary>
    /// Validate data integrity for a specific date
    /// </summary>
    public async Task<DataIntegrityValidation> ValidateDataIntegrityAsync(DateOnly date,
        CancellationToken cancellationToken = default)
    {
        var mappedPatiosCount = await GetMappedPatiosCountAsync(cancellationToken);
        var expectedDataPoints = mappedPatiosCount * ComputationTimeSlots.Length;
        var actualDataPoints = await _precomputationRepository.GetPrecomputedDataCountAsync(date, cancellationToken);

        return new DataIntegrityValidation
        {
            Date = date,
            ExpectedDataPoints = expectedDataPoints,
            ActualDataPoints = actualDataPoints,
            IsValid = actualDataPoints >= (expectedDataPoints * 0.95)
        };
    }

    /// <summary>
    /// Get current algorithm version for tracking
    /// </summary>
    public string GetCurrentAlgorithmVersion()
    {
        return CURRENT_ALGORITHM_VERSION;
    }

    /// <summary>
    /// Get optimal time slots for precomputation (peak hours)
    /// </summary>
    public TimeOnly[] GetComputationTimeSlots()
    {
        return ComputationTimeSlots;
    }

    /// <summary>
    /// Estimate completion time for precomputation
    /// </summary>
    public DateTime EstimateCompletionTime(int patioCount, DateTime startTime)
    {
        var elapsed = DateTime.UtcNow - startTime;
        if (elapsed.TotalMinutes > 1 && patioCount > 0)
        {
            var rate = patioCount / elapsed.TotalMinutes;
            if (rate > 0)
            {
                var remainingPatios = Math.Max(0, ComputationTimeSlots.Length * patioCount - patioCount);
                var estimatedMinutes = remainingPatios / rate;
                return DateTime.UtcNow.AddMinutes(estimatedMinutes);
            }
        }

        var estimatedSeconds = patioCount * ComputationTimeSlots.Length * 0.5;
        return startTime.AddSeconds(estimatedSeconds);
    }

    // Private helper methods

    /// <summary>
    /// Generate time slots for precomputation
    /// </summary>
    private static TimeOnly[] GenerateTimeSlots()
    {
        var slots = new List<TimeOnly>();
        var startTime = new TimeOnly(8, 0); // 8 AM
        var endTime = new TimeOnly(20, 0);  // 8 PM
        var interval = TimeSpan.FromMinutes(10);
        
        var current = startTime;
        while (current <= endTime)
        {
            slots.Add(current);
            current = current.Add(interval);
        }

        return slots.ToArray();
    }

    /// <summary>
    /// Precompute sun exposure data for a single patio on a specific date
    /// </summary>
    private async Task PrecomputePatioForDateAsync(int patioId, DateOnly date, 
        CancellationToken cancellationToken)
    {
        var precomputedData = new List<PrecomputedSunExposure>();

        foreach (var timeSlot in ComputationTimeSlots)
        {
            try
            {
                var timestamp = date.ToDateTime(timeSlot, DateTimeKind.Utc);
                
                var sunExposure = await _sunExposureService.CalculatePatioSunExposureAsync(
                    patioId, timestamp, cancellationToken);

                var precomputed = new PrecomputedSunExposure
                {
                    PatioId = patioId,
                    Timestamp = timestamp,
                    LocalTime = sunExposure.LocalTime,
                    Date = date,
                    Time = timeSlot,
                    SunExposurePercent = sunExposure.SunExposurePercent,
                    State = sunExposure.State,
                    Confidence = sunExposure.Confidence,
                    SunlitAreaSqM = sunExposure.SunlitAreaSqM,
                    ShadedAreaSqM = sunExposure.ShadedAreaSqM,
                    SolarElevation = sunExposure.SolarPosition.Elevation,
                    SolarAzimuth = sunExposure.SolarPosition.Azimuth,
                    AffectingBuildingsCount = sunExposure.Shadows?.Count() ?? 0,
                    CalculationDuration = sunExposure.CalculationDuration,
                    ComputedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddDays(3),
                    ComputationVersion = CURRENT_ALGORITHM_VERSION
                };

                precomputedData.Add(precomputed);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to precompute sun exposure for patio {PatioId} at {Date} {Time}",
                    patioId, date, timeSlot);
            }
        }

        if (precomputedData.Any())
        {
            await _precomputationRepository.BulkInsertPrecomputedDataAsync(precomputedData, cancellationToken);
        }
    }

    /// <summary>
    /// Calculate current processing rate
    /// </summary>
    private double CalculateProcessingRate(int processedCount, DateTime startTime)
    {
        var elapsed = DateTime.UtcNow - startTime;
        return elapsed.TotalMinutes > 0 ? processedCount / elapsed.TotalMinutes : 0.0;
    }

    /// <summary>
    /// Get count of mapped patios
    /// </summary>
    private async Task<int> GetMappedPatiosCountAsync(CancellationToken cancellationToken)
    {
        var allPatios = await _patioRepository.GetAllAsync(cancellationToken);
        return allPatios.Count(p => p.Geometry != null);
    }
}