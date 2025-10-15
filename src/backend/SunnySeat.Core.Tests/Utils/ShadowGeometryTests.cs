using FluentAssertions;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Utils;
using Xunit;

namespace SunnySeat.Core.Tests.Utils;

/// <summary>
/// Unit tests for ShadowGeometry utility functions
/// </summary>
public class ShadowGeometryTests
{
    private readonly GeometryFactory _geometryFactory;

    public ShadowGeometryTests()
    {
        _geometryFactory = new GeometryFactory();
    }

    [Fact]
    public void CalculateShadowLength_ValidInputs_ReturnsCorrectLength()
    {
        // Arrange
        var buildingHeight = 10.0; // 10 meter building
        var sunElevation = 45.0;   // 45 degree sun angle

        // Act
        var shadowLength = ShadowGeometry.CalculateShadowLength(buildingHeight, sunElevation);

        // Assert
        shadowLength.Should().BeApproximately(10.0, 0.1); // Should equal building height at 45°
    }

    [Theory]
    [InlineData(20.0, 30.0, 34.64)] // 20m building, 30° sun -> ~34.6m shadow
    [InlineData(15.0, 60.0, 8.66)]  // 15m building, 60° sun -> ~8.7m shadow  
    [InlineData(5.0, 15.0, 18.66)]  // 5m building, 15° sun -> ~18.7m shadow
    public void CalculateShadowLength_VariousAngles_ReturnsExpectedLengths(
        double buildingHeight, double sunElevation, double expectedLength)
    {
        // Act
        var shadowLength = ShadowGeometry.CalculateShadowLength(buildingHeight, sunElevation);

        // Assert
        shadowLength.Should().BeApproximately(expectedLength, 0.1);
    }

    [Fact]
    public void CalculateShadowLength_SunAtHorizon_ReturnsZero()
    {
        // Act
        var shadowLength = ShadowGeometry.CalculateShadowLength(10.0, 0.0);

        // Assert
        shadowLength.Should().Be(0.0);
    }

    [Fact]
    public void CalculateShadowLength_NegativeElevation_ReturnsZero()
    {
        // Act
        var shadowLength = ShadowGeometry.CalculateShadowLength(10.0, -5.0);

        // Assert
        shadowLength.Should().Be(0.0);
    }

    [Fact]
    public void ProjectBuildingShadow_ValidInputs_ReturnsShadowPolygon()
    {
        // Arrange
        var buildingFootprint = CreateSquareBuilding(11.97, 57.71, 0.001); // ~100m square in Gothenburg
        var buildingHeight = 15.0;
        var solarPosition = new SolarPosition
        {
            Azimuth = 180.0,   // South-facing sun
            Elevation = 45.0,  // 45 degree elevation
            Timestamp = DateTime.UtcNow
        };

        // Act
        var shadowPolygon = ShadowGeometry.ProjectBuildingShadow(
            buildingFootprint, buildingHeight, solarPosition, _geometryFactory);

        // Assert
        shadowPolygon.Should().NotBeNull();
        shadowPolygon!.IsValid.Should().BeTrue();
        shadowPolygon.Area.Should().BeGreaterThan(buildingFootprint.Area);
    }

    [Fact]
    public void ProjectBuildingShadow_SunBelowHorizon_ReturnsNull()
    {
        // Arrange
        var buildingFootprint = CreateSquareBuilding(11.97, 57.71, 0.001);
        var buildingHeight = 15.0;
        var solarPosition = new SolarPosition
        {
            Azimuth = 180.0,
            Elevation = -10.0, // Sun below horizon
            Timestamp = DateTime.UtcNow
        };

        // Act
        var shadowPolygon = ShadowGeometry.ProjectBuildingShadow(
            buildingFootprint, buildingHeight, solarPosition, _geometryFactory);

        // Assert
        shadowPolygon.Should().BeNull();
    }

    [Fact]
    public void ProjectBuildingShadow_LowSunAngle_ReturnsNull()
    {
        // Arrange
        var buildingFootprint = CreateSquareBuilding(11.97, 57.71, 0.001);
        var buildingHeight = 15.0;
        var solarPosition = new SolarPosition
        {
            Azimuth = 180.0,
            Elevation = 3.0, // Very low sun (below reliable threshold)
            Timestamp = DateTime.UtcNow
        };

        // Act
        var shadowPolygon = ShadowGeometry.ProjectBuildingShadow(
            buildingFootprint, buildingHeight, solarPosition, _geometryFactory);

        // Assert
        shadowPolygon.Should().BeNull();
    }

    [Fact]
    public void ProjectPolygonInDirection_ValidInputs_ReturnsProjectedPolygon()
    {
        // Arrange
        var originalPolygon = CreateSquareBuilding(0.0, 0.0, 0.001);
        var distance = 100.0; // 100 meters
        var direction = 90.0; // East

        // Act
        var projectedPolygon = ShadowGeometry.ProjectPolygonInDirection(
            originalPolygon, distance, direction, _geometryFactory);

        // Assert
        projectedPolygon.Should().NotBeNull();
        projectedPolygon.IsValid.Should().BeTrue();
        projectedPolygon.Area.Should().BeGreaterThan(originalPolygon.Area);
    }

    [Theory]
    [InlineData(0.0)]    // North
    [InlineData(90.0)]   // East
    [InlineData(180.0)]  // South
    [InlineData(270.0)]  // West
    public void ProjectPolygonInDirection_CardinalDirections_ReturnsValidPolygon(double direction)
    {
        // Arrange
        var originalPolygon = CreateSquareBuilding(0.0, 0.0, 0.001);
        var distance = 50.0;

        // Act
        var projectedPolygon = ShadowGeometry.ProjectPolygonInDirection(
            originalPolygon, distance, direction, _geometryFactory);

        // Assert
        projectedPolygon.Should().NotBeNull();
        projectedPolygon.IsValid.Should().BeTrue();
    }

    [Fact]
    public void CalculateShadowCoveragePercent_FullOverlap_Returns100Percent()
    {
        // Arrange
        var patioGeometry = CreateSquareBuilding(0.0, 0.0, 0.001);
        var shadowGeometry = CreateSquareBuilding(0.0, 0.0, 0.002); // Larger shadow

        // Act
        var coveragePercent = ShadowGeometry.CalculateShadowCoveragePercent(patioGeometry, shadowGeometry);

        // Assert
        coveragePercent.Should().Be(100.0);
    }

    [Fact]
    public void CalculateShadowCoveragePercent_NoOverlap_ReturnsZeroPercent()
    {
        // Arrange
        var patioGeometry = CreateSquareBuilding(0.0, 0.0, 0.001);
        var shadowGeometry = CreateSquareBuilding(0.01, 0.01, 0.001); // Non-overlapping

        // Act
        var coveragePercent = ShadowGeometry.CalculateShadowCoveragePercent(patioGeometry, shadowGeometry);

        // Assert
        coveragePercent.Should().Be(0.0);
    }

    [Fact]
    public void CalculateShadowCoveragePercent_PartialOverlap_ReturnsPartialPercent()
    {
        // Arrange
        var patioGeometry = CreateSquareBuilding(0.0, 0.0, 0.001);
        var shadowGeometry = CreateSquareBuilding(0.0005, 0.0005, 0.001); // 50% overlap

        // Act
        var coveragePercent = ShadowGeometry.CalculateShadowCoveragePercent(patioGeometry, shadowGeometry);

        // Assert
        coveragePercent.Should().BeGreaterThan(0.0);
        coveragePercent.Should().BeLessThan(100.0);
    }

    [Fact]
    public void CalculateShadowedAndSunlitAreas_ValidInputs_ReturnsBothGeometries()
    {
        // Arrange
        var patioGeometry = CreateSquareBuilding(0.0, 0.0, 0.002);
        var shadowGeometries = new[]
        {
            CreateSquareBuilding(0.0, 0.0, 0.001) // Partial shadow
        };

        // Act
        var (shadowedArea, sunlitArea) = ShadowGeometry.CalculateShadowedAndSunlitAreas(
            patioGeometry, shadowGeometries, _geometryFactory);

        // Assert
        shadowedArea.Should().NotBeNull();
        sunlitArea.Should().NotBeNull();
    }

    [Fact]
    public void CalculateShadowedAndSunlitAreas_NoShadows_ReturnsOnlySunlitArea()
    {
        // Arrange
        var patioGeometry = CreateSquareBuilding(0.0, 0.0, 0.001);
        var shadowGeometries = Array.Empty<Polygon>();

        // Act
        var (shadowedArea, sunlitArea) = ShadowGeometry.CalculateShadowedAndSunlitAreas(
            patioGeometry, shadowGeometries, _geometryFactory);

        // Assert
        shadowedArea.Should().BeNull();
        sunlitArea.Should().NotBeNull();
        sunlitArea!.Area.Should().BeApproximately(patioGeometry.Area, 0.0001);
    }

    [Fact]
    public void CalculateShadowConfidence_HighQualityData_ReturnsHighConfidence()
    {
        // Arrange
        var building = new Building
        {
            HeightSource = HeightSource.Surveyed,
            Height = 15.0
        };
        var solarPosition = new SolarPosition { Elevation = 45.0 };
        var shadowLength = 15.0;

        // Act
        var confidence = ShadowGeometry.CalculateShadowConfidence(building, solarPosition, shadowLength);

        // Assert
        confidence.Should().BeGreaterThan(0.9);
        confidence.Should().BeLessOrEqualTo(1.0);
    }

    [Fact]
    public void CalculateShadowConfidence_LowQualityData_ReturnsLowConfidence()
    {
        // Arrange
        var building = new Building
        {
            HeightSource = HeightSource.Heuristic,
            Height = 15.0
        };
        var solarPosition = new SolarPosition { Elevation = 8.0 }; // Low sun angle
        var shadowLength = 150.0; // Very long shadow

        // Act
        var confidence = ShadowGeometry.CalculateShadowConfidence(building, solarPosition, shadowLength);

        // Assert
        confidence.Should().BeLessThan(0.8);
        confidence.Should().BeGreaterThan(0.0);
    }

    [Theory]
    [InlineData(HeightSource.Surveyed, 1.0)]
    [InlineData(HeightSource.Osm, 0.85)]
    [InlineData(HeightSource.Heuristic, 0.7)]
    public void CalculateShadowConfidence_DifferentHeightSources_ReturnsExpectedConfidence(
        HeightSource heightSource, double expectedBaseConfidence)
    {
        // Arrange
        var building = new Building
        {
            HeightSource = heightSource,
            Height = 15.0
        };
        var solarPosition = new SolarPosition { Elevation = 45.0 }; // Good conditions
        var shadowLength = 15.0; // Normal length

        // Act
        var confidence = ShadowGeometry.CalculateShadowConfidence(building, solarPosition, shadowLength);

        // Assert
        confidence.Should().BeApproximately(expectedBaseConfidence, 0.05);
    }

    [Fact]
    public void CalculateShadowConfidence_VeryLongShadow_ReducesConfidence()
    {
        // Arrange
        var building = new Building
        {
            HeightSource = HeightSource.Surveyed,
            Height = 15.0
        };
        var solarPosition = new SolarPosition { Elevation = 45.0 };
        var longShadowLength = 150.0; // Very long shadow
        var normalShadowLength = 15.0; // Normal shadow

        // Act
        var longShadowConfidence = ShadowGeometry.CalculateShadowConfidence(building, solarPosition, longShadowLength);
        var normalShadowConfidence = ShadowGeometry.CalculateShadowConfidence(building, solarPosition, normalShadowLength);

        // Assert
        longShadowConfidence.Should().BeLessThan(normalShadowConfidence);
    }

    /// <summary>
    /// Create a square building polygon for testing
    /// </summary>
    /// <param name="centerLon">Center longitude</param>
    /// <param name="centerLat">Center latitude</param>
    /// <param name="sizeOffset">Half the size of the square in degrees</param>
    /// <returns>Square polygon</returns>
    private Polygon CreateSquareBuilding(double centerLon, double centerLat, double sizeOffset)
    {
        var coordinates = new[]
        {
            new Coordinate(centerLon - sizeOffset, centerLat - sizeOffset),
            new Coordinate(centerLon + sizeOffset, centerLat - sizeOffset),
            new Coordinate(centerLon + sizeOffset, centerLat + sizeOffset),
            new Coordinate(centerLon - sizeOffset, centerLat + sizeOffset),
            new Coordinate(centerLon - sizeOffset, centerLat - sizeOffset) // Close the ring
        };

        return _geometryFactory.CreatePolygon(coordinates);
    }
}