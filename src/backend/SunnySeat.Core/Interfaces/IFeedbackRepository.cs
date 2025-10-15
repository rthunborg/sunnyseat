using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Repository interface for feedback data access operations
/// </summary>
public interface IFeedbackRepository
{
    // Basic CRUD operations
    Task<Feedback?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Feedback>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Feedback> CreateAsync(Feedback feedback, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);

    // Query operations for analytics
    Task<IEnumerable<Feedback>> GetByVenueIdAsync(int venueId, CancellationToken cancellationToken = default);
    Task<IEnumerable<Feedback>> GetByPatioIdAsync(int patioId, CancellationToken cancellationToken = default);
    Task<IEnumerable<Feedback>> GetByDateRangeAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    Task<IEnumerable<Feedback>> GetByVenueAndDateRangeAsync(int venueId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);

    // Analytics operations
    Task<int> CountByDateRangeAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    Task<int> CountCorrectPredictionsAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    Task<double> CalculateAccuracyRateAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    Task<double> CalculateAccuracyRateByVenueAsync(int venueId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);

    // Spam prevention
    Task<int> CountRecentFeedbackByIpAsync(string ipAddress, TimeSpan timeWindow, CancellationToken cancellationToken = default);
    Task<bool> HasRecentDuplicateFeedbackAsync(int patioId, DateTime timestamp, string ipAddress, TimeSpan timeWindow, CancellationToken cancellationToken = default);
}
