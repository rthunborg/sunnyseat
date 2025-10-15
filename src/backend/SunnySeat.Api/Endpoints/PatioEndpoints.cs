using Microsoft.AspNetCore.Mvc;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Models.Requests;
using SunnySeat.Core.Models.Responses;

namespace SunnySeat.Api.Endpoints;

/// <summary>
/// Patio search endpoints for finding sunny patios by location
/// </summary>
public static class PatioEndpoints
{
    private const double MaxRadiusKm = 3.0;
    private const double DefaultRadiusKm = 1.5;
    private const int MaxResults = 50;

    /// <summary>
    /// Map patio-related endpoints
    /// </summary>
    public static RouteGroupBuilder MapPatioApi(this RouteGroupBuilder group)
    {
        group.MapGet("/", GetPatiosAsync)
            .WithName("GetPatios")
            .WithSummary("Search for patios by location with current sun exposure")
            .WithDescription("Returns patios within specified radius with real-time sun exposure calculations. " +
                           "Default radius is 1.5km, maximum is 3km. Results are limited to 50 patios.")
            .AllowAnonymous()
            .Produces<GetPatiosResponse>(StatusCodes.Status200OK)
            .Produces<ProblemDetails>(StatusCodes.Status400BadRequest)
            .Produces<ProblemDetails>(StatusCodes.Status429TooManyRequests)
            .Produces<ProblemDetails>(StatusCodes.Status500InternalServerError);

        return group;
    }

    /// <summary>
    /// Search for patios near a location with current sun exposure data
    /// </summary>
    private static async Task<IResult> GetPatiosAsync(
        HttpRequest httpRequest,
        [FromServices] IPatioRepository patioRepository,
        [FromServices] ISunExposureService sunExposureService,
        CancellationToken cancellationToken)
    {
        // Parse query parameters manually
        if (!double.TryParse(httpRequest.Query["latitude"], out var latitude))
        {
            return Results.BadRequest(new ProblemDetails
            {
                Title = "Missing or invalid latitude",
                Detail = "Latitude parameter is required and must be a valid number",
                Status = StatusCodes.Status400BadRequest
            });
        }

        if (!double.TryParse(httpRequest.Query["longitude"], out var longitude))
        {
            return Results.BadRequest(new ProblemDetails
            {
                Title = "Missing or invalid longitude",
                Detail = "Longitude parameter is required and must be a valid number",
                Status = StatusCodes.Status400BadRequest
            });
        }

        double? radiusKm = null;
        if (httpRequest.Query.ContainsKey("radiusKm"))
        {
            if (double.TryParse(httpRequest.Query["radiusKm"], out var parsed))
            {
                radiusKm = parsed;
            }
        }

        // Validate input
        if (latitude < -90 || latitude > 90)
        {
            return Results.BadRequest(new ProblemDetails
            {
                Title = "Invalid latitude",
                Detail = "Latitude must be between -90 and 90 degrees",
                Status = StatusCodes.Status400BadRequest
            });
        }

        if (longitude < -180 || longitude > 180)
        {
            return Results.BadRequest(new ProblemDetails
            {
                Title = "Invalid longitude",
                Detail = "Longitude must be between -180 and 180 degrees",
                Status = StatusCodes.Status400BadRequest
            });
        }

        var radius = radiusKm ?? DefaultRadiusKm;
        if (radius <= 0 || radius > MaxRadiusKm)
        {
            return Results.BadRequest(new ProblemDetails
            {
                Title = "Invalid radius",
                Detail = $"Radius must be between 0 and {MaxRadiusKm} km",
                Status = StatusCodes.Status400BadRequest
            });
        }

        try
        {
            // Create search point (EPSG:4326 - WGS84)
            var geometryFactory = NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);
            var searchPoint = geometryFactory.CreatePoint(new Coordinate(longitude, latitude));

            // Get patios near location
            var patios = await patioRepository.GetPatiosNearPointAsync(
                searchPoint,
                radius,
                cancellationToken);

            var patiosList = patios.ToList();

            if (!patiosList.Any())
            {
                return Results.Ok(new GetPatiosResponse
                {
                    Patios = Array.Empty<PatioDataDto>(),
                    Timestamp = DateTime.UtcNow,
                    TotalCount = 0
                });
            }

            // Calculate sun exposure for all patios (batch operation for efficiency)
            var timestamp = DateTime.UtcNow;
            var patioIds = patiosList.Select(p => p.Id).ToList();
            var sunExposures = await sunExposureService.CalculateBatchSunExposureAsync(
                patioIds,
                timestamp,
                cancellationToken);

            // Build response DTOs
            var patioDtos = new List<PatioDataDto>();
            foreach (var patio in patiosList)
            {
                if (!sunExposures.TryGetValue(patio.Id, out var sunExposure))
                {
                    continue; // Skip if sun exposure calculation failed
                }

                // Calculate distance from search point
                var patioCenter = patio.Geometry.Centroid;
                var distanceMeters = searchPoint.Distance(patioCenter) * 111320; // Rough conversion: 1 degree ≈ 111.32 km

                var dto = new PatioDataDto
                {
                    Id = $"{patio.VenueId}-{patio.Id}",
                    VenueId = patio.VenueId.ToString(),
                    VenueName = patio.Venue?.Name ?? "Unknown Venue",
                    Location = new CoordinatesDto
                    {
                        Latitude = patioCenter.Y,
                        Longitude = patioCenter.X
                    },
                    CurrentSunStatus = MapSunStatus(sunExposure.State),
                    Confidence = (int)Math.Round(sunExposure.Confidence), // Already 0-100
                    DistanceMeters = distanceMeters,
                    SunExposurePercent = sunExposure.SunExposurePercent
                };

                patioDtos.Add(dto);
            }

            // Sort by distance and limit results
            var sortedPatios = patioDtos
                .OrderBy(p => p.DistanceMeters)
                .Take(MaxResults)
                .ToList();

            return Results.Ok(new GetPatiosResponse
            {
                Patios = sortedPatios,
                Timestamp = timestamp,
                TotalCount = sortedPatios.Count
            });
        }
        catch (Exception ex)
        {
            // Log error (in production, use proper logging)
            Console.Error.WriteLine($"Error searching patios: {ex.Message}");

            return Results.Problem(
                title: "Error searching patios",
                detail: "An error occurred while searching for patios. Please try again.",
                statusCode: StatusCodes.Status500InternalServerError
            );
        }
    }

    /// <summary>
    /// Map SunExposureState enum to string format expected by frontend
    /// </summary>
    private static string MapSunStatus(Core.Entities.SunExposureState state)
    {
        return state switch
        {
            Core.Entities.SunExposureState.Sunny => "Sunny",
            Core.Entities.SunExposureState.Partial => "Partial",
            Core.Entities.SunExposureState.Shaded => "Shaded",
            Core.Entities.SunExposureState.NoSun => "Shaded",
            _ => "Shaded"
        };
    }
}
