using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Data.Repositories;

/// <summary>
/// Repository implementation for building data access operations
/// </summary>
public class BuildingRepository : IBuildingRepository
{
    private readonly SunnySeatDbContext _dbContext;

    public BuildingRepository(SunnySeatDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Building?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Buildings
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
    }

    public async Task UpdateAsync(Building building, CancellationToken cancellationToken = default)
    {
        _dbContext.Buildings.Update(building);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IEnumerable<Building>> GetBuildingsInBoundsAsync(Polygon boundingArea, double? minHeight = null, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Buildings
            .Where(b => b.Geometry.Intersects(boundingArea));

        // For now, just use the Height property until we add the new height management properties
        if (minHeight.HasValue)
        {
            query = query.Where(b => b.Height >= minHeight);
        }

        return await query.ToListAsync(cancellationToken);
    }

    public async Task<(int Imported, int Skipped, int Errors)> BulkImportAsync(IEnumerable<Building> buildings, CancellationToken cancellationToken = default)
    {
        var imported = 0;
        var skipped = 0;
        var errors = 0;
        var buildingsList = buildings.ToList();

        if (buildingsList.Count == 0)
        {
            return (imported, skipped, errors);
        }

        // Use transaction for optimal performance and data consistency
        using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        
        try
        {
            var buildingsToAdd = new List<Building>();

            foreach (var building in buildingsList)
            {
                try
                {
                    // Check if building already exists by external ID (if provided)
                    if (!string.IsNullOrEmpty(building.ExternalId))
                    {
                        var exists = await ExistsByExternalIdAsync(building.ExternalId, building.Source, cancellationToken);
                        if (exists)
                        {
                            skipped++;
                            continue;
                        }
                    }

                    // Validate building data before adding
                    if (building.Geometry?.IsValid == true && building.Height > 0)
                    {
                        buildingsToAdd.Add(building);
                    }
                    else
                    {
                        errors++;
                    }
                }
                catch (Exception ex)
                {
                    // Log individual building errors but continue processing
                    errors++;
                }
            }

            // Bulk insert for performance - add all valid buildings at once
            if (buildingsToAdd.Count > 0)
            {
                _dbContext.Buildings.AddRange(buildingsToAdd);
                await _dbContext.SaveChangesAsync(cancellationToken);
                imported = buildingsToAdd.Count;
            }

            await transaction.CommitAsync(cancellationToken);

            return (imported, skipped, errors);
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            
            // If batch fails, return all as errors
            return (0, 0, buildingsList.Count);
        }
    }

    public async Task<bool> ExistsByExternalIdAsync(string externalId, string source, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Buildings
            .AnyAsync(b => b.ExternalId == externalId && b.Source == source, cancellationToken);
    }

    public async Task<IEnumerable<Building>> GetBuildingsInAreaAsync(Geometry area, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Buildings
            .Where(b => b.Geometry.Intersects(area))
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Building>> GetBuildingsNearPointAsync(Point point, double radiusKm, CancellationToken cancellationToken = default)
    {
        // Convert km to degrees (rough approximation for distance queries)
        // At Gothenburg latitude, 1 degree ? 111 km
        var radiusDegrees = radiusKm / 111.0;
        
        return await _dbContext.Buildings
            .Where(b => b.Geometry.Distance(point) <= radiusDegrees)
            .OrderBy(b => b.Geometry.Distance(point))
            .ToListAsync(cancellationToken);
    }
}