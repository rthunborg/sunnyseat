using Microsoft.EntityFrameworkCore;
using SunnySeat.Core.Services;
using SunnySeat.Core.Interfaces;
using SunnySeat.Data;

namespace SunnySeat.Api.Endpoints;

/// <summary>
/// Admin endpoints for building data management
/// </summary>
public static class BuildingEndpoints
{
    public static void MapBuildingEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/admin/buildings")
            .WithTags("Buildings (Admin)")
            .RequireAuthorization("AdminOnly"); // Require admin authentication

        // Get building statistics
        group.MapGet("/stats", GetBuildingStatsAsync)
            .WithName("GetBuildingStats")
            .WithSummary("Get building data statistics");

        // Search buildings by location
        group.MapGet("/search", SearchBuildingsAsync)
            .WithName("SearchBuildings")
            .WithSummary("Search buildings within radius of coordinates");

        // Get building by ID
        group.MapGet("/{id:int}", GetBuildingByIdAsync)
            .WithName("GetBuildingById")
            .WithSummary("Get specific building details");

        // Import status endpoint
        group.MapGet("/import-status", GetImportStatusAsync)
            .WithName("GetImportStatus")
            .WithSummary("Get latest import operation status");

        // GDAL status endpoint - now properly implemented
        group.MapGet("/gdal-status", GetGdalStatusAsync)
            .WithName("GetGdalStatus")
            .WithSummary("Check GDAL availability for imports");
    }

    private static async Task<IResult> GetBuildingStatsAsync(SunnySeatDbContext dbContext)
    {
        try
        {
            var stats = await dbContext.Buildings
                .GroupBy(b => b.Source)
                .Select(g => new { Source = g.Key, Count = g.Count() })
                .ToListAsync();

            var totalCount = await dbContext.Buildings.CountAsync();

            // Handle empty collections - AverageAsync throws on empty sequences
            var avgHeight = totalCount > 0
                ? await dbContext.Buildings.AverageAsync(b => b.Height)
                : 0.0;
            var avgQuality = totalCount > 0
                ? await dbContext.Buildings.AverageAsync(b => b.QualityScore)
                : 0.0;

            var response = new
            {
                TotalBuildings = totalCount,
                AverageHeight = Math.Round(avgHeight, 2),
                AverageQualityScore = Math.Round(avgQuality, 3),
                BySource = stats,
                LastUpdated = DateTime.UtcNow
            };

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error getting building statistics: {ex.Message}");
        }
    }

    private static async Task<IResult> SearchBuildingsAsync(
        SunnySeatDbContext dbContext,
        double lat,
        double lng,
        double radius = 1000,
        int limit = 50)
    {
        try
        {
            if (lat < -90 || lat > 90)
                return Results.BadRequest("Latitude must be between -90 and 90");

            if (lng < -180 || lng > 180)
                return Results.BadRequest("Longitude must be between -180 and 180");

            if (radius <= 0 || radius > 10000)
                return Results.BadRequest("Radius must be between 0 and 10000 meters");

            if (limit <= 0 || limit > 100)
                return Results.BadRequest("Limit must be between 1 and 100");

            // TODO: Implement proper spatial query - this is a simplified version
            // For now, get buildings within a bounding box approximation
            var latDelta = radius / 111000.0; // Approximate degrees per meter
            var lngDelta = radius / (111000.0 * Math.Cos(lat * Math.PI / 180));

            var buildings = await dbContext.Buildings
                .Where(b => Math.Abs(b.Geometry.Centroid.Y - lat) <= latDelta &&
                           Math.Abs(b.Geometry.Centroid.X - lng) <= lngDelta)
                .Take(limit)
                .Select(b => new
                {
                    b.Id,
                    b.Height,
                    b.Source,
                    b.QualityScore,
                    b.ExternalId,
                    Geometry = b.Geometry.AsText(),
                    b.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(new
            {
                Buildings = buildings,
                Count = buildings.Count,
                SearchRadius = radius,
                SearchCenter = new { Latitude = lat, Longitude = lng }
            });
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error searching buildings: {ex.Message}");
        }
    }

    private static async Task<IResult> GetBuildingByIdAsync(int id, SunnySeatDbContext dbContext)
    {
        try
        {
            var building = await dbContext.Buildings
                .Where(b => b.Id == id)
                .Select(b => new
                {
                    b.Id,
                    b.Height,
                    b.Source,
                    b.QualityScore,
                    b.ExternalId,
                    Geometry = b.Geometry.AsText(),
                    Area = b.Geometry.Area,
                    Centroid = b.Geometry.Centroid.AsText(),
                    b.CreatedAt,
                    b.UpdatedAt
                })
                .FirstOrDefaultAsync();

            if (building == null)
                return Results.NotFound($"Building with ID {id} not found");

            return Results.Ok(building);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error getting building: {ex.Message}");
        }
    }

    private static async Task<IResult> GetImportStatusAsync(SunnySeatDbContext dbContext)
    {
        try
        {
            // Get latest import statistics
            var latestBuilding = await dbContext.Buildings
                .OrderByDescending(b => b.CreatedAt)
                .FirstOrDefaultAsync();

            var buildingsToday = await dbContext.Buildings
                .CountAsync(b => b.CreatedAt >= DateTime.UtcNow.Date);

            var response = new
            {
                LatestImport = latestBuilding?.CreatedAt,
                BuildingsImportedToday = buildingsToday,
                TotalBuildings = await dbContext.Buildings.CountAsync(),
                ImportSources = await dbContext.Buildings
                    .GroupBy(b => b.Source)
                    .Select(g => new { Source = g.Key, Count = g.Count(), Latest = g.Max(b => b.CreatedAt) })
                    .ToListAsync()
            };

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error getting import status: {ex.Message}");
        }
    }

    private static async Task<IResult> GetGdalStatusAsync(IBuildingImportService importService)
    {
        try
        {
            var status = await importService.CheckGdalAvailabilityAsync();

            return Results.Ok(new
            {
                status.IsAvailable,
                status.Version,
                status.ErrorMessage,
                status.HasPostGISSupport,
                status.AvailableDrivers,
                CheckedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error checking GDAL status: {ex.Message}");
        }
    }
}