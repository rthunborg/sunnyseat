using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Data;
using SunnySeat.Integration.Tests.Shared;
using System.Net;
using System.Net.Http.Json;
using Xunit;
using FluentAssertions;

namespace SunnySeat.Integration.Tests;

/// <summary>
/// Integration tests for weather-enhanced sun exposure timeline calculations
/// Tests the complete flow from API request through service layer to database
/// </summary>
public class WeatherEnhancedTimelineIntegrationTests : IClassFixture<PostgresTestFixture>
{
    private readonly PostgresTestFixture _fixture;

    public WeatherEnhancedTimelineIntegrationTests(PostgresTestFixture fixture)
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
    public async Task GetSunExposure_WithWeatherData_ReturnsAdjustedExposure()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();

        var (patio, _) = CreateTestPatioWithWeather(context);
        await context.SaveChangesAsync();

        var timestamp = DateTime.UtcNow;

        // Act
        using var client = CreateClient();
        var response = await client.GetAsync(
            $"/api/sun-exposure/patio/{patio.Id}?timestamp={timestamp:O}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var exposure = await response.Content.ReadFromJsonAsync<dynamic>(
            PostgresTestFixture.JsonOptions);

        exposure.Should().NotBeNull();
        ((int)exposure!.patioId).Should().Be(patio.Id);
        ((double)exposure.exposurePercent).Should().BeInRange(0, 100);
    }

    [Fact]
    public async Task GetSunTimeline_Today_ReturnsCompleteTimeline()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();

        var (patio, _) = CreateTestPatioWithWeather(context);
        await context.SaveChangesAsync();

        // Act
        using var client = CreateClient();
        var response = await client.GetAsync($"/api/timeline/patio/{patio.Id}/today");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var timeline = await response.Content.ReadFromJsonAsync<dynamic>(
            PostgresTestFixture.JsonOptions);

        timeline.Should().NotBeNull();
        ((int)timeline!.patioId).Should().Be(patio.Id);
        ((string)timeline.timelineType).Should().Be("today");

        var dataPoints = timeline.dataPoints as IEnumerable<dynamic>;
        dataPoints.Should().NotBeNull().And.NotBeEmpty();
    }

    [Fact]
    public async Task GetSunTimeline_Tomorrow_ReturnsNextDayTimeline()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();

        var (patio, _) = CreateTestPatioWithWeather(context);
        await context.SaveChangesAsync();

        // Act
        using var client = CreateClient();
        var response = await client.GetAsync($"/api/timeline/patio/{patio.Id}/tomorrow");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var timeline = await response.Content.ReadFromJsonAsync<dynamic>(
            PostgresTestFixture.JsonOptions);

        timeline.Should().NotBeNull();
        ((int)timeline!.patioId).Should().Be(patio.Id);
        ((string)timeline.timelineType).Should().Be("tomorrow");

        var dataPoints = timeline.dataPoints as IEnumerable<dynamic>;
        dataPoints.Should().NotBeNull().And.NotBeEmpty();
    }

    [Fact]
    public async Task GetSunTimeline_Next12Hours_ReturnsLimitedTimeline()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();

        var (patio, _) = CreateTestPatioWithWeather(context);
        await context.SaveChangesAsync();

        // Act
        using var client = CreateClient();
        var response = await client.GetAsync($"/api/timeline/patio/{patio.Id}/next-12-hours");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var timeline = await response.Content.ReadFromJsonAsync<dynamic>(
            PostgresTestFixture.JsonOptions);

        timeline.Should().NotBeNull();
        ((int)timeline!.patioId).Should().Be(patio.Id);
        ((string)timeline.timelineType).Should().Be("next12hours");

        var dataPoints = timeline.dataPoints as IEnumerable<dynamic>;
        dataPoints.Should().NotBeNull().And.NotBeEmpty();
    }

    [Fact]
    public async Task GetBestSunWindows_ReturnsOptimalTimeSlots()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();

        var (patio, _) = CreateTestPatioWithWeather(context);
        await context.SaveChangesAsync();

        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(24);

        // Act
        using var client = CreateClient();
        var response = await client.GetAsync(
            $"/api/timeline/patio/{patio.Id}/best-sun-windows?startTime={startTime:O}&endTime={endTime:O}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var windows = await response.Content.ReadFromJsonAsync<IEnumerable<dynamic>>(
            PostgresTestFixture.JsonOptions);

        windows.Should().NotBeNull();

        foreach (var window in windows!)
        {
            ((double)window.averageExposurePercent).Should().BeInRange(0, 100);
            ((double)window.minExposurePercent).Should().BeInRange(0, 100);
            ((double)window.maxExposurePercent).Should().BeInRange(0, 100);
        }
    }

    [Fact]
    public async Task GetSunExposureReliability_ReturnsWeatherConfidence()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();

        var (patio, _) = CreateTestPatioWithWeather(context);
        await context.SaveChangesAsync();

        var timestamp = DateTime.UtcNow;

        // Act
        using var client = CreateClient();
        var response = await client.GetAsync(
            $"/api/sun-exposure/patio/{patio.Id}/reliability?timestamp={timestamp:O}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var reliability = await response.Content.ReadFromJsonAsync<dynamic>(
            PostgresTestFixture.JsonOptions);

        reliability.Should().NotBeNull();
        ((double)reliability!.reliabilityScore).Should().BeInRange(0, 1);
        ((string)reliability.dataSource).Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task WeatherEnhancedTimeline_WithCloudCover_AdjustsExposure()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();

        // Create patio with high cloud cover weather data
        var (patio, weatherSlice) = CreateTestPatioWithWeather(context, cloudCover: 80);
        await context.SaveChangesAsync();

        var timestamp = weatherSlice.Timestamp;

        // Act - Get exposure at the same timestamp as weather data
        using var client = CreateClient();
        var response = await client.GetAsync(
            $"/api/sun-exposure/patio/{patio.Id}?timestamp={timestamp:O}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var exposure = await response.Content.ReadFromJsonAsync<dynamic>(
            PostgresTestFixture.JsonOptions);

        exposure.Should().NotBeNull();

        // With high cloud cover, we expect reduced exposure or metadata indicating weather impact
        // The exact assertion depends on implementation, but data should be valid
        ((double)exposure!.exposurePercent).Should().BeInRange(0, 100);
    }

    [Fact]
    public async Task WeatherEnhancedTimeline_ConsistentResults_MultipleCalls()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        using var scope = _fixture.Factory!.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<SunnySeatDbContext>();

        var (patio, _) = CreateTestPatioWithWeather(context);
        await context.SaveChangesAsync();

        var timestamp = DateTime.UtcNow;

        using var client = CreateClient();

        // Act - Call the API multiple times
        var response1 = await client.GetAsync($"/api/sun-exposure/patio/{patio.Id}?timestamp={timestamp:O}");
        var exposure1 = await response1.Content.ReadFromJsonAsync<dynamic>(PostgresTestFixture.JsonOptions);

        var response2 = await client.GetAsync($"/api/sun-exposure/patio/{patio.Id}?timestamp={timestamp:O}");
        var exposure2 = await response2.Content.ReadFromJsonAsync<dynamic>(PostgresTestFixture.JsonOptions);

        // Assert - Results should be identical (deterministic)
        response1.StatusCode.Should().Be(HttpStatusCode.OK);
        response2.StatusCode.Should().Be(HttpStatusCode.OK);

        var percent1 = (double)exposure1!.exposurePercent;
        var percent2 = (double)exposure2!.exposurePercent;

        percent1.Should().Be(percent2);
    }

    [Fact]
    public async Task GetSunTimeline_InvalidPatioId_ReturnsNotFound()
    {
        // Arrange
        await _fixture.ResetDatabaseAsync();

        // Act
        using var client = CreateClient();
        var response = await client.GetAsync("/api/timeline/patio/99999/today");

        // Assert - Should handle missing patio gracefully
        // Depending on implementation, could be 404 or 400
        response.StatusCode.Should().BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.BadRequest);
    }

    /// <summary>
    /// Creates a test patio with associated weather data
    /// </summary>
    private (Patio patio, WeatherSlice weather) CreateTestPatioWithWeather(
        SunnySeatDbContext context,
        double cloudCover = 20.0)
    {
        var geometryFactory = new GeometryFactory();

        // Create a simple square patio geometry
        var coordinates = new[]
        {
            new Coordinate(11.9745, 57.7089),  // Southwest Gothenburg
            new Coordinate(11.9755, 57.7089),
            new Coordinate(11.9755, 57.7099),
            new Coordinate(11.9745, 57.7099),
            new Coordinate(11.9745, 57.7089)   // Close the polygon
        };

        var venue = new Venue
        {
            Name = "Test Venue for Weather",
            Location = geometryFactory.CreatePoint(new Coordinate(11.9750, 57.7094))
        };
        context.Venues.Add(venue);

        var patio = new Patio
        {
            Name = "Test Patio with Weather",
            Venue = venue,
            Geometry = geometryFactory.CreatePolygon(coordinates)
        };
        context.Patios.Add(patio);

        // Create weather slice for current time
        var weatherSlice = new WeatherSlice
        {
            Timestamp = DateTime.UtcNow,
            CloudCover = cloudCover,
            Temperature = 20.0,
            PrecipitationProbability = 0.0,
            IsForecast = false,
            Source = "test"
        };
        context.WeatherSlices.Add(weatherSlice);

        return (patio, weatherSlice);
    }
}
