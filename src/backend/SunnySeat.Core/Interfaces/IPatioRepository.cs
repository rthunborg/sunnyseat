using SunnySeat.Core.Entities;
using NetTopologySuite.Geometries;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Repository interface for patio data access operations
/// </summary>
public interface IPatioRepository
{
    // Basic CRUD operations
    Task<Patio?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Patio>> GetByIdsAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default);
    Task<IEnumerable<Patio>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<Patio>> GetByVenueIdAsync(int venueId, CancellationToken cancellationToken = default);
    Task<Patio> CreateAsync(Patio patio, CancellationToken cancellationToken = default);
    Task<Patio> UpdateAsync(Patio patio, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default);
    
    // Quality and review operations
    Task<IEnumerable<Patio>> GetPatiosRequiringReviewAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<Patio>> GetPatiosByQualityRangeAsync(double minQuality, double maxQuality, CancellationToken cancellationToken = default);
    Task<IEnumerable<Patio>> GetPatiosByHeightSourceAsync(HeightSource heightSource, CancellationToken cancellationToken = default);
    
    // Spatial queries
    Task<IEnumerable<Patio>> GetPatiosNearPointAsync(Point location, double radiusKm, CancellationToken cancellationToken = default);
    Task<IEnumerable<Patio>> GetPatiosWithinBoundsAsync(Polygon bounds, CancellationToken cancellationToken = default);
    Task<Patio?> FindPatioContainingPointAsync(Point location, CancellationToken cancellationToken = default);
    
    // Analytics
    Task<double> GetAverageQualityScoreAsync(CancellationToken cancellationToken = default);
    Task<double> GetAverageQualityScoreForVenueAsync(int venueId, CancellationToken cancellationToken = default);
    Task<int> CountPatiosRequiringReviewAsync(CancellationToken cancellationToken = default);
    
    // Bulk operations
    Task<int> BulkInsertAsync(IEnumerable<Patio> patios, CancellationToken cancellationToken = default);
    Task<int> CountAsync(CancellationToken cancellationToken = default);
    Task<int> CountByVenueAsync(int venueId, CancellationToken cancellationToken = default);
}