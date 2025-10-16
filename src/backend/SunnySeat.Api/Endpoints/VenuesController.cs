using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NetTopologySuite.Geometries;
using NetTopologySuite.IO;
using Newtonsoft.Json;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Services;

namespace SunnySeat.Api.Endpoints;

public static class VenueEndpoints
{
    /// <summary>
    /// Maps venue management endpoints to the route group
    /// </summary>
    public static RouteGroupBuilder MapVenuesApi(this RouteGroupBuilder group)
    {
        // Get all venues with optional filtering
        group.MapGet("/", GetVenues)
            .WithName("GetVenues")
            .WithSummary("Get all venues with optional filtering");

        // Get venue by ID with patios
        group.MapGet("/{id:int}", GetVenue)
            .WithName("GetVenue")
            .WithSummary("Get venue by ID with patios");

        // Get venue by slug (must come before Create to avoid route conflict)
        group.MapGet("/slug/{slug}", GetVenueBySlug)
            .WithName("GetVenueBySlug")
            .WithSummary("Get venue by slug with patios");

        // Create a new venue
        group.MapPost("/", CreateVenue)
            .WithName("CreateVenue")
            .WithSummary("Create a new venue")
            .Accepts<Venue>("application/json")
            .Produces<Venue>(201)
            .ProducesValidationProblem()
            .ProducesProblem(400);

        // Update an existing venue
        group.MapPut("/{id:int}", UpdateVenue)
            .WithName("UpdateVenue")
            .WithSummary("Update an existing venue")
            .Accepts<Venue>("application/json")
            .Produces<Venue>(200)
            .ProducesValidationProblem()
            .ProducesProblem(400)
            .ProducesProblem(404);

        // Delete a venue
        group.MapDelete("/{id:int}", DeleteVenue)
            .WithName("DeleteVenue")
            .WithSummary("Delete a venue");

        // Get venues that haven't been mapped with patios
        group.MapGet("/unmapped", GetUnmappedVenues)
            .WithName("GetUnmappedVenues")
            .WithSummary("Get venues that haven't been mapped with patios");

        // Get venues near a location
        group.MapGet("/nearby", GetVenuesNearby)
            .WithName("GetVenuesNearby")
            .WithSummary("Get venues near a location");

        // Get all patios for a venue
        group.MapGet("/{id:int}/patios", GetVenuePatios)
            .WithName("GetVenuePatios")
            .WithSummary("Get all patios for a venue");

        // Create a new patio for a venue
        group.MapPost("/{id:int}/patios", CreatePatio)
            .WithName("CreatePatio")
            .WithSummary("Create a new patio for a venue")
            .Accepts<Patio>("application/json")
            .Produces<Patio>(201)
            .ProducesValidationProblem()
            .ProducesProblem(400)
            .ProducesProblem(404);

        // Get quality metrics for a venue
        group.MapGet("/{id:int}/quality", GetVenueQuality)
            .WithName("GetVenueQuality")
            .WithSummary("Get quality metrics for a venue");

        // Get overall quality metrics for all venues
        group.MapGet("/quality/overview", GetQualityOverview)
            .WithName("GetQualityOverview")
            .WithSummary("Get overall quality metrics for all venues");

        // Validate all venues and return quality metrics
        group.MapPost("/validate", ValidateAllVenues)
            .WithName("ValidateAllVenues")
            .WithSummary("Validate all venues and return quality metrics");

        // Export venues data (for development/testing)
        group.MapGet("/export", ExportVenues)
            .WithName("ExportVenues")
            .WithSummary("Export venues data for development/testing");

        // Seed venues with initial Gothenburg data
        group.MapPost("/seed", SeedVenues)
            .WithName("SeedVenues")
            .WithSummary("Seed venues with initial Gothenburg data");

        return group;
    }

    /// <summary>
    /// Extension methods for mapping venue API endpoints
    /// </summary>
    private static async Task<IResult> CreatePatio(
            int id,
            HttpRequest request,
            IVenueService venueService,
            CancellationToken cancellationToken = default)
    {
        try
        {
            // Manually deserialize with Newtonsoft.Json to handle NetTopologySuite geometries
            using var reader = new StreamReader(request.Body);
            var json = await reader.ReadToEndAsync(cancellationToken);

            var settings = new JsonSerializerSettings
            {
                ReferenceLoopHandling = ReferenceLoopHandling.Ignore
            };
            foreach (var converter in GeoJsonSerializer.Create().Converters)
            {
                settings.Converters.Add(converter);
            }

            var patio = JsonConvert.DeserializeObject<Patio>(json, settings);
            if (patio == null)
            {
                return Results.BadRequest("Invalid patio data");
            }

            var createdPatio = await venueService.CreatePatioAsync(id, patio, cancellationToken);

            // Serialize response with Newtonsoft.Json
            var responseJson = JsonConvert.SerializeObject(createdPatio, settings);
            return Results.Content(responseJson, "application/json", statusCode: 201);
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error creating patio: {ex.Message}");
        }
    }

    private static async Task<IResult> GetVenues(
        IVenueService venueService,
        VenueType? type = null,
        bool? mapped = null,
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            IEnumerable<Venue> venues;

            if (!string.IsNullOrWhiteSpace(search))
            {
                venues = await venueService.SearchVenuesAsync(search, cancellationToken);
            }
            else if (type.HasValue)
            {
                venues = await venueService.GetVenuesByTypeAsync(type.Value, cancellationToken);
            }
            else
            {
                venues = await venueService.GetAllVenuesAsync(cancellationToken);
            }

            if (mapped.HasValue)
            {
                venues = mapped.Value
                    ? venues.Where(v => v.IsMapped)
                    : venues.Where(v => !v.IsMapped);
            }

            // Serialize with Newtonsoft.Json to properly handle NetTopologySuite geometries
            var settings = new JsonSerializerSettings();
            foreach (var converter in GeoJsonSerializer.Create().Converters)
            {
                settings.Converters.Add(converter);
            }
            var json = JsonConvert.SerializeObject(venues, settings);

            return Results.Content(json, "application/json");
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error retrieving venues: {ex.Message}");
        }
    }

    private static async Task<IResult> GetVenue(
        int id,
        IVenueService venueService,
        ISunTimelineService sunTimelineService,
        bool includeForecasts = false,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var venue = await venueService.GetVenueByIdAsync(id, cancellationToken);
            if (venue == null)
                return Results.NotFound($"Venue with ID {id} not found");

            // If includeForecasts is true, fetch sun forecast for today and tomorrow
            if (includeForecasts && venue.Patios != null && venue.Patios.Any())
            {
                // Use first patio for MVP (later can aggregate all patios)
                var firstPatioId = venue.Patios.First().Id;

                // Get timelines for today and tomorrow
                var todayTimeline = await sunTimelineService.GetTodayTimelineAsync(firstPatioId, cancellationToken);
                var tomorrowTimeline = await sunTimelineService.GetTomorrowTimelineAsync(firstPatioId, cancellationToken);

                // Attach forecast data to response
                var venueWithForecast = new
                {
                    id = venue.Id,
                    slug = GenerateSlug(venue.Name, venue.Id),
                    name = venue.Name,
                    address = venue.Address,
                    location = new
                    {
                        latitude = venue.Location.Y,
                        longitude = venue.Location.X
                    },
                    patios = venue.Patios,
                    sunForecast = new
                    {
                        today = new
                        {
                            date = todayTimeline.StartTime.ToString("yyyy-MM-dd"),
                            sunWindows = todayTimeline.SunWindows,
                            noSunReason = todayTimeline.SunWindows.Any() ? null : "Unknown"
                        },
                        tomorrow = new
                        {
                            date = tomorrowTimeline.StartTime.ToString("yyyy-MM-dd"),
                            sunWindows = tomorrowTimeline.SunWindows,
                            noSunReason = tomorrowTimeline.SunWindows.Any() ? null : "Unknown"
                        },
                        generatedAt = DateTime.UtcNow.ToString("O")
                    }
                };

                // Serialize with Newtonsoft.Json for anonymous type with spatial data
                var settings = new JsonSerializerSettings();
                foreach (var converter in GeoJsonSerializer.Create().Converters)
                {
                    settings.Converters.Add(converter);
                }
                var json = JsonConvert.SerializeObject(venueWithForecast, settings);
                return Results.Content(json, "application/json");
            }

            // Serialize venue with Newtonsoft.Json to handle NetTopologySuite geometries
            var venueSettings = new JsonSerializerSettings();
            foreach (var converter in GeoJsonSerializer.Create().Converters)
            {
                venueSettings.Converters.Add(converter);
            }
            var venueJson = JsonConvert.SerializeObject(venue, venueSettings);
            return Results.Content(venueJson, "application/json");
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error retrieving venue: {ex.Message}");
        }
    }

    private static async Task<IResult> GetVenueBySlug(
        string slug,
        IVenueService venueService,
        ISunTimelineService sunTimelineService,
        bool includeForecasts = false,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Extract venue ID from slug (format: "venue-name-123")
            var slugParts = slug.Split('-');
            var lastPart = slugParts[^1]; // Last part should be the ID

            if (!int.TryParse(lastPart, out int venueId))
            {
                return Results.BadRequest($"Invalid slug format: '{slug}'. Expected format: 'venue-name-id'");
            }

            // Fetch venue by extracted ID
            var venue = await venueService.GetVenueByIdAsync(venueId, cancellationToken);
            if (venue == null)
                return Results.NotFound($"Venue with slug '{slug}' not found");

            // Verify slug matches (security check to prevent ID enumeration)
            var expectedSlug = GenerateSlug(venue.Name, venue.Id);
            if (!slug.Equals(expectedSlug, StringComparison.OrdinalIgnoreCase))
            {
                return Results.NotFound($"Venue with slug '{slug}' not found");
            }

            // If includeForecasts is true, fetch sun forecast for today and tomorrow
            if (includeForecasts && venue.Patios != null && venue.Patios.Any())
            {
                // Use first patio for MVP (later can aggregate all patios)
                var firstPatioId = venue.Patios.First().Id;

                // Get timelines for today and tomorrow
                var todayTimeline = await sunTimelineService.GetTodayTimelineAsync(firstPatioId, cancellationToken);
                var tomorrowTimeline = await sunTimelineService.GetTomorrowTimelineAsync(firstPatioId, cancellationToken);

                // Attach forecast data to response
                var venueWithForecast = new
                {
                    id = venue.Id,
                    slug = GenerateSlug(venue.Name, venue.Id),
                    name = venue.Name,
                    address = venue.Address,
                    location = new
                    {
                        latitude = venue.Location.Y,
                        longitude = venue.Location.X
                    },
                    patios = venue.Patios,
                    sunForecast = new
                    {
                        today = new
                        {
                            date = todayTimeline.StartTime.ToString("yyyy-MM-dd"),
                            sunWindows = todayTimeline.SunWindows,
                            noSunReason = todayTimeline.SunWindows.Any() ? null : "Unknown"
                        },
                        tomorrow = new
                        {
                            date = tomorrowTimeline.StartTime.ToString("yyyy-MM-dd"),
                            sunWindows = tomorrowTimeline.SunWindows,
                            noSunReason = tomorrowTimeline.SunWindows.Any() ? null : "Unknown"
                        },
                        generatedAt = DateTime.UtcNow.ToString("O")
                    }
                };

                // Serialize with Newtonsoft.Json for anonymous type with spatial data
                var settings = new JsonSerializerSettings();
                foreach (var converter in GeoJsonSerializer.Create().Converters)
                {
                    settings.Converters.Add(converter);
                }
                var json = JsonConvert.SerializeObject(venueWithForecast, settings);
                return Results.Content(json, "application/json");
            }

            // Serialize venue with Newtonsoft.Json to handle NetTopologySuite geometries
            var venueSettings = new JsonSerializerSettings();
            foreach (var converter in GeoJsonSerializer.Create().Converters)
            {
                venueSettings.Converters.Add(converter);
            }
            var venueJson = JsonConvert.SerializeObject(venue, venueSettings);
            return Results.Content(venueJson, "application/json");
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error retrieving venue by slug: {ex.Message}");
        }
    }

    private static string GenerateSlug(string venueName, int venueId)
    {
        var baseSlug = venueName
            .ToLowerInvariant()
            .Replace(" ", "-")
            .Replace("å", "a")
            .Replace("ä", "a")
            .Replace("ö", "o")
            .Replace("é", "e")
            .Replace("è", "e");

        // Remove non-alphanumeric characters except hyphens
        baseSlug = string.Join("", baseSlug.Where(c => char.IsLetterOrDigit(c) || c == '-'));

        // Append ID to handle collisions
        return $"{baseSlug}-{venueId}";
    }

    private static async Task<IResult> CreateVenue(
        HttpRequest request,
        IVenueService venueService,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Manually deserialize with Newtonsoft.Json to handle NetTopologySuite geometries
            using var reader = new StreamReader(request.Body);
            var json = await reader.ReadToEndAsync(cancellationToken);

            var settings = new JsonSerializerSettings();
            foreach (var converter in GeoJsonSerializer.Create().Converters)
            {
                settings.Converters.Add(converter);
            }

            var venue = JsonConvert.DeserializeObject<Venue>(json, settings);
            if (venue == null)
            {
                return Results.BadRequest("Invalid venue data");
            }

            var createdVenue = await venueService.CreateVenueAsync(venue, cancellationToken);

            // Serialize response with Newtonsoft.Json
            var responseJson = JsonConvert.SerializeObject(createdVenue, settings);
            return Results.Content(responseJson, "application/json", statusCode: 201);
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error creating venue: {ex.Message}");
        }
    }

    private static async Task<IResult> UpdateVenue(
        int id,
        Venue venue,
        IVenueService venueService,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (id != venue.Id)
                return Results.BadRequest("Venue ID mismatch");

            var updatedVenue = await venueService.UpdateVenueAsync(venue, cancellationToken);

            // Serialize with Newtonsoft.Json to handle NetTopologySuite geometries
            var settings = new JsonSerializerSettings();
            foreach (var converter in GeoJsonSerializer.Create().Converters)
            {
                settings.Converters.Add(converter);
            }
            var json = JsonConvert.SerializeObject(updatedVenue, settings);
            return Results.Content(json, "application/json");
        }
        catch (ArgumentException ex)
        {
            return Results.BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error updating venue: {ex.Message}");
        }
    }

    private static async Task<IResult> DeleteVenue(
        int id,
        IVenueService venueService,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var deleted = await venueService.DeleteVenueAsync(id, cancellationToken);
            if (!deleted)
                return Results.NotFound($"Venue with ID {id} not found");

            return Results.NoContent();
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error deleting venue: {ex.Message}");
        }
    }

    private static async Task<IResult> GetUnmappedVenues(
        IVenueService venueService,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var venues = await venueService.GetUnmappedVenuesAsync(cancellationToken);

            // Serialize with Newtonsoft.Json to handle NetTopologySuite geometries
            var settings = new JsonSerializerSettings();
            foreach (var converter in GeoJsonSerializer.Create().Converters)
            {
                settings.Converters.Add(converter);
            }

            var json = JsonConvert.SerializeObject(venues, settings);
            return Results.Content(json, "application/json");
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error retrieving unmapped venues: {ex.Message}");
        }
    }

    private static async Task<IResult> GetVenuesNearby(
        double lat,
        double lng,
        IVenueService venueService,
        double radiusKm = 1.0,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var point = new Point(lng, lat) { SRID = 4326 };
            var venues = await venueService.GetVenuesNearLocationAsync(point, radiusKm, cancellationToken);

            // Serialize with Newtonsoft.Json to handle NetTopologySuite geometries
            var settings = new JsonSerializerSettings();
            foreach (var converter in GeoJsonSerializer.Create().Converters)
            {
                settings.Converters.Add(converter);
            }

            var json = JsonConvert.SerializeObject(venues, settings);
            return Results.Content(json, "application/json");
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error retrieving nearby venues: {ex.Message}");
        }
    }

    private static async Task<IResult> GetVenuePatios(
        int id,
        IVenueService venueService,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var patios = await venueService.GetPatiosForVenueAsync(id, cancellationToken);

            // Serialize with Newtonsoft.Json to handle NetTopologySuite geometries
            var settings = new JsonSerializerSettings();
            foreach (var converter in GeoJsonSerializer.Create().Converters)
            {
                settings.Converters.Add(converter);
            }

            var json = JsonConvert.SerializeObject(patios, settings);
            return Results.Content(json, "application/json");
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error retrieving venue patios: {ex.Message}");
        }
    }

    private static async Task<IResult> GetVenueQuality(
        int id,
        IVenueService venueService,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var metrics = await venueService.CalculateVenueQualityAsync(id, cancellationToken);

            // Serialize with Newtonsoft.Json to handle NetTopologySuite geometries in Venue navigation property
            var settings = new JsonSerializerSettings
            {
                ReferenceLoopHandling = ReferenceLoopHandling.Ignore
            };
            foreach (var converter in GeoJsonSerializer.Create().Converters)
            {
                settings.Converters.Add(converter);
            }
            var json = JsonConvert.SerializeObject(metrics, settings);
            return Results.Content(json, "application/json");
        }
        catch (ArgumentException ex)
        {
            return Results.NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error calculating venue quality: {ex.Message}");
        }
    }

    private static async Task<IResult> GetQualityOverview(
        IDataQualityService dataQualityService,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var metrics = await dataQualityService.GetQualityMetricsAsync(cancellationToken);

            // Just return the metrics dictionary - no spatial types involved
            return Results.Ok(metrics);
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error retrieving quality overview: {ex.Message}");
        }
    }

    private static async Task<IResult> ValidateAllVenues(
        IVenueService venueService,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var metrics = await venueService.ValidateAllVenuesAsync(cancellationToken);

            // Serialize with Newtonsoft.Json to handle NetTopologySuite geometries in Venue navigation properties
            var settings = new JsonSerializerSettings
            {
                ReferenceLoopHandling = ReferenceLoopHandling.Ignore
            };
            foreach (var converter in GeoJsonSerializer.Create().Converters)
            {
                settings.Converters.Add(converter);
            }
            var json = JsonConvert.SerializeObject(metrics, settings);

            return Results.Content(json, "application/json");
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error validating venues: {ex.Message}");
        }
    }

    private static async Task<IResult> ExportVenues(
        IVenueService venueService,
        bool includePatios = true,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var venues = await venueService.ExportVenuesAsync(includePatios, cancellationToken);

            // Serialize with Newtonsoft.Json to properly handle NetTopologySuite geometries
            var settings = new JsonSerializerSettings
            {
                ReferenceLoopHandling = ReferenceLoopHandling.Ignore
            };
            foreach (var converter in GeoJsonSerializer.Create().Converters)
            {
                settings.Converters.Add(converter);
            }
            var json = JsonConvert.SerializeObject(venues, settings);

            return Results.Content(json, "application/json");
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error exporting venues: {ex.Message}");
        }
    }

    private static async Task<IResult> SeedVenues(
        VenueSeedingService seedingService,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var count = await seedingService.SeedVenuesAsync(cancellationToken);
            return Results.Ok(new { message = $"Successfully seeded {count} venues", count });
        }
        catch (Exception ex)
        {
            return Results.Problem($"Error seeding venues: {ex.Message}");
        }
    }
}