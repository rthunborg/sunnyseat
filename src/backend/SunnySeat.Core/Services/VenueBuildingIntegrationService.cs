using Microsoft.Extensions.Logging;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Core.Services;

/// <summary>
/// Service for integrating venue data with building geodata from GeoPackage files
/// </summary>
public class VenueBuildingIntegrationService
{
    private readonly IVenueService _venueService;
    private readonly IBuildingRepository _buildingRepository;
    private readonly ILogger<VenueBuildingIntegrationService> _logger;

    public VenueBuildingIntegrationService(
        IVenueService venueService,
        IBuildingRepository buildingRepository,
        ILogger<VenueBuildingIntegrationService> logger)
    {
        _venueService = venueService;
        _buildingRepository = buildingRepository;
        _logger = logger;
    }

    /// <summary>
    /// Creates sample patio polygons for venues based on nearby building geometries
    /// </summary>
    public async Task<int> CreateSamplePatiosForVenuesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Starting sample patio creation based on building geodata...");

            var venues = await _venueService.GetAllVenuesAsync(cancellationToken);
            var unmappedVenues = venues.Where(v => !v.IsMapped).ToList();

            _logger.LogInformation("Found {Count} unmapped venues to process", unmappedVenues.Count);

            var patiosCreated = 0;

            foreach (var venue in unmappedVenues.Take(20)) // Process first 20 for demonstration
            {
                try
                {
                    // Find nearby buildings within 50m radius
                    var nearbyBuildings = await _buildingRepository.GetBuildingsNearPointAsync(
                        venue.Location, 0.05, cancellationToken); // 50m in rough degrees

                    if (nearbyBuildings.Any())
                    {
                        var closestBuilding = nearbyBuildings.First();
                        var samplePatio = CreateSamplePatioFromBuilding(venue, closestBuilding);

                        await _venueService.CreatePatioAsync(venue.Id, samplePatio, cancellationToken);
                        patiosCreated++;

                        _logger.LogDebug("Created sample patio for venue '{VenueName}' based on building", venue.Name);
                    }
                    else
                    {
                        // Create a generic small patio if no buildings found
                        var genericPatio = CreateGenericPatio(venue);
                        await _venueService.CreatePatioAsync(venue.Id, genericPatio, cancellationToken);
                        patiosCreated++;

                        _logger.LogDebug("Created generic patio for venue '{VenueName}' (no nearby buildings)", venue.Name);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to create patio for venue '{VenueName}'", venue.Name);
                    // Continue with next venue
                }
            }

            _logger.LogInformation("Successfully created {Count} sample patios", patiosCreated);
            return patiosCreated;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating sample patios from building data");
            throw;
        }
    }

    /// <summary>
    /// Creates a sample patio polygon based on a building's geometry
    /// </summary>
    private Patio CreateSamplePatioFromBuilding(Venue venue, Building building)
    {
        // Create a smaller polygon adjacent to the building
        var buildingEnvelope = building.Geometry.EnvelopeInternal;
        var centerX = buildingEnvelope.Centre.X;
        var centerY = buildingEnvelope.Centre.Y;
        
        // Create a small patio polygon (roughly 5x5 meters in degrees)
        var patioSize = 0.00005; // Roughly 5 meters in degrees at Gothenburg latitude
        
        var coordinates = new[]
        {
            new Coordinate(centerX - patioSize, centerY - patioSize),
            new Coordinate(centerX + patioSize, centerY - patioSize),
            new Coordinate(centerX + patioSize, centerY + patioSize),
            new Coordinate(centerX - patioSize, centerY + patioSize),
            new Coordinate(centerX - patioSize, centerY - patioSize) // Close the polygon
        };

        return new Patio
        {
            VenueId = venue.Id,
            Name = $"{venue.Name} - Main Patio",
            Geometry = new Polygon(new LinearRing(coordinates)) { SRID = 4326 },
            PolygonQuality = 0.6, // Medium quality for generated data
            HeightSource = HeightSource.Heuristic,
            ReviewNeeded = true, // Generated patios should be reviewed
            Orientation = DetermineOrientation(coordinates),
            Notes = $"Sample patio generated from building data for {venue.Type.ToString().ToLower()}",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Creates a generic patio when no building data is available
    /// </summary>
    private Patio CreateGenericPatio(Venue venue)
    {
        var centerX = venue.Location.X;
        var centerY = venue.Location.Y;
        
        // Create a small generic patio polygon
        var patioSize = 0.00003; // Roughly 3 meters in degrees
        
        var coordinates = new[]
        {
            new Coordinate(centerX + patioSize, centerY),
            new Coordinate(centerX + patioSize * 2, centerY),
            new Coordinate(centerX + patioSize * 2, centerY + patioSize),
            new Coordinate(centerX + patioSize, centerY + patioSize),
            new Coordinate(centerX + patioSize, centerY) // Close the polygon
        };

        return new Patio
        {
            VenueId = venue.Id,
            Name = $"{venue.Name} - Outdoor Seating",
            Geometry = new Polygon(new LinearRing(coordinates)) { SRID = 4326 },
            PolygonQuality = 0.3, // Lower quality for generic data
            HeightSource = HeightSource.Heuristic,
            ReviewNeeded = true,
            Orientation = "Unknown",
            Notes = $"Generic patio created for {venue.Type.ToString().ToLower()} - requires review and adjustment",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Determines approximate orientation of a patio based on its coordinates
    /// </summary>
    private string DetermineOrientation(Coordinate[] coordinates)
    {
        if (coordinates.Length < 4) return "Unknown";

        // Simple heuristic: check if patio is longer in X or Y direction
        var minX = coordinates.Min(c => c.X);
        var maxX = coordinates.Max(c => c.X);
        var minY = coordinates.Min(c => c.Y);
        var maxY = coordinates.Max(c => c.Y);

        var widthX = maxX - minX;
        var widthY = maxY - minY;

        if (widthX > widthY * 1.5)
            return "East-West";
        else if (widthY > widthX * 1.5)
            return "North-South";
        else
            return "Square";
    }

    /// <summary>
    /// Validates venue locations against building data and updates quality scores
    /// </summary>
    public async Task<int> ValidateVenueLocationsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Starting venue location validation against building data...");

            var venues = await _venueService.GetAllVenuesAsync(cancellationToken);
            var validatedCount = 0;

            foreach (var venue in venues)
            {
                try
                {
                    // Check if venue location is near actual buildings
                    var nearbyBuildings = await _buildingRepository.GetBuildingsNearPointAsync(
                        venue.Location, 0.01, cancellationToken); // 10m radius

                    var hasNearbyBuildings = nearbyBuildings.Any();
                    
                    // Log venues that might have location issues
                    if (!hasNearbyBuildings)
                    {
                        _logger.LogInformation("Venue '{VenueName}' at ({Lat}, {Lng}) has no nearby buildings - may need location review",
                            venue.Name, venue.Location.Y, venue.Location.X);
                    }

                    validatedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to validate location for venue '{VenueName}'", venue.Name);
                }
            }

            _logger.LogInformation("Validated {Count} venue locations against building data", validatedCount);
            return validatedCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating venue locations");
            throw;
        }
    }
}