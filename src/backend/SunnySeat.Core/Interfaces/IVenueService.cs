using SunnySeat.Core.Entities;
using NetTopologySuite.Geometries;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Service interface for venue management operations
/// </summary>
public interface IVenueService
{
    // Basic CRUD operations
    Task<Venue?> GetVenueByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<IEnumerable<Venue>> GetAllVenuesAsync(CancellationToken cancellationToken = default);
    Task<IEnumerable<Venue>> GetVenuesByTypeAsync(VenueType type, CancellationToken cancellationToken = default);
    Task<IEnumerable<Venue>> SearchVenuesAsync(string searchTerm, CancellationToken cancellationToken = default);
    Task<Venue> CreateVenueAsync(Venue venue, CancellationToken cancellationToken = default);
    Task<Venue> UpdateVenueAsync(Venue venue, CancellationToken cancellationToken = default);
    Task<bool> DeleteVenueAsync(int id, CancellationToken cancellationToken = default);
    
    // Mapping status operations
    Task<IEnumerable<Venue>> GetUnmappedVenuesAsync(CancellationToken cancellationToken = default);
    Task<bool> MarkVenueAsMappedAsync(int venueId, CancellationToken cancellationToken = default);
    
    // Spatial operations
    Task<IEnumerable<Venue>> GetVenuesNearLocationAsync(Point location, double radiusKm, CancellationToken cancellationToken = default);
    Task<IEnumerable<Venue>> GetVenuesWithinBoundsAsync(Polygon bounds, CancellationToken cancellationToken = default);
    
    // Patio operations
    Task<IEnumerable<Patio>> GetPatiosForVenueAsync(int venueId, CancellationToken cancellationToken = default);
    Task<Patio> CreatePatioAsync(int venueId, Patio patio, CancellationToken cancellationToken = default);
    Task<Patio> UpdatePatioAsync(Patio patio, CancellationToken cancellationToken = default);
    Task<bool> DeletePatioAsync(int patioId, CancellationToken cancellationToken = default);
    
    // Quality validation
    Task<VenueQualityMetrics> CalculateVenueQualityAsync(int venueId, CancellationToken cancellationToken = default);
    Task<IEnumerable<VenueQualityMetrics>> ValidateAllVenuesAsync(CancellationToken cancellationToken = default);
    
    // Data management
    Task<int> ImportVenuesAsync(IEnumerable<Venue> venues, CancellationToken cancellationToken = default);
    Task<IEnumerable<Venue>> ExportVenuesAsync(bool includePatios = true, CancellationToken cancellationToken = default);
}