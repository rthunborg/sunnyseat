using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using NetTopologySuite.Geometries;
using NetTopologySuite;
using SunnySeat.Core.Services;
using Xunit;

namespace SunnySeat.Core.Tests.Services;

public class BuildingDataProcessorTests
{
    private readonly Mock<ILogger<BuildingDataProcessor>> _loggerMock;
    private readonly BuildingDataProcessor _processor;
    private readonly GeometryFactory _geometryFactory;

    public BuildingDataProcessorTests()
    {
        _loggerMock = new Mock<ILogger<BuildingDataProcessor>>();
        _processor = new BuildingDataProcessor(_loggerMock.Object);
        _geometryFactory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);
    }

    [Fact]
    public void ValidateGeometry_WhenValidPolygon_ReturnsValid()
    {
        // Arrange
        var coordinates = new[]
        {
            new Coordinate(0, 0),
            new Coordinate(10, 0),
            new Coordinate(10, 10),
            new Coordinate(0, 10),
            new Coordinate(0, 0) // Close the ring
        };
        var polygon = _geometryFactory.CreatePolygon(coordinates);

        // Act
        var result = _processor.ValidateGeometry(polygon);

        // Assert
        result.Should().NotBeNull();
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
        result.QualityScore.Should().Be(1.0);
        result.Area.Should().Be(100.0); // 10x10 square
    }

    [Fact]
    public void ValidateGeometry_WhenInvalidGeometry_ReturnsInvalid()
    {
        // Arrange - Create self-intersecting polygon (figure-8 shape)
        var coordinates = new[]
        {
            new Coordinate(0, 0),
            new Coordinate(10, 10),
            new Coordinate(10, 0),
            new Coordinate(0, 10),
            new Coordinate(0, 0)
        };
        var polygon = _geometryFactory.CreatePolygon(coordinates);

        // Act
        var result = _processor.ValidateGeometry(polygon);

        // Assert
        result.Should().NotBeNull();
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("Invalid geometry"));
        result.QualityScore.Should().Be(0.0);
    }

    [Fact]
    public void ValidateGeometry_WhenNotPolygon_ReturnsInvalid()
    {
        // Arrange
        var point = _geometryFactory.CreatePoint(new Coordinate(0, 0));

        // Act
        var result = _processor.ValidateGeometry(point);

        // Assert
        result.Should().NotBeNull();
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("Expected Polygon"));
        result.QualityScore.Should().Be(0.0);
    }

    [Fact]
    public void ValidateGeometry_WhenVerySmallBuilding_ReturnsWarning()
    {
        // Arrange - Very small building (5 sq meters)
        var coordinates = new[]
        {
            new Coordinate(0, 0),
            new Coordinate(2.5, 0),
            new Coordinate(2.5, 2),
            new Coordinate(0, 2),
            new Coordinate(0, 0)
        };
        var polygon = _geometryFactory.CreatePolygon(coordinates);

        // Act
        var result = _processor.ValidateGeometry(polygon);

        // Assert
        result.Should().NotBeNull();
        result.IsValid.Should().BeTrue();
        result.Warnings.Should().Contain(w => w.Contains("Very small building footprint"));
        result.QualityScore.Should().BeLessThan(1.0);
    }

    [Fact]
    public void EstimateHeight_WhenExplicitHeightProvided_ReturnsExplicitHeight()
    {
        // Arrange
        var sourceData = new Dictionary<string, object?>
        {
            ["height"] = 25.5
        };

        // Act
        var result = _processor.EstimateHeight(sourceData);

        // Assert
        result.Should().NotBeNull();
        result.Height.Should().Be(25.5);
        result.Source.Should().Be("explicit_height");
        result.Confidence.Should().Be(0.95);
    }

    [Fact]
    public void EstimateHeight_WhenFloorCountProvided_CalculatesFromFloors()
    {
        // Arrange
        var sourceData = new Dictionary<string, object?>
        {
            ["floors"] = 4
        };

        // Act
        var result = _processor.EstimateHeight(sourceData);

        // Assert
        result.Should().NotBeNull();
        result.Height.Should().Be(14.0); // 4 * 3.5
        result.Source.Should().Be("floor_heuristic");
        result.Confidence.Should().Be(0.7);
        result.FloorCount.Should().Be(4);
    }

    [Theory]
    [InlineData("house", 8.0)]
    [InlineData("apartment", 12.0)]
    [InlineData("commercial", 15.0)]
    [InlineData("industrial", 10.0)]
    [InlineData("church", 20.0)]
    [InlineData("garage", 4.0)]
    public void EstimateHeight_WhenBuildingTypeProvided_UsesTypeHeuristic(string buildingType, double expectedHeight)
    {
        // Arrange
        var sourceData = new Dictionary<string, object?>
        {
            ["building"] = buildingType
        };

        // Act
        var result = _processor.EstimateHeight(sourceData);

        // Assert
        result.Should().NotBeNull();
        result.Height.Should().Be(expectedHeight);
        result.Source.Should().Be("type_heuristic");
        result.Confidence.Should().Be(0.5);
        result.BuildingType.Should().Be(buildingType);
    }

    [Fact]
    public void EstimateHeight_WhenNoDataProvided_UsesDefault()
    {
        // Arrange
        var sourceData = new Dictionary<string, object?>();

        // Act
        var result = _processor.EstimateHeight(sourceData);

        // Assert
        result.Should().NotBeNull();
        result.Height.Should().Be(6.0);
        result.Source.Should().Be("default_heuristic");
        result.Confidence.Should().Be(0.3);
    }

    [Fact]
    public void EstimateHeight_WhenInvalidFloorCount_UsesDefault()
    {
        // Arrange
        var sourceData = new Dictionary<string, object?>
        {
            ["floors"] = -1 // Invalid floor count
        };

        // Act
        var result = _processor.EstimateHeight(sourceData);

        // Assert
        result.Should().NotBeNull();
        result.Height.Should().Be(6.0);
        result.Source.Should().Be("default_heuristic");
    }

    [Fact]
    public void EstimateHeight_WhenMultipleFieldsProvided_PrefersExplicitHeight()
    {
        // Arrange
        var sourceData = new Dictionary<string, object?>
        {
            ["height"] = 30.0,
            ["floors"] = 5,
            ["building"] = "office"
        };

        // Act
        var result = _processor.EstimateHeight(sourceData);

        // Assert
        result.Should().NotBeNull();
        result.Height.Should().Be(30.0);
        result.Source.Should().Be("explicit_height");
        result.Confidence.Should().Be(0.95);
    }
}