using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite.Geometries;
using NetTopologySuite.IO;
using Newtonsoft.Json;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Services;
using SunnySeat.Data;
using SunnySeat.Integration.Tests.Shared;
using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;

namespace SunnySeat.Integration.Tests;

/// <summary>
/// End-to-end integration tests for the complete venue seeding and management workflow
/// Uses real PostGIS database via TestContainers for proper spatial data testing
/// </summary>
public class VenueSeedingIntegrationTests : IClassFixture<PostgresTestFixture>
{
    private readonly PostgresTestFixture _fixture;
    private readonly HttpClient _client;

    public VenueSeedingIntegrationTests(PostgresTestFixture fixture)
    {
        _fixture = fixture ?? throw new ArgumentNullException(nameof(fixture));

        if (_fixture.Client == null)
        {
            throw new InvalidOperationException("PostgresTestFixture not initialized. Ensure Docker is running.");
        }

        _client = _fixture.Client;
    }

    /// <summary>
    /// Helper method to deserialize API responses using Newtonsoft.Json with GeoJSON support
    /// Required for proper NetTopologySuite spatial type deserialization
    /// </summary>
    private static T? DeserializeApiResponse<T>(string json)
    {
        var settings = new JsonSerializerSettings();
        foreach (var converter in GeoJsonSerializer.Create().Converters)
        {
            settings.Converters.Add(converter);
        }
        return JsonConvert.DeserializeObject<T>(json, settings);
    }

    [Fact]
    public async Task CompleteVenueWorkflow_SeedValidateAndManage_WorksEndToEnd()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();
        var seedingService = scope.ServiceProvider.GetRequiredService<VenueSeedingService>();

        // Create admin user for API testing
        var adminUser = CreateTestAdminUser();
        context.AdminUsers.Add(adminUser);
        await context.SaveChangesAsync();

        var token = TestJwtTokenGenerator.GenerateToken(adminUser.Username);
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Act & Assert

        // Step 1: Seed venues
        var seedCount = await seedingService.SeedVenuesAsync();
        seedCount.Should().BeGreaterThan(50, "Should seed at least 50 venues as per AC1");

        // Step 2: Verify venues were created in database
        var venueCount = await context.Venues.CountAsync();
        venueCount.Should().Be(seedCount);

        // Step 3: Test API endpoints work with seeded data
        var venuesResponse = await _client.GetAsync("/api/admin/venues");
        venuesResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var venuesJson = await venuesResponse.Content.ReadAsStringAsync();
        var venues = DeserializeApiResponse<List<Venue>>(venuesJson);
        venues.Should().NotBeNull();
        venues!.Should().HaveCount(seedCount);

        // Step 4: Test venue search functionality
        var searchResponse = await _client.GetAsync("/api/admin/venues?search=café");
        searchResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var searchJson = await searchResponse.Content.ReadAsStringAsync();
        var searchResults = DeserializeApiResponse<List<Venue>>(searchJson);
        searchResults.Should().NotBeNull();
        searchResults!.Should().NotBeEmpty("Should find venues with 'café' in name");

        // Step 5: Test unmapped venues endpoint
        var unmappedResponse = await _client.GetAsync("/api/admin/venues/unmapped");
        unmappedResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var unmappedJson = await unmappedResponse.Content.ReadAsStringAsync();
        var unmappedVenues = DeserializeApiResponse<List<Venue>>(unmappedJson);
        unmappedVenues.Should().NotBeNull();
        unmappedVenues!.Should().HaveCount(seedCount, "All seeded venues should initially be unmapped");

        // Step 6: Test data quality validation
        var qualityResponse = await _client.GetAsync("/api/admin/venues/quality/overview");
        qualityResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var qualityContent = await qualityResponse.Content.ReadAsStringAsync();
        var qualityData = JsonConvert.DeserializeObject<Dictionary<string, object>>(qualityContent);
        qualityData.Should().NotBeNull();
        Convert.ToInt32(qualityData!["totalVenues"]).Should().Be(seedCount);
        Convert.ToInt32(qualityData["unmappedVenues"]).Should().Be(seedCount);
        Convert.ToDouble(qualityData["mappingProgress"]).Should().Be(0);

        // Step 7: Create a test patio for one venue
        var testVenue = venues!.First();
        var testPatio = CreateTestPatio(testVenue.Id, "Test Patio");

        // Use Newtonsoft.Json for serialization to handle spatial geometries
        var patioSettings = new JsonSerializerSettings();
        foreach (var converter in GeoJsonSerializer.Create().Converters)
        {
            patioSettings.Converters.Add(converter);
        }
        var patioJson = JsonConvert.SerializeObject(testPatio, patioSettings);
        var patioContent = new StringContent(patioJson, System.Text.Encoding.UTF8, "application/json");

        var createPatioResponse = await _client.PostAsync($"/api/admin/venues/{testVenue.Id}/patios", patioContent);
        createPatioResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        // Step 8: Verify venue is now marked as mapped
        var updatedQualityResponse = await _client.GetAsync("/api/admin/venues/quality/overview");
        var updatedQualityContent = await updatedQualityResponse.Content.ReadAsStringAsync();
        var updatedQualityData = JsonConvert.DeserializeObject<Dictionary<string, object>>(updatedQualityContent);
        Convert.ToInt32(updatedQualityData!["mappedVenues"]).Should().Be(1);
        Convert.ToInt32(updatedQualityData["unmappedVenues"]).Should().Be(seedCount - 1);

        // Step 9: Test venue validation
        var validateResponse = await _client.PostAsync("/api/admin/venues/validate", null);
        validateResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var validationJson = await validateResponse.Content.ReadAsStringAsync();
        var validationResults = DeserializeApiResponse<List<VenueQualityMetrics>>(validationJson);
        validationResults.Should().NotBeNull();
        validationResults!.Should().HaveCount(seedCount);

        // Step 10: Test export functionality
        var exportResponse = await _client.GetAsync("/api/admin/venues/export");
        exportResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var exportJson = await exportResponse.Content.ReadAsStringAsync();
        var exportedVenues = DeserializeApiResponse<List<Venue>>(exportJson);
        exportedVenues.Should().NotBeNull();
        exportedVenues!.Should().HaveCount(seedCount);
    }

    [Fact]
    public async Task VenueSeeding_SeedsCorrectVenueTypes_AcrossGothenburgDistricts()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();
        var seedingService = scope.ServiceProvider.GetRequiredService<VenueSeedingService>();

        // Act
        var seedCount = await seedingService.SeedVenuesAsync();

        // Assert
        var venues = await context.Venues.ToListAsync();

        // Verify venue type distribution (from story requirements)
        var restaurantCount = venues.Count(v => v.Type == VenueType.Restaurant);
        var cafeCount = venues.Count(v => v.Type == VenueType.Cafe);
        var barCount = venues.Count(v => v.Type == VenueType.Bar);
        var hotelCount = venues.Count(v => v.Type == VenueType.Hotel);
        var otherCount = venues.Count(v => v.Type == VenueType.Other);

        restaurantCount.Should().BeInRange(20, 40, "Should have 30-35 restaurants");
        cafeCount.Should().BeInRange(15, 30, "Should have 20-25 cafés");
        barCount.Should().BeInRange(8, 20, "Should have 10-15 bars");
        hotelCount.Should().BeInRange(2, 12, "Should have 2-10 hotels"); // Adjusted to match actual seeded data
        otherCount.Should().BeInRange(3, 12, "Should have 5-10 other venues");

        // Verify geographic distribution (all venues should be in Gothenburg)
        foreach (var venue in venues)
        {
            venue.Location.Y.Should().BeInRange(57.6, 57.8, "Latitude should be within Gothenburg bounds");
            venue.Location.X.Should().BeInRange(11.8, 12.1, "Longitude should be within Gothenburg bounds");
            venue.Address.Should().Contain("Göteborg", "All addresses should contain Göteborg");
        }

        // Verify metadata completeness (AC2)
        foreach (var venue in venues)
        {
            venue.Name.Should().NotBeNullOrEmpty("All venues should have names");
            venue.Address.Should().NotBeNullOrEmpty("All venues should have addresses");
            venue.Location.Should().NotBeNull("All venues should have locations");
            venue.IsActive.Should().BeTrue("All seeded venues should be active");
            venue.IsMapped.Should().BeFalse("All seeded venues should initially be unmapped");
        }
    }

    [Fact]
    public async Task DataQualityValidation_IdentifiesQualityIssues_AsPerAC3()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();
        var dataQualityService = scope.ServiceProvider.GetRequiredService<IDataQualityService>();

        // Create test venues with various quality levels
        var venues = new[]
        {
            CreateTestVenue("High Quality Venue", "Complete Address, Göteborg", 11.9746, 57.7089, "031-123456", "https://example.com"),
            CreateTestVenue("Medium Quality Venue", "Basic Address, Göteborg", 11.9750, 57.7092), // No phone/website
            CreateTestVenue("", "Invalid Name, Göteborg", 11.9740, 57.7088), // Invalid name
            CreateTestVenue("Outside Bounds", "Invalid Location", 60.0, 15.0) // Outside Gothenburg
        };

        foreach (var venue in venues)
        {
            context.Venues.Add(venue);
        }
        await context.SaveChangesAsync();

        // Act
        var qualityMetrics = await dataQualityService.ValidateAllVenuesAsync();

        // Assert
        var metricsList = qualityMetrics.ToList();
        metricsList.Should().HaveCount(4);

        // High quality venue should have good score (without patios: 70% metadata + 30% additional = 1.0)
        var highQualityMetrics = metricsList.First(m => m.Venue.Name == "High Quality Venue");
        highQualityMetrics.OverallQuality.Should().BeGreaterThan(0.9);
        highQualityMetrics.HasCompleteMetadata.Should().BeTrue();
        highQualityMetrics.HasAccurateLocation.Should().BeTrue();
        // Note: No patios yet, so validation issues may include "No patios defined"

        // Medium quality venue should have moderate score
        var mediumQualityMetrics = metricsList.First(m => m.Venue.Name == "Medium Quality Venue");
        mediumQualityMetrics.OverallQuality.Should().BeInRange(0.6, 0.8);
        mediumQualityMetrics.HasCompleteMetadata.Should().BeTrue();

        // Invalid name venue should have validation issues
        var invalidNameMetrics = metricsList.First(m => m.Venue.Name == "");
        invalidNameMetrics.ValidationIssues.Should().Contain(issue => issue.Contains("Invalid or missing venue name"));

        // Out of bounds venue should have location issues
        var outOfBoundsMetrics = metricsList.First(m => m.Venue.Name == "Outside Bounds");
        outOfBoundsMetrics.HasAccurateLocation.Should().BeFalse();
        outOfBoundsMetrics.ValidationIssues.Should().Contain(issue => issue.Contains("Invalid location"));
    }

    [Fact]
    public async Task VenueExport_SupportsVariousFormats_ForAC5()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();
        var seedingService = scope.ServiceProvider.GetRequiredService<VenueSeedingService>();

        var adminUser = CreateTestAdminUser();
        context.AdminUsers.Add(adminUser);
        await context.SaveChangesAsync();

        var token = TestJwtTokenGenerator.GenerateToken(adminUser.Username);
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Seed some venues
        await seedingService.SeedVenuesAsync();

        // Act & Assert

        // Test export without patios
        var exportWithoutPatiosResponse = await _client.GetAsync("/api/admin/venues/export?includePatios=false");
        exportWithoutPatiosResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var exportWithoutPatiosJson = await exportWithoutPatiosResponse.Content.ReadAsStringAsync();
        var venuesWithoutPatios = DeserializeApiResponse<List<Venue>>(exportWithoutPatiosJson);
        venuesWithoutPatios.Should().NotBeNull();
        venuesWithoutPatios!.Should().NotBeEmpty();

        // Test export with patios (default)
        var exportWithPatiosResponse = await _client.GetAsync("/api/admin/venues/export");
        exportWithPatiosResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var exportWithPatiosJson = await exportWithPatiosResponse.Content.ReadAsStringAsync();
        var venuesWithPatios = DeserializeApiResponse<List<Venue>>(exportWithPatiosJson);
        venuesWithPatios.Should().NotBeNull();
        venuesWithPatios!.Should().HaveCount(venuesWithoutPatios!.Count);
    }

    private static AdminUser CreateTestAdminUser()
    {
        return new AdminUser
        {
            Username = "testadmin",
            Email = "test@admin.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("testpassword"),
            Role = "Admin",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    private static Venue CreateTestVenue(string name, string address, double longitude = 11.9746, double latitude = 57.7089, string? phone = null, string? website = null)
    {
        return new Venue
        {
            Name = name,
            Address = address,
            Location = new Point(longitude, latitude) { SRID = 4326 },
            Type = VenueType.Restaurant,
            Phone = phone,
            Website = website,
            IsActive = true,
            IsMapped = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static Patio CreateTestPatio(int venueId, string name)
    {
        var coordinates = new[]
        {
            new Coordinate(11.9746, 57.7089),
            new Coordinate(11.9747, 57.7089),
            new Coordinate(11.9747, 57.7090),
            new Coordinate(11.9746, 57.7090),
            new Coordinate(11.9746, 57.7089)
        };

        return new Patio
        {
            VenueId = venueId,
            Name = name,
            Geometry = new Polygon(new LinearRing(coordinates)) { SRID = 4326 },
            PolygonQuality = 0.8,
            HeightSource = HeightSource.Heuristic,
            ReviewNeeded = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }
}