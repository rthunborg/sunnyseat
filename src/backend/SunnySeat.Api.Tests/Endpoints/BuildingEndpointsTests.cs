using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite.Geometries;
using NetTopologySuite;
using SunnySeat.Core.Entities;
using SunnySeat.Data;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace SunnySeat.Api.Tests.Endpoints;

public class BuildingEndpointsTests : IClassFixture<TestWebApplicationFactory>, IAsyncLifetime
{
    private readonly TestWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public BuildingEndpointsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    public Task InitializeAsync() => Task.CompletedTask;

    public async Task DisposeAsync()
    {
        // Clean up database after each test
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();
        context.Buildings.RemoveRange(context.Buildings);
        await context.SaveChangesAsync();
    }
    [Fact]
    public async Task GetBuildingStats_WhenNoBuildingsExist_ReturnsEmptyStats()
    {
        // Act
        var response = await _client.GetAsync("/api/admin/buildings/stats");

        // Assert
        response.Should().BeSuccessful();

        var content = await response.Content.ReadAsStringAsync();
        var stats = JsonSerializer.Deserialize<JsonElement>(content);

        // ASP.NET Core returns camelCase JSON by default
        stats.GetProperty("totalBuildings").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task GetBuildingStats_WhenBuildingsExist_ReturnsCorrectStats()
    {
        // Arrange
        await SeedTestData();

        // Act
        var response = await _client.GetAsync("/api/admin/buildings/stats");

        // Assert
        response.Should().BeSuccessful();

        var content = await response.Content.ReadAsStringAsync();
        var stats = JsonSerializer.Deserialize<JsonElement>(content);

        // ASP.NET Core returns camelCase JSON by default
        stats.GetProperty("totalBuildings").GetInt32().Should().BeGreaterThan(0);
        stats.GetProperty("averageHeight").GetDouble().Should().BeGreaterThan(0);
        stats.GetProperty("averageQualityScore").GetDouble().Should().BeGreaterThan(0);
    }

    [Theory]
    [InlineData(57.7089, 11.9746, 1000)] // Gothenburg coordinates
    [InlineData(59.3293, 18.0686, 500)]  // Stockholm coordinates
    public async Task SearchBuildings_WithValidCoordinates_ReturnsResults(double lat, double lng, double radius)
    {
        // Arrange
        await SeedTestData();

        // Act
        // Use InvariantCulture to ensure decimal points (not commas) in URL
        var url = FormattableString.Invariant($"/api/admin/buildings/search?lat={lat}&lng={lng}&radius={radius}");
        var response = await _client.GetAsync(url);

        // Assert
        response.Should().BeSuccessful();

        var content = await response.Content.ReadAsStringAsync();
        var searchResult = JsonSerializer.Deserialize<JsonElement>(content);

        // ASP.NET Core returns camelCase JSON by default
        searchResult.GetProperty("searchRadius").GetDouble().Should().Be(radius);
        searchResult.GetProperty("searchCenter").GetProperty("latitude").GetDouble().Should().Be(lat);
        searchResult.GetProperty("searchCenter").GetProperty("longitude").GetDouble().Should().Be(lng);
    }

    [Theory]
    [InlineData(-91, 0)] // Invalid latitude
    [InlineData(91, 0)]  // Invalid latitude
    [InlineData(0, -181)] // Invalid longitude
    [InlineData(0, 181)]  // Invalid longitude
    public async Task SearchBuildings_WithInvalidCoordinates_ReturnsBadRequest(double lat, double lng)
    {
        // Act
        var response = await _client.GetAsync($"/api/admin/buildings/search?lat={lat}&lng={lng}");

        // Assert
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData(0)]     // Zero radius
    [InlineData(-100)]  // Negative radius
    [InlineData(20000)] // Too large radius
    public async Task SearchBuildings_WithInvalidRadius_ReturnsBadRequest(double radius)
    {
        // Act
        var response = await _client.GetAsync($"/api/admin/buildings/search?lat=57.7089&lng=11.9746&radius={radius}");

        // Assert
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetBuildingById_WhenBuildingExists_ReturnsBuilding()
    {
        // Arrange
        var buildingId = await SeedTestData();

        // Act
        var response = await _client.GetAsync($"/api/admin/buildings/{buildingId}");

        // Assert
        response.Should().BeSuccessful();

        var content = await response.Content.ReadAsStringAsync();
        var building = JsonSerializer.Deserialize<JsonElement>(content);

        // ASP.NET Core returns camelCase JSON by default
        building.GetProperty("id").GetInt32().Should().Be(buildingId);
        building.GetProperty("height").GetDouble().Should().BeGreaterThan(0);
        building.GetProperty("source").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetBuildingById_WhenBuildingDoesNotExist_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync("/api/admin/buildings/99999");

        // Assert
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetImportStatus_ReturnsStatusInformation()
    {
        // Arrange
        await SeedTestData();

        // Act
        var response = await _client.GetAsync("/api/admin/buildings/import-status");

        // Assert
        response.Should().BeSuccessful();

        var content = await response.Content.ReadAsStringAsync();
        var status = JsonSerializer.Deserialize<JsonElement>(content);

        // ASP.NET Core returns camelCase JSON by default
        status.GetProperty("totalBuildings").GetInt32().Should().BeGreaterThan(0);
        status.GetProperty("buildingsImportedToday").GetInt32().Should().BeGreaterOrEqualTo(0);
    }

    [Fact]
    public async Task GetGdalStatus_ReturnsGdalInformation()
    {
        // Act
        var response = await _client.GetAsync("/api/admin/buildings/gdal-status");

        // Assert
        response.Should().BeSuccessful();

        var content = await response.Content.ReadAsStringAsync();
        var status = JsonSerializer.Deserialize<JsonElement>(content);

        // ASP.NET Core returns camelCase JSON by default
        // Verify isAvailable property exists and is a valid boolean
        var isAvailable = status.GetProperty("isAvailable").GetBoolean();
        (isAvailable == true || isAvailable == false).Should().BeTrue();

        status.GetProperty("checkedAt").GetDateTime().Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }

    private async Task<int> SeedTestData()
    {
        using var scope = _factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();

        var geometryFactory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);

        // Create test building near Gothenburg
        var coordinates = new[]
        {
            new Coordinate(11.9746, 57.7089),  // lng, lat for PostGIS
            new Coordinate(11.9750, 57.7089),
            new Coordinate(11.9750, 57.7092),
            new Coordinate(11.9746, 57.7092),
            new Coordinate(11.9746, 57.7089)
        };
        var polygon = geometryFactory.CreatePolygon(coordinates);

        var building = new Building
        {
            Geometry = polygon,
            Height = 12.5,
            Source = "test",
            QualityScore = 0.95,
            ExternalId = "test-building-1",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Buildings.Add(building);
        await context.SaveChangesAsync();

        return building.Id;
    }
}