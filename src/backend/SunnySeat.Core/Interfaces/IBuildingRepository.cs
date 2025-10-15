using SunnySeat.Core.Entities;
using NetTopologySuite.Geometries;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Repository interface for building data access operations
/// </summary>
public interface IBuildingRepository
{
    /// <summary>
    /// Get building by ID
    /// </summary>
    Task<Building?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update building entity
    /// </summary>
    Task UpdateAsync(Building building, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get buildings within geographic bounds with optional height filter
    /// </summary>
    Task<IEnumerable<Building>> GetBuildingsInBoundsAsync(Polygon boundingArea, double? minHeight = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bulk import buildings from processed data
    /// </summary>
    Task<(int Imported, int Skipped, int Errors)> BulkImportAsync(IEnumerable<Building> buildings, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Check if a building with the given external ID already exists
    /// </summary>
    Task<bool> ExistsByExternalIdAsync(string externalId, string source, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get buildings within a geographic area
    /// </summary>
    Task<IEnumerable<Building>> GetBuildingsInAreaAsync(Geometry area, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get buildings near a specific point within the given radius
    /// </summary>
    Task<IEnumerable<Building>> GetBuildingsNearPointAsync(Point point, double radiusKm, CancellationToken cancellationToken = default);
}