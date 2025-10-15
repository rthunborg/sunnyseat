using Microsoft.EntityFrameworkCore;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Data.Repositories;

/// <summary>
/// Repository implementation for precomputed sun exposure data operations
/// </summary>
public class PrecomputationRepository : IPrecomputationRepository
{
    private readonly SunnySeatDbContext _context;

    public PrecomputationRepository(SunnySeatDbContext context)
    {
        _context = context;
    }

    // Precomputed data operations
    public async Task<PrecomputedSunExposure?> GetPrecomputedSunExposureAsync(
        int patioId,
        DateTime timestamp,
        int toleranceMinutes = 5,
        CancellationToken cancellationToken = default)
    {
        var minTime = timestamp.AddMinutes(-toleranceMinutes);
        var maxTime = timestamp.AddMinutes(toleranceMinutes);

        return await _context.PrecomputedSunExposures
            .Where(p => p.PatioId == patioId && p.Timestamp >= minTime && p.Timestamp <= maxTime)
            .OrderBy(p => (p.Timestamp - timestamp).Duration())
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IEnumerable<PrecomputedSunExposure>> GetPrecomputedDataForDateAsync(
        DateOnly date,
        CancellationToken cancellationToken = default)
    {
        return await _context.PrecomputedSunExposures
            .Where(p => p.Date == date)
            .OrderBy(p => p.PatioId)
            .ThenBy(p => p.Time)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<PrecomputedSunExposure>> GetPrecomputedDataForPatioAsync(
        int patioId,
        DateOnly startDate,
        DateOnly endDate,
        CancellationToken cancellationToken = default)
    {
        return await _context.PrecomputedSunExposures
            .Where(p => p.PatioId == patioId && p.Date >= startDate && p.Date <= endDate)
            .OrderBy(p => p.Date)
            .ThenBy(p => p.Time)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> BulkInsertPrecomputedDataAsync(
        IEnumerable<PrecomputedSunExposure> precomputedData,
        CancellationToken cancellationToken = default)
    {
        await _context.PrecomputedSunExposures.AddRangeAsync(precomputedData, cancellationToken);
        return await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<int> MarkPatioDataStaleAsync(
        int patioId,
        DateOnly? fromDate = null,
        CancellationToken cancellationToken = default)
    {
        var effectiveFromDate = fromDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var dataToMarkStale = await _context.PrecomputedSunExposures
            .Where(p => p.PatioId == patioId && p.Date >= effectiveFromDate)
            .ToListAsync(cancellationToken);

        foreach (var data in dataToMarkStale)
        {
            data.IsStale = true;
        }

        return await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<int> DeleteExpiredDataAsync(
        DateTime beforeDate,
        CancellationToken cancellationToken = default)
    {
        var expiredData = await _context.PrecomputedSunExposures
            .Where(p => p.ExpiresAt < beforeDate)
            .ToListAsync(cancellationToken);

        _context.PrecomputedSunExposures.RemoveRange(expiredData);
        return await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<int> GetPrecomputedDataCountAsync(
        DateOnly date,
        CancellationToken cancellationToken = default)
    {
        return await _context.PrecomputedSunExposures
            .Where(p => p.Date == date)
            .CountAsync(cancellationToken);
    }

    // Schedule management operations
    public async Task<PrecomputationSchedule?> GetScheduleAsync(
        DateOnly date,
        CancellationToken cancellationToken = default)
    {
        return await _context.PrecomputationSchedules
            .FirstOrDefaultAsync(s => s.TargetDate == date, cancellationToken);
    }

    public async Task<PrecomputationSchedule> CreateScheduleAsync(
        PrecomputationSchedule schedule,
        CancellationToken cancellationToken = default)
    {
        _context.PrecomputationSchedules.Add(schedule);
        await _context.SaveChangesAsync(cancellationToken);
        return schedule;
    }

    public async Task<PrecomputationSchedule> UpdateScheduleAsync(
        PrecomputationSchedule schedule,
        CancellationToken cancellationToken = default)
    {
        _context.PrecomputationSchedules.Update(schedule);
        await _context.SaveChangesAsync(cancellationToken);
        return schedule;
    }

    public async Task<IEnumerable<PrecomputationSchedule>> GetRecentSchedulesAsync(
        int days = 7,
        CancellationToken cancellationToken = default)
    {
        var cutoffDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-days));

        return await _context.PrecomputationSchedules
            .Where(s => s.TargetDate >= cutoffDate)
            .OrderByDescending(s => s.TargetDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<PrecomputationSchedule>> GetSchedulesByStatusAsync(
        PrecomputationStatus status,
        CancellationToken cancellationToken = default)
    {
        return await _context.PrecomputationSchedules
            .Where(s => s.Status == status)
            .OrderBy(s => s.TargetDate)
            .ToListAsync(cancellationToken);
    }

    // Analytics and monitoring
    public async Task<PrecomputationMetrics?> GetPrecomputationMetricsAsync(
        DateOnly date,
        CancellationToken cancellationToken = default)
    {
        var schedule = await _context.PrecomputationSchedules
            .FirstOrDefaultAsync(s => s.TargetDate == date, cancellationToken);

        if (schedule == null) return null;

        var totalRecords = await _context.PrecomputedSunExposures
            .Where(p => p.Date == date)
            .CountAsync(cancellationToken);

        var avgCalcTime = await _context.PrecomputedSunExposures
            .Where(p => p.Date == date)
            .AverageAsync(p => p.CalculationDuration.TotalMilliseconds, cancellationToken);

        return new PrecomputationMetrics
        {
            Date = date,
            PatiosProcessed = schedule.PatiosProcessed,
            TotalDuration = schedule.Duration ?? TimeSpan.Zero,
            AverageCalculationTime = TimeSpan.FromMilliseconds(avgCalcTime),
            CacheEfficiency = 0.0, // Would need cache hit/miss tracking
            DataQualityScore = 0.0, // Would need quality validation
            ErrorRate = schedule.PatiosTotal > 0 ? 100.0 * (schedule.PatiosTotal - schedule.PatiosProcessed) / schedule.PatiosTotal : 0.0
        };
    }

    public async Task<bool> IsPrecomputationCompleteAsync(
        DateOnly date,
        double completionThreshold = 0.95,
        CancellationToken cancellationToken = default)
    {
        var schedule = await _context.PrecomputationSchedules
            .FirstOrDefaultAsync(s => s.TargetDate == date, cancellationToken);

        if (schedule == null || schedule.PatiosTotal == 0) return false;

        var completionRatio = (double)schedule.PatiosProcessed / schedule.PatiosTotal;
        return completionRatio >= completionThreshold && schedule.Status == PrecomputationStatus.Completed;
    }

    public async Task<DataFreshnessInfo> GetDataFreshnessInfoAsync(
        CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;

        var totalRecords = await _context.PrecomputedSunExposures.CountAsync(cancellationToken);
        var freshRecords = await _context.PrecomputedSunExposures
            .Where(p => !p.IsStale && p.ExpiresAt > now)
            .CountAsync(cancellationToken);
        var staleRecords = await _context.PrecomputedSunExposures
            .Where(p => p.IsStale)
            .CountAsync(cancellationToken);
        var expiredRecords = await _context.PrecomputedSunExposures
            .Where(p => p.ExpiresAt <= now)
            .CountAsync(cancellationToken);

        var oldestData = await _context.PrecomputedSunExposures
            .OrderBy(p => p.ComputedAt)
            .Select(p => p.ComputedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var newestData = await _context.PrecomputedSunExposures
            .OrderByDescending(p => p.ComputedAt)
            .Select(p => p.ComputedAt)
            .FirstOrDefaultAsync(cancellationToken);

        return new DataFreshnessInfo
        {
            TotalRecords = totalRecords,
            FreshRecords = freshRecords,
            StaleRecords = staleRecords,
            ExpiredRecords = expiredRecords,
            OldestDataTime = oldestData == default ? null : oldestData,
            NewestDataTime = newestData == default ? null : newestData
        };
    }
}
