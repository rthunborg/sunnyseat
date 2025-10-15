using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Data.Repositories;

/// <summary>
/// Repository implementation for patio data access operations
/// </summary>
public class PatioRepository : IPatioRepository
{
    private readonly SunnySeatDbContext _context;

    public PatioRepository(SunnySeatDbContext context)
    {
        _context = context;
    }

    public async Task<Patio?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Patios
            .Include(p => p.Venue)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<Patio>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Patios
            .Include(p => p.Venue)
            .OrderBy(p => p.VenueId)
            .ThenBy(p => p.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Patio>> GetByVenueIdAsync(int venueId, CancellationToken cancellationToken = default)
    {
        return await _context.Patios
            .Where(p => p.VenueId == venueId)
            .OrderBy(p => p.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Patio> CreateAsync(Patio patio, CancellationToken cancellationToken = default)
    {
        patio.CreatedAt = DateTime.UtcNow;
        patio.UpdatedAt = DateTime.UtcNow;
        
        _context.Patios.Add(patio);
        await _context.SaveChangesAsync(cancellationToken);
        return patio;
    }

    public async Task<Patio> UpdateAsync(Patio patio, CancellationToken cancellationToken = default)
    {
        patio.UpdatedAt = DateTime.UtcNow;
        
        _context.Patios.Update(patio);
        await _context.SaveChangesAsync(cancellationToken);
        return patio;
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var patio = await _context.Patios.FindAsync(new object[] { id }, cancellationToken);
        if (patio == null) return false;

        _context.Patios.Remove(patio);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Patios.AnyAsync(p => p.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<Patio>> GetPatiosRequiringReviewAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Patios
            .Include(p => p.Venue)
            .Where(p => p.ReviewNeeded || p.PolygonQuality < 0.5)
            .OrderBy(p => p.PolygonQuality)
            .ThenBy(p => p.VenueId)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Patio>> GetPatiosByQualityRangeAsync(double minQuality, double maxQuality, CancellationToken cancellationToken = default)
    {
        return await _context.Patios
            .Include(p => p.Venue)
            .Where(p => p.PolygonQuality >= minQuality && p.PolygonQuality <= maxQuality)
            .OrderBy(p => p.PolygonQuality)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Patio>> GetPatiosByHeightSourceAsync(HeightSource heightSource, CancellationToken cancellationToken = default)
    {
        return await _context.Patios
            .Include(p => p.Venue)
            .Where(p => p.HeightSource == heightSource)
            .OrderBy(p => p.VenueId)
            .ThenBy(p => p.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Patio>> GetPatiosNearPointAsync(Point location, double radiusKm, CancellationToken cancellationToken = default)
    {
        // Convert km to degrees (rough approximation)
        var radiusDegrees = radiusKm / 111.0;
        
        return await _context.Patios
            .Include(p => p.Venue)
            .Where(p => p.Geometry.Distance(location) <= radiusDegrees)
            .OrderBy(p => p.Geometry.Distance(location))
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Patio>> GetPatiosWithinBoundsAsync(Polygon bounds, CancellationToken cancellationToken = default)
    {
        return await _context.Patios
            .Include(p => p.Venue)
            .Where(p => bounds.Intersects(p.Geometry))
            .OrderBy(p => p.VenueId)
            .ThenBy(p => p.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Patio?> FindPatioContainingPointAsync(Point location, CancellationToken cancellationToken = default)
    {
        return await _context.Patios
            .Include(p => p.Venue)
            .FirstOrDefaultAsync(p => p.Geometry.Contains(location), cancellationToken);
    }

    public async Task<double> GetAverageQualityScoreAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Patios.AverageAsync(p => p.PolygonQuality, cancellationToken);
    }

    public async Task<double> GetAverageQualityScoreForVenueAsync(int venueId, CancellationToken cancellationToken = default)
    {
        var patios = await _context.Patios
            .Where(p => p.VenueId == venueId)
            .ToListAsync(cancellationToken);
            
        return patios.Any() ? patios.Average(p => p.PolygonQuality) : 0.0;
    }

    public async Task<int> CountPatiosRequiringReviewAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Patios
            .CountAsync(p => p.ReviewNeeded || p.PolygonQuality < 0.5, cancellationToken);
    }

    public async Task<int> BulkInsertAsync(IEnumerable<Patio> patios, CancellationToken cancellationToken = default)
    {
        var patioList = patios.ToList();
        var now = DateTime.UtcNow;
        
        foreach (var patio in patioList)
        {
            patio.CreatedAt = now;
            patio.UpdatedAt = now;
        }
        
        _context.Patios.AddRange(patioList);
        await _context.SaveChangesAsync(cancellationToken);
        
        return patioList.Count;
    }

    public async Task<int> CountAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Patios.CountAsync(cancellationToken);
    }

    public async Task<int> CountByVenueAsync(int venueId, CancellationToken cancellationToken = default)
    {
        return await _context.Patios.CountAsync(p => p.VenueId == venueId, cancellationToken);
    }

    public async Task<IEnumerable<Patio>> GetByIdsAsync(IEnumerable<int> ids, CancellationToken cancellationToken = default)
    {
        return await _context.Patios
            .Include(p => p.Venue)
            .Where(p => ids.Contains(p.Id))
            .ToListAsync(cancellationToken);
    }
}