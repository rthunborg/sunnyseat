using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Data;

namespace SunnySeat.Api.Tests;

/// <summary>
/// Custom WebApplicationFactory for integration tests with test authentication
/// </summary>
public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    // Use a stable database name for the lifetime of the factory
    private readonly string _databaseName = "TestDb_" + Guid.NewGuid();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Set test environment
        builder.UseEnvironment("Testing");

        // Configure test appsettings
        builder.ConfigureAppConfiguration((context, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string>
            {
                ["ConnectionStrings:DefaultConnection"] = "Server=test;Database=test;",
                ["Jwt:SecretKey"] = "test-secret-key-that-is-at-least-32-characters-long",
                ["Jwt:Issuer"] = "test-issuer",
                ["Jwt:Audience"] = "test-audience",
                ["Jwt:ExpiryMinutes"] = "60",
                ["Weather:MetNo:BaseUrl"] = "https://test.met.no",
                ["Weather:OpenWeatherMap:ApiKey"] = "test-key",
                ["Weather:OpenWeatherMap:BaseUrl"] = "https://test.openweathermap.org",
                ["Cors:AllowedOrigins:0"] = "http://localhost:3000"
            }!);
        });

        builder.ConfigureServices(services =>
        {
            // Remove the real database registration
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<SunnySeatDbContext>));
            if (descriptor != null)
                services.Remove(descriptor);

            // Add in-memory database for testing
            // Use stable database name for the factory lifetime so data persists across scopes
            services.AddDbContext<SunnySeatDbContext>(options =>
            {
                options.UseInMemoryDatabase(_databaseName);
            });

            // Remove hosted services that might interfere with tests
            var hostedServices = services.Where(d => d.ServiceType == typeof(IHostedService)).ToList();
            foreach (var service in hostedServices)
            {
                services.Remove(service);
            }

            // Remove existing authentication services and add test authentication
            var authDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(IAuthenticationService));
            if (authDescriptor != null)
                services.Remove(authDescriptor);

            // Add test authentication (this will override the JWT authentication)
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = "Test";
                options.DefaultChallengeScheme = "Test";
                options.DefaultScheme = "Test";
            })
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", options => { });

            // Configure authorization to use test authentication and bypass policy checks
            services.AddAuthorization(options =>
            {
                // Override AdminOnly policy to always succeed in tests
                options.AddPolicy("AdminOnly", policy => policy.RequireAssertion(_ => true));
            });

            // Fix for .NET 9 PipeWriter issue - use default reflection serialization
            // This avoids the "PipeWriter does not implement UnflushedBytes" error in tests
            services.ConfigureHttpJsonOptions(options =>
            {
                // Use default serialization (reflection-based) instead of source-generated
                options.SerializerOptions.TypeInfoResolverChain.Clear();
                options.SerializerOptions.TypeInfoResolver = new System.Text.Json.Serialization.Metadata.DefaultJsonTypeInfoResolver();
            });
        });

        // Seed test data after services are configured
        builder.ConfigureServices(services =>
        {
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();
            SeedTestData(db);
        });
    }

    /// <summary>
    /// Seed test data for patio endpoints
    /// </summary>
    private void SeedTestData(SunnySeatDbContext context)
    {
        // Only seed if database is empty
        if (context.Patios.Any())
            return;

        var geometryFactory = NetTopologySuite.NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

        // Create test venue in Gothenburg (57.7089°N, 11.9746°E)
        var venueLocation = geometryFactory.CreatePoint(new Coordinate(11.9746, 57.7089));
        var venue = new Venue
        {
            Name = "Test Sunny Cafe",
            Address = "Test Street 1, Gothenburg",
            Location = venueLocation,
            Type = VenueType.Cafe,
            IsMapped = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Venues.Add(venue);
        context.SaveChanges(); // Save to get the generated Id

        // Create test patio near Gothenburg center
        // Use a simple polygon approximately 20x20 meters
        var patioCoordinates = new[]
        {
            new Coordinate(11.9746, 57.7089),      // Bottom-left
            new Coordinate(11.9748, 57.7089),      // Bottom-right
            new Coordinate(11.9748, 57.7091),      // Top-right
            new Coordinate(11.9746, 57.7091),      // Top-left
            new Coordinate(11.9746, 57.7089)       // Close the ring
        };

        var patio = new Patio
        {
            VenueId = venue.Id,
            Venue = venue,
            Name = "Main Terrace",
            Geometry = geometryFactory.CreatePolygon(patioCoordinates),
            HeightM = 2.0,
            HeightSource = HeightSource.Heuristic,
            PolygonQuality = 0.9,
            ReviewNeeded = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Patios.Add(patio);
        context.SaveChanges(); // Save to get the generated Id

        // Add precomputed sun exposure for current time
        var now = DateTime.UtcNow;
        var localTime = TimeZoneInfo.ConvertTimeFromUtc(now, TimeZoneInfo.FindSystemTimeZoneById("W. Europe Standard Time"));

        var sunExposure = new PrecomputedSunExposure
        {
            PatioId = patio.Id,
            Patio = patio,
            Timestamp = now,
            LocalTime = localTime,
            Date = DateOnly.FromDateTime(localTime),
            Time = TimeOnly.FromDateTime(localTime),
            SunExposurePercent = 85.5,
            State = SunExposureState.Sunny,
            Confidence = 95.0,
            SunlitAreaSqM = 340.0,
            ShadedAreaSqM = 60.0,
            SolarElevation = 45.0,
            SolarAzimuth = 180.0,
            ComputedAt = now,
            ExpiresAt = now.AddHours(1),
            ComputationVersion = "1.0",
            IsStale = false,
            AffectingBuildingsCount = 2,
            CalculationDuration = TimeSpan.FromMilliseconds(50)
        };

        context.PrecomputedSunExposures.Add(sunExposure);
        context.SaveChanges();
    }
}
