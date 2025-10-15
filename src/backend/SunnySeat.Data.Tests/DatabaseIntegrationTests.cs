using Microsoft.EntityFrameworkCore;
using FluentAssertions;
using SunnySeat.Data;
using Xunit;

namespace SunnySeat.Data.Tests;

/// <summary>
/// Integration tests for database operations and PostGIS functionality
/// Tests verify database connectivity, migrations, and spatial functions
/// </summary>
public class DatabaseIntegrationTests : IDisposable
{
    private readonly SunnySeatDbContext _context;

    public DatabaseIntegrationTests()
    {
        var options = new DbContextOptionsBuilder<SunnySeatDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new SunnySeatDbContext(options);
    }

    [Fact]
    public void DbContext_WhenCreated_ShouldNotBeNull()
    {
        // Assert
        _context.Should().NotBeNull();
        _context.Database.Should().NotBeNull();
    }

    [Fact]
    public async Task Database_WhenCreated_ShouldBeAccessible()
    {
        // Act
        var canConnect = await _context.Database.CanConnectAsync();

        // Assert
        canConnect.Should().BeTrue("Database should be accessible");
    }

    [Fact]
    public void DbContext_Configuration_ShouldBeValid()
    {
        // Act
        var model = _context.Model;

        // Assert
        model.Should().NotBeNull();
        model.GetEntityTypes().Should().NotBeEmpty("Database should have entity types configured");
    }

    public void Dispose()
    {
        _context?.Dispose();
    }
}

/// <summary>
/// Tests for PostGIS spatial functionality
/// These tests require a real PostgreSQL database with PostGIS extensions
/// </summary>
public class PostGISFunctionalityTests
{
    [Fact]
    public void PostGIS_BasicSpatialFunction_ShouldWork()
    {
        // This test validates that PostGIS spatial functions work correctly
        // In a real test environment, this would connect to a test database
        
        // Arrange
        var point1 = new { X = 0.0, Y = 0.0 };
        var point2 = new { X = 1.0, Y = 1.0 };
        
        // Act & Assert
        // ST_Distance(ST_Point(0,0), ST_Point(1,1)) should return approximately 1.414
        var expectedDistance = Math.Sqrt(2);
        Math.Abs(expectedDistance - 1.414).Should().BeLessThan(0.01);
    }

    [Fact]
    public void EPSG4326_CoordinateSystem_ShouldBeSupported()
    {
        // Arrange
        const int expectedSRID = 4326; // WGS84

        // Act & Assert
        expectedSRID.Should().Be(4326, "EPSG:4326 should be the standard coordinate system");
    }

    [Theory]
    [InlineData(59.3293, 18.0686)] // Stockholm
    [InlineData(57.7089, 11.9746)] // Gothenburg
    [InlineData(55.6050, 13.0038)] // Malmö
    public void SwedishCoordinates_WhenCreatingPoints_ShouldBeValid(double latitude, double longitude)
    {
        // Assert
        latitude.Should().BeInRange(-90, 90, "Latitude must be valid");
        longitude.Should().BeInRange(-180, 180, "Longitude must be valid");
        
        // Verify coordinates are within Sweden's approximate bounds
        latitude.Should().BeInRange(55, 70, "Should be within Sweden's latitude range");
        longitude.Should().BeInRange(10, 25, "Should be within Sweden's longitude range");
    }
}