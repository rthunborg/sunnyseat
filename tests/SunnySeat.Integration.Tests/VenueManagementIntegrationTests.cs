using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite.Geometries;
using NetTopologySuite.IO;
using Newtonsoft.Json;
using SunnySeat.Core.Entities;
using SunnySeat.Data;
using SunnySeat.Integration.Tests.Shared;
using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;

namespace SunnySeat.Integration.Tests;

/// <summary>
/// Integration tests for venue management functionality
/// Uses real PostGIS database via TestContainers for proper spatial data testing
/// </summary>
public class VenueManagementIntegrationTests : IClassFixture<PostgresTestFixture>
{
    private readonly PostgresTestFixture _fixture;

    public VenueManagementIntegrationTests(PostgresTestFixture fixture)
    {
        _fixture = fixture ?? throw new ArgumentNullException(nameof(fixture));

        if (_fixture.Factory == null)
        {
            throw new InvalidOperationException("PostgresTestFixture not initialized. Ensure Docker is running.");
        }
    }

    private HttpClient CreateClient()
    {
        return _fixture.Factory!.CreateClient();
    }

    [Fact]
    public async Task SeedVenues_ShouldCreateGothenburgVenues()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();

        // Create admin user for authentication
        var adminUser = CreateTestAdminUser();
        context.AdminUsers.Add(adminUser);
        await context.SaveChangesAsync();

        var token = TestJwtTokenGenerator.GenerateToken(adminUser.Username);

        // Act
        using var client = CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await client.PostAsync("/api/admin/venues/seed", null);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var result = JsonConvert.DeserializeObject<dynamic>(content);

        ((int)result.count).Should().BeGreaterThan(0);

        // Verify venues were created in database
        var venueCount = await context.Venues.CountAsync();
        venueCount.Should().BeGreaterThan(50); // Story requirement: at least 50 venues
    }

    [Fact]
    public async Task GetVenues_WithoutAuth_ShouldReturn401()
    {
        // Act
        using var client = CreateClient();
        var response = await client.GetAsync("/api/admin/venues");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetVenues_WithAuth_ShouldReturnVenues()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();

        var adminUser = CreateTestAdminUser();
        context.AdminUsers.Add(adminUser);

        var testVenue = CreateTestVenue("Test Venue", "Test Address, Göteborg");
        context.Venues.Add(testVenue);
        await context.SaveChangesAsync();

        var token = TestJwtTokenGenerator.GenerateToken(adminUser.Username);

        // Act
        using var client = CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync("/api/admin/venues");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        var settings = new JsonSerializerSettings();
        foreach (var converter in GeoJsonSerializer.Create().Converters)
        {
            settings.Converters.Add(converter);
        }
        var venues = JsonConvert.DeserializeObject<List<Venue>>(json, settings);
        venues.Should().NotBeNull();
        venues!.Should().HaveCountGreaterThan(0);
        venues!.Should().Contain(v => v.Name == "Test Venue");
    }

    [Fact]
    public async Task CreateVenue_ValidVenue_ShouldCreateSuccessfully()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();

        var adminUser = CreateTestAdminUser();
        context.AdminUsers.Add(adminUser);
        await context.SaveChangesAsync();

        var token = TestJwtTokenGenerator.GenerateToken(adminUser.Username);

        var newVenue = CreateTestVenue("New Venue", "New Address, Göteborg");

        // Act
        using var client = CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Use Newtonsoft.Json for both serialization and deserialization to match API
        var json = JsonConvert.SerializeObject(newVenue, new JsonSerializerSettings
        {
            Converters = { new NetTopologySuite.IO.Converters.GeometryConverter() }
        });
        var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
        var response = await client.PostAsync("/api/admin/venues", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var responseJson = await response.Content.ReadAsStringAsync();
        var settings = new JsonSerializerSettings();
        foreach (var converter in GeoJsonSerializer.Create().Converters)
        {
            settings.Converters.Add(converter);
        }
        var createdVenue = JsonConvert.DeserializeObject<Venue>(responseJson, settings);
        createdVenue.Should().NotBeNull();
        createdVenue!.Name.Should().Be("New Venue");
        createdVenue.Id.Should().BeGreaterThan(0);

        // Verify in database
        var dbVenue = await context.Venues.FindAsync(createdVenue.Id);
        dbVenue.Should().NotBeNull();
        dbVenue!.Name.Should().Be("New Venue");
    }

    [Fact]
    public async Task CreatePatio_ValidPatio_ShouldCreateSuccessfully()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();

        var adminUser = CreateTestAdminUser();
        context.AdminUsers.Add(adminUser);

        var venue = CreateTestVenue("Venue with Patio", "Patio Address, Göteborg");
        context.Venues.Add(venue);
        await context.SaveChangesAsync();

        var token = TestJwtTokenGenerator.GenerateToken(adminUser.Username);

        var newPatio = CreateTestPatio(venue.Id, "Test Patio");

        // Act
        using var client = CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        // Use Newtonsoft.Json for serialization to match API
        var json = JsonConvert.SerializeObject(newPatio, new JsonSerializerSettings
        {
            Converters = { new NetTopologySuite.IO.Converters.GeometryConverter() }
        });
        var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
        var response = await client.PostAsync($"/api/admin/venues/{venue.Id}/patios", content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var responseJson = await response.Content.ReadAsStringAsync();
        var settings = new JsonSerializerSettings();
        foreach (var converter in GeoJsonSerializer.Create().Converters)
        {
            settings.Converters.Add(converter);
        }
        var createdPatio = JsonConvert.DeserializeObject<Patio>(responseJson, settings);
        createdPatio.Should().NotBeNull();
        createdPatio!.Name.Should().Be("Test Patio");
        createdPatio.VenueId.Should().Be(venue.Id);

        // Verify venue is now marked as mapped
        await context.Entry(venue).ReloadAsync();
        venue.IsMapped.Should().BeTrue();
    }

    [Fact]
    public async Task GetQualityOverview_ShouldReturnMetrics()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();

        var adminUser = CreateTestAdminUser();
        context.AdminUsers.Add(adminUser);

        // Add test data
        var venue1 = CreateTestVenue("Venue 1", "Address 1, Göteborg");
        var venue2 = CreateTestVenue("Venue 2", "Address 2, Göteborg");
        venue1.IsMapped = true;
        venue2.IsMapped = false;

        context.Venues.AddRange(venue1, venue2);
        await context.SaveChangesAsync();

        var token = TestJwtTokenGenerator.GenerateToken(adminUser.Username);

        // Act
        using var client = CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync("/api/admin/venues/quality/overview");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        var metrics = JsonConvert.DeserializeObject<dynamic>(content);

        ((int)metrics!.totalVenues).Should().Be(2);
        ((int)metrics.mappedVenues).Should().Be(1);
        ((int)metrics.unmappedVenues).Should().Be(1);
        ((double)metrics.mappingProgress).Should().Be(50.0);
    }

    [Fact]
    public async Task SearchVenues_ByName_ShouldReturnMatchingVenues()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();

        var adminUser = CreateTestAdminUser();
        context.AdminUsers.Add(adminUser);

        var cafe1 = CreateTestVenue("Café Central", "Central Street, Göteborg");
        var cafe2 = CreateTestVenue("Restaurant Roma", "Roma Street, Göteborg");
        var bar1 = CreateTestVenue("Café Bar", "Bar Street, Göteborg");

        context.Venues.AddRange(cafe1, cafe2, bar1);
        await context.SaveChangesAsync();

        var token = TestJwtTokenGenerator.GenerateToken(adminUser.Username);

        // Act
        using var client = CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync("/api/admin/venues?search=café");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        var settings = new JsonSerializerSettings();
        foreach (var converter in GeoJsonSerializer.Create().Converters)
        {
            settings.Converters.Add(converter);
        }
        var venues = JsonConvert.DeserializeObject<List<Venue>>(json, settings);
        venues.Should().NotBeNull();
        venues!.Should().HaveCount(2); // Should find "Café Central" and "Café Bar"
        venues!.Should().Contain(v => v.Name == "Café Central");
        venues!.Should().Contain(v => v.Name == "Café Bar");
        venues!.Should().NotContain(v => v.Name == "Restaurant Roma");
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

    private static Venue CreateTestVenue(string name, string address)
    {
        return new Venue
        {
            Name = name,
            Address = address,
            Location = new Point(11.9746, 57.7089) { SRID = 4326 },
            Type = VenueType.Restaurant,
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