using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Data.Repositories;

/// <summary>
/// Repository implementation for venue data access operations
/// </summary>
public class VenueRepository : IVenueRepository
{
    private readonly SunnySeatDbContext _context;

    public VenueRepository(SunnySeatDbContext context)
    {
        _context = context;
    }

    public async Task<Venue?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Venues
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);
    }

    public async Task<Venue?> GetByIdWithPatiosAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Venues
            .Include(v => v.Patios)
            .FirstOrDefaultAsync(v => v.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<Venue>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Venues
            .OrderBy(v => v.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Venue>> GetAllWithPatiosAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Venues
            .Include(v => v.Patios)
            .OrderBy(v => v.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Venue> CreateAsync(Venue venue, CancellationToken cancellationToken = default)
    {
        venue.CreatedAt = DateTime.UtcNow;
        venue.UpdatedAt = DateTime.UtcNow;

        _context.Venues.Add(venue);
        await _context.SaveChangesAsync(cancellationToken);
        return venue;
    }

    public async Task<Venue> UpdateAsync(Venue venue, CancellationToken cancellationToken = default)
    {
        venue.UpdatedAt = DateTime.UtcNow;

        _context.Venues.Update(venue);
        await _context.SaveChangesAsync(cancellationToken);
        return venue;
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var venue = await _context.Venues.FindAsync(new object[] { id }, cancellationToken);
        if (venue == null) return false;

        _context.Venues.Remove(venue);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ExistsAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Venues.AnyAsync(v => v.Id == id, cancellationToken);
    }

    public async Task<IEnumerable<Venue>> SearchByNameAsync(string name, CancellationToken cancellationToken = default)
    {
        // Use different query strategies based on database provider
        if (_context.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory")
        {
            // InMemory provider doesn't support ILike - use case-insensitive Contains
            var venues = await _context.Venues.ToListAsync(cancellationToken);
            return venues
                .Where(v => v.Name.Contains(name, StringComparison.OrdinalIgnoreCase))
                .OrderBy(v => v.Name)
                .ToList();
        }
        else
        {
            // PostgreSQL supports ILike for case-insensitive pattern matching
            return await _context.Venues
                .Where(v => EF.Functions.ILike(v.Name, $"%{name}%"))
                .OrderBy(v => v.Name)
                .ToListAsync(cancellationToken);
        }
    }

    public async Task<IEnumerable<Venue>> SearchByAddressAsync(string address, CancellationToken cancellationToken = default)
    {
        // Use different query strategies based on database provider
        if (_context.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory")
        {
            // InMemory provider doesn't support ILike - use case-insensitive Contains
            var venues = await _context.Venues.ToListAsync(cancellationToken);
            return venues
                .Where(v => v.Address.Contains(address, StringComparison.OrdinalIgnoreCase))
                .OrderBy(v => v.Name)
                .ToList();
        }
        else
        {
            // PostgreSQL supports ILike for case-insensitive pattern matching
            return await _context.Venues
                .Where(v => EF.Functions.ILike(v.Address, $"%{address}%"))
                .OrderBy(v => v.Name)
                .ToListAsync(cancellationToken);
        }
    }

    public async Task<IEnumerable<Venue>> GetByTypeAsync(VenueType type, CancellationToken cancellationToken = default)
    {
        return await _context.Venues
            .Where(v => v.Type == type)
            .OrderBy(v => v.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Venue>> GetActiveVenuesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Venues
            .Where(v => v.IsActive)
            .OrderBy(v => v.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Venue>> GetUnmappedVenuesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Venues
            .Where(v => !v.IsMapped)
            .OrderBy(v => v.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Venue>> GetVenuesNearPointAsync(Point location, double radiusKm, CancellationToken cancellationToken = default)
    {
        // Convert km to degrees (rough approximation)
        var radiusDegrees = radiusKm / 111.0;

        return await _context.Venues
            .Where(v => v.Location.Distance(location) <= radiusDegrees)
            .OrderBy(v => v.Location.Distance(location))
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Venue>> GetVenuesWithinBoundsAsync(Polygon bounds, CancellationToken cancellationToken = default)
    {
        return await _context.Venues
            .Where(v => bounds.Contains(v.Location))
            .OrderBy(v => v.Name)
            .ToListAsync(cancellationToken);
    }

    public async Task<Venue?> FindNearestVenueAsync(Point location, CancellationToken cancellationToken = default)
    {
        return await _context.Venues
            .OrderBy(v => v.Location.Distance(location))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<int> BulkInsertAsync(IEnumerable<Venue> venues, CancellationToken cancellationToken = default)
    {
        var venueList = venues.ToList();
        var now = DateTime.UtcNow;

        // Filter out duplicates based on name and address (case-insensitive)
        var existingVenues = await _context.Venues
            .Select(v => new { v.Name, v.Address })
            .ToListAsync(cancellationToken);

        var existingKeys = existingVenues
            .Select(v => $"{v.Name.ToLowerInvariant()}|{v.Address.ToLowerInvariant()}")
            .ToHashSet();

        var newVenues = venueList
            .Where(v => !existingKeys.Contains($"{v.Name.ToLowerInvariant()}|{v.Address.ToLowerInvariant()}"))
            .ToList();

        foreach (var venue in newVenues)
        {
            venue.CreatedAt = now;
            venue.UpdatedAt = now;
        }

        if (newVenues.Any())
        {
            _context.Venues.AddRange(newVenues);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return newVenues.Count;
    }

    public async Task<int> CountAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Venues.CountAsync(cancellationToken);
    }

    public async Task<int> CountByTypeAsync(VenueType type, CancellationToken cancellationToken = default)
    {
        return await _context.Venues.CountAsync(v => v.Type == type, cancellationToken);
    }
}