using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Validation;
using NetTopologySuite.Geometries;

namespace SunnySeat.Core.Services;

/// <summary>
/// Service implementation for venue management operations
/// </summary>
public class VenueService : IVenueService
{
    private readonly IVenueRepository _venueRepository;
    private readonly IPatioRepository _patioRepository;
    private readonly IDataQualityService _dataQualityService;

    public VenueService(
        IVenueRepository venueRepository,
        IPatioRepository patioRepository,
        IDataQualityService dataQualityService)
    {
        _venueRepository = venueRepository;
        _patioRepository = patioRepository;
        _dataQualityService = dataQualityService;
    }

    // Basic CRUD operations
    public async Task<Venue?> GetVenueByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _venueRepository.GetByIdAsync(id, cancellationToken);
    }

    public async Task<IEnumerable<Venue>> GetAllVenuesAsync(CancellationToken cancellationToken = default)
    {
        return await _venueRepository.GetAllAsync(cancellationToken);
    }

    public async Task<IEnumerable<Venue>> GetVenuesByTypeAsync(VenueType type, CancellationToken cancellationToken = default)
    {
        return await _venueRepository.GetByTypeAsync(type, cancellationToken);
    }

    public async Task<IEnumerable<Venue>> SearchVenuesAsync(string searchTerm, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
            return await GetAllVenuesAsync(cancellationToken);

        // Search by name first
        var nameResults = await _venueRepository.SearchByNameAsync(searchTerm, cancellationToken);

        // Search by address and combine results
        var addressResults = await _venueRepository.SearchByAddressAsync(searchTerm, cancellationToken);

        // Combine and deduplicate results
        var combinedResults = nameResults.Union(addressResults).Distinct().OrderBy(v => v.Name);

        return combinedResults;
    }

    public async Task<Venue> CreateVenueAsync(Venue venue, CancellationToken cancellationToken = default)
    {
        // Validate basic venue data (no patio requirement for creation)
        var issues = VenueValidator.GetImportValidationIssues(venue);

        // Check for duplicates at same location
        if (venue.Location != null)
        {
            var nearbyVenues = await _venueRepository.GetVenuesNearPointAsync(venue.Location, 0.1, cancellationToken); // 100m radius
            var duplicates = nearbyVenues.Where(v =>
                string.Equals(v.Name, venue.Name, StringComparison.OrdinalIgnoreCase));
            if (duplicates.Any())
            {
                issues.Add("Potential duplicate venue found at similar location");
            }
        }

        if (issues.Any())
        {
            throw new ArgumentException($"Venue validation failed: {string.Join(", ", issues)}");
        }

        return await _venueRepository.CreateAsync(venue, cancellationToken);
    }

    public async Task<Venue> UpdateVenueAsync(Venue venue, CancellationToken cancellationToken = default)
    {
        var existingVenue = await _venueRepository.GetByIdAsync(venue.Id, cancellationToken);
        if (existingVenue == null)
            throw new ArgumentException($"Venue with ID {venue.Id} not found");

        // Validate venue data
        var isValid = await _dataQualityService.ValidateVenueAsync(venue);
        if (!isValid)
        {
            var issues = await _dataQualityService.GetVenueValidationIssuesAsync(venue);
            throw new ArgumentException($"Venue validation failed: {string.Join(", ", issues)}");
        }

        // Update mapping status based on patios
        var patios = await _patioRepository.GetByVenueIdAsync(venue.Id, cancellationToken);
        venue.IsMapped = patios.Any();

        return await _venueRepository.UpdateAsync(venue, cancellationToken);
    }

    public async Task<bool> DeleteVenueAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _venueRepository.DeleteAsync(id, cancellationToken);
    }

    // Mapping status operations
    public async Task<IEnumerable<Venue>> GetUnmappedVenuesAsync(CancellationToken cancellationToken = default)
    {
        return await _venueRepository.GetUnmappedVenuesAsync(cancellationToken);
    }

    public async Task<bool> MarkVenueAsMappedAsync(int venueId, CancellationToken cancellationToken = default)
    {
        var venue = await _venueRepository.GetByIdAsync(venueId, cancellationToken);
        if (venue == null) return false;

        venue.IsMapped = true;
        await _venueRepository.UpdateAsync(venue, cancellationToken);
        return true;
    }

    // Spatial operations
    public async Task<IEnumerable<Venue>> GetVenuesNearLocationAsync(Point location, double radiusKm, CancellationToken cancellationToken = default)
    {
        return await _venueRepository.GetVenuesNearPointAsync(location, radiusKm, cancellationToken);
    }

    public async Task<IEnumerable<Venue>> GetVenuesWithinBoundsAsync(Polygon bounds, CancellationToken cancellationToken = default)
    {
        return await _venueRepository.GetVenuesWithinBoundsAsync(bounds, cancellationToken);
    }

    // Patio operations
    public async Task<IEnumerable<Patio>> GetPatiosForVenueAsync(int venueId, CancellationToken cancellationToken = default)
    {
        return await _patioRepository.GetByVenueIdAsync(venueId, cancellationToken);
    }

    public async Task<Patio> CreatePatioAsync(int venueId, Patio patio, CancellationToken cancellationToken = default)
    {
        // Ensure venue exists
        var venue = await _venueRepository.GetByIdAsync(venueId, cancellationToken);
        if (venue == null)
            throw new ArgumentException($"Venue with ID {venueId} not found");

        // Set venue ID and validate patio
        patio.VenueId = venueId;
        var isValid = await _dataQualityService.ValidatePatioAsync(patio);
        if (!isValid)
        {
            var issues = await _dataQualityService.GetPatioValidationIssuesAsync(patio);
            throw new ArgumentException($"Patio validation failed: {string.Join(", ", issues)}");
        }

        var createdPatio = await _patioRepository.CreateAsync(patio, cancellationToken);

        // Update venue mapping status
        await MarkVenueAsMappedAsync(venueId, cancellationToken);

        return createdPatio;
    }

    public async Task<Patio> UpdatePatioAsync(Patio patio, CancellationToken cancellationToken = default)
    {
        var existingPatio = await _patioRepository.GetByIdAsync(patio.Id, cancellationToken);
        if (existingPatio == null)
            throw new ArgumentException($"Patio with ID {patio.Id} not found");

        // Validate patio data
        var isValid = await _dataQualityService.ValidatePatioAsync(patio);
        if (!isValid)
        {
            var issues = await _dataQualityService.GetPatioValidationIssuesAsync(patio);
            throw new ArgumentException($"Patio validation failed: {string.Join(", ", issues)}");
        }

        return await _patioRepository.UpdateAsync(patio, cancellationToken);
    }

    public async Task<bool> DeletePatioAsync(int patioId, CancellationToken cancellationToken = default)
    {
        var patio = await _patioRepository.GetByIdAsync(patioId, cancellationToken);
        if (patio == null) return false;

        var venueId = patio.VenueId;
        var deleted = await _patioRepository.DeleteAsync(patioId, cancellationToken);

        if (deleted)
        {
            // Check if venue still has patios
            var remainingPatios = await _patioRepository.GetByVenueIdAsync(venueId, cancellationToken);
            if (!remainingPatios.Any())
            {
                var venue = await _venueRepository.GetByIdAsync(venueId, cancellationToken);
                if (venue != null)
                {
                    venue.IsMapped = false;
                    await _venueRepository.UpdateAsync(venue, cancellationToken);
                }
            }
        }

        return deleted;
    }

    // Quality validation
    public async Task<VenueQualityMetrics> CalculateVenueQualityAsync(int venueId, CancellationToken cancellationToken = default)
    {
        return await _dataQualityService.ValidateVenueDetailedAsync(venueId, cancellationToken);
    }

    public async Task<IEnumerable<VenueQualityMetrics>> ValidateAllVenuesAsync(CancellationToken cancellationToken = default)
    {
        return await _dataQualityService.ValidateAllVenuesAsync(cancellationToken);
    }

    // Data management
    public async Task<int> ImportVenuesAsync(IEnumerable<Venue> venues, CancellationToken cancellationToken = default)
    {
        var venueList = venues.ToList();
        var validVenues = new List<Venue>();

        foreach (var venue in venueList)
        {
            // Use import-specific validation (no patio requirement) for bulk imports
            var issues = VenueValidator.GetImportValidationIssues(venue);
            if (!issues.Any())
            {
                validVenues.Add(venue);
            }
        }

        if (validVenues.Any())
        {
            return await _venueRepository.BulkInsertAsync(validVenues, cancellationToken);
        }

        return 0;
    }

    public async Task<IEnumerable<Venue>> ExportVenuesAsync(bool includePatios = true, CancellationToken cancellationToken = default)
    {
        if (includePatios)
        {
            return await _venueRepository.GetAllWithPatiosAsync(cancellationToken);
        }
        else
        {
            return await _venueRepository.GetAllAsync(cancellationToken);
        }
    }
}