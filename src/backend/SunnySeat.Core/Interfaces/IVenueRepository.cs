using SunnySeat.Core.Entities;
using NetTopologySuite.Geometries;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Repository interface for venue data access operations
/// </summary>
public interface IVenueRepository
{
    // Basic CRUD operations
    Task<Venue?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Venue?> GetByIdWithPatiosAsync(int id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Venue>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<Venue>> GetAllWithPatiosAsync(CancellationToken cancellationToken = default);
    Task<Venue> CreateAsync(Venue venue, CancellationToken cancellationToken = default);
    Task<Venue> UpdateAsync(Venue venue, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default);
    
    // Search and filtering
    Task<IEnumerable<Venue>> SearchByNameAsync(string name, CancellationToken cancellationToken = default);
    Task<IEnumerable<Venue>> SearchByAddressAsync(string address, CancellationToken cancellationToken = default);
    Task<IEnumerable<Venue>> GetByTypeAsync(VenueType type, CancellationToken cancellationToken = default);
    Task<IEnumerable<Venue>> GetActiveVenuesAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<Venue>> GetUnmappedVenuesAsync(CancellationToken cancellationToken = default);
    
    // Spatial queries
    Task<IEnumerable<Venue>> GetVenuesNearPointAsync(Point location, double radiusKm, CancellationToken cancellationToken = default);
    Task<IEnumerable<Venue>> GetVenuesWithinBoundsAsync(Polygon bounds, CancellationToken cancellationToken = default);
    Task<Venue?> FindNearestVenueAsync(Point location, CancellationToken cancellationToken = default);
    
    // Bulk operations
    Task<int> BulkInsertAsync(IEnumerable<Venue> venues, CancellationToken cancellationToken = default);
    Task<int> CountAsync(CancellationToken cancellationToken = default);
    Task<int> CountByTypeAsync(VenueType type, CancellationToken cancellationToken = default);
}