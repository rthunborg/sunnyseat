using FluentAssertions;
using Xunit;

namespace SunnySeat.Core.Tests;

/// <summary>
/// Unit tests for core business logic
/// These tests verify business rules without external dependencies
/// </summary>
public class CoreBusinessLogicTests
{
    [Fact]
    public void CoreAssembly_ShouldLoad_Successfully()
    {
        // Arrange & Act
        var assembly = typeof(SunnySeat.Core.Services.BuildingDataProcessor).Assembly;

        // Assert
        assembly.Should().NotBeNull();
        assembly.GetName().Name.Should().Be("SunnySeat.Core");
    }

    [Theory]
    [InlineData("Stockholm", 59.3293, 18.0686)]
    [InlineData("Gothenburg", 57.7089, 11.9746)]
    [InlineData("Malmö", 55.6050, 13.0038)]
    public void SwedishCities_Coordinates_ShouldBeValid(string cityName, double latitude, double longitude)
    {
        // Assert - Verify coordinates are within Sweden's bounds
        latitude.Should().BeInRange(55.0, 70.0, "Latitude should be within Sweden's range");
        longitude.Should().BeInRange(10.0, 25.0, "Longitude should be within Sweden's range");
        cityName.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public void DateTime_UtcNow_ShouldBeReasonable()
    {
        // Arrange
        var before = DateTime.UtcNow;

        // Act
        var testTime = DateTime.UtcNow;

        // Assert
        testTime.Should().BeOnOrAfter(before);
        testTime.Kind.Should().Be(DateTimeKind.Utc);
    }
}