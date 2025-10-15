using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Service interface for venue and patio data quality validation
/// </summary>
public interface IDataQualityService
{
    // Venue validation
    Task<bool> ValidateVenueAsync(Venue venue);
    Task<List<string>> GetVenueValidationIssuesAsync(Venue venue);
    Task<double> CalculateVenueQualityScoreAsync(Venue venue);
    
    // Patio validation
    Task<bool> ValidatePatioAsync(Patio patio);
    Task<List<string>> GetPatioValidationIssuesAsync(Patio patio);
    Task<double> CalculatePatioQualityScoreAsync(Patio patio);
    
    // Batch validation
    Task<IEnumerable<VenueQualityMetrics>> ValidateAllVenuesAsync(CancellationToken cancellationToken = default);
    Task<VenueQualityMetrics> ValidateVenueDetailedAsync(int venueId, CancellationToken cancellationToken = default);
    
    // Quality metrics
    Task<Dictionary<string, object>> GetQualityMetricsAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<Venue>> GetVenuesRequiringReviewAsync(CancellationToken cancellationToken = default);
}