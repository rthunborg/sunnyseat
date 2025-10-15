using Microsoft.EntityFrameworkCore;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Data.Repositories;

/// <summary>
/// Repository implementation for feedback data access operations
/// </summary>
public class FeedbackRepository : IFeedbackRepository
{
    private readonly SunnySeatDbContext _context;

    public FeedbackRepository(SunnySeatDbContext context)
    {
        _context = context;
    }

    public async Task<Feedback?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Feedback
            .Include(f => f.Patio)
            .Include(f => f.Venue)
            .FirstOrDefaultAsync(f => f.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<Feedback>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Feedback
            .Include(f => f.Patio)
            .Include(f => f.Venue)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<Feedback> CreateAsync(Feedback feedback, CancellationToken cancellationToken = default)
    {
        feedback.CreatedAt = DateTime.UtcNow;

        _context.Feedback.Add(feedback);
        await _context.SaveChangesAsync(cancellationToken);
        return feedback;
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var feedback = await _context.Feedback.FindAsync(new object[] { id }, cancellationToken);
        if (feedback == null) return false;

        _context.Feedback.Remove(feedback);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IEnumerable<Feedback>> GetByVenueIdAsync(int venueId, CancellationToken cancellationToken = default)
    {
        return await _context.Feedback
            .Include(f => f.Patio)
            .Where(f => f.VenueId == venueId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Feedback>> GetByPatioIdAsync(int patioId, CancellationToken cancellationToken = default)
    {
        return await _context.Feedback
            .Where(f => f.PatioId == patioId)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Feedback>> GetByDateRangeAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        return await _context.Feedback
            .Include(f => f.Patio)
            .Include(f => f.Venue)
            .Where(f => f.UserTimestamp >= startDate && f.UserTimestamp <= endDate)
            .OrderByDescending(f => f.UserTimestamp)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Feedback>> GetByVenueAndDateRangeAsync(int venueId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        return await _context.Feedback
            .Include(f => f.Patio)
            .Where(f => f.VenueId == venueId && f.UserTimestamp >= startDate && f.UserTimestamp <= endDate)
            .OrderByDescending(f => f.UserTimestamp)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> CountByDateRangeAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        return await _context.Feedback
            .CountAsync(f => f.UserTimestamp >= startDate && f.UserTimestamp <= endDate, cancellationToken);
    }

    public async Task<int> CountCorrectPredictionsAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        return await _context.Feedback
            .CountAsync(f => f.UserTimestamp >= startDate && f.UserTimestamp <= endDate &&
                           ((f.PredictedState == "sunny" && f.WasSunny) ||
                            (f.PredictedState != "sunny" && !f.WasSunny)),
                       cancellationToken);
    }

    public async Task<double> CalculateAccuracyRateAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        var total = await CountByDateRangeAsync(startDate, endDate, cancellationToken);
        if (total == 0) return 0.0;

        var correct = await CountCorrectPredictionsAsync(startDate, endDate, cancellationToken);
        return (double)correct / total * 100.0;
    }

    public async Task<double> CalculateAccuracyRateByVenueAsync(int venueId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        var total = await _context.Feedback
            .CountAsync(f => f.VenueId == venueId &&
                           f.UserTimestamp >= startDate &&
                           f.UserTimestamp <= endDate,
                       cancellationToken);

        if (total == 0) return 0.0;

        var correct = await _context.Feedback
            .CountAsync(f => f.VenueId == venueId &&
                           f.UserTimestamp >= startDate &&
                           f.UserTimestamp <= endDate &&
                           ((f.PredictedState == "sunny" && f.WasSunny) ||
                            (f.PredictedState != "sunny" && !f.WasSunny)),
                       cancellationToken);

        return (double)correct / total * 100.0;
    }

    public async Task<int> CountRecentFeedbackByIpAsync(string ipAddress, TimeSpan timeWindow, CancellationToken cancellationToken = default)
    {
        var cutoffTime = DateTime.UtcNow - timeWindow;
        return await _context.Feedback
            .CountAsync(f => f.IpAddress == ipAddress && f.CreatedAt >= cutoffTime, cancellationToken);
    }

    public async Task<bool> HasRecentDuplicateFeedbackAsync(int patioId, DateTime timestamp, string ipAddress, TimeSpan timeWindow, CancellationToken cancellationToken = default)
    {
        var cutoffTime = DateTime.UtcNow - timeWindow;
        return await _context.Feedback
            .AnyAsync(f => f.PatioId == patioId &&
                         f.IpAddress == ipAddress &&
                         f.UserTimestamp == timestamp &&
                         f.CreatedAt >= cutoffTime,
                     cancellationToken);
    }
}
