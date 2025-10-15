using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using NetTopologySuite.Geometries;
using Moq;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Models.Responses;
using Xunit;

namespace SunnySeat.Api.Tests.Endpoints;

public class PatioEndpointsTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly TestWebApplicationFactory _factory;

    public PatioEndpointsTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetPatios_WithValidLocation_ReturnsPatios()
    {
        // Arrange
        var latitude = 57.7089;
        var longitude = 11.9746;
        var radiusKm = 1.5;

        // Act
        var response = await _client.GetAsync($"/api/patios?latitude={latitude}&longitude={longitude}&radiusKm={radiusKm}");

        // Assert - Log error for debugging
        if (response.StatusCode != HttpStatusCode.OK)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            Console.WriteLine($"Error Response: {errorContent}");
        }

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<GetPatiosResponse>();
        result.Should().NotBeNull();
        result!.Patios.Should().NotBeNull();
        result.Timestamp.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task GetPatios_WithInvalidLatitude_ReturnsBadRequest()
    {
        // Arrange
        var invalidLatitude = 100.0; // Invalid: > 90
        var longitude = 11.9746;

        // Act
        var response = await _client.GetAsync($"/api/patios?latitude={invalidLatitude}&longitude={longitude}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetPatios_WithInvalidLongitude_ReturnsBadRequest()
    {
        // Arrange
        var latitude = 57.7089;
        var invalidLongitude = 200.0; // Invalid: > 180

        // Act
        var response = await _client.GetAsync($"/api/patios?latitude={latitude}&longitude={invalidLongitude}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetPatios_WithExcessiveRadius_ReturnsBadRequest()
    {
        // Arrange
        var latitude = 57.7089;
        var longitude = 11.9746;
        var excessiveRadius = 10.0; // Invalid: > 3.0 km max

        // Act
        var response = await _client.GetAsync($"/api/patios?latitude={latitude}&longitude={longitude}&radiusKm={excessiveRadius}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetPatios_WithoutRadius_UsesDefaultRadius()
    {
        // Arrange
        var latitude = 57.7089;
        var longitude = 11.9746;

        // Act
        var response = await _client.GetAsync($"/api/patios?latitude={latitude}&longitude={longitude}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<GetPatiosResponse>();
        result.Should().NotBeNull();
    }

    [Fact]
    public async Task GetPatios_WithNoPatiosInArea_ReturnsEmptyList()
    {
        // Arrange - Location in middle of ocean (no patios)
        var latitude = 0.0;
        var longitude = 0.0;
        var radiusKm = 1.0;

        // Act
        var response = await _client.GetAsync($"/api/patios?latitude={latitude}&longitude={longitude}&radiusKm={radiusKm}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<GetPatiosResponse>();
        result.Should().NotBeNull();
        result!.Patios.Should().BeEmpty();
        result.TotalCount.Should().Be(0);
    }

    [Fact]
    public async Task GetPatios_ResponseIncludesSunExposureData()
    {
        // Arrange
        var latitude = 57.7089;  // Gothenburg
        var longitude = 11.9746;
        var radiusKm = 2.0;

        // Act
        var response = await _client.GetAsync($"/api/patios?latitude={latitude}&longitude={longitude}&radiusKm={radiusKm}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<GetPatiosResponse>();
        result.Should().NotBeNull();

        if (result!.Patios.Any())
        {
            var firstPatio = result.Patios.First();
            firstPatio.CurrentSunStatus.Should().BeOneOf("Sunny", "Partial", "Shaded");
            firstPatio.Confidence.Should().BeInRange(0, 100);
            firstPatio.VenueName.Should().NotBeNullOrEmpty();
            firstPatio.Location.Should().NotBeNull();
            firstPatio.Location.Latitude.Should().BeInRange(-90, 90);
            firstPatio.Location.Longitude.Should().BeInRange(-180, 180);
        }
    }
}
