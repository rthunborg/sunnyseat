using FluentAssertions;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Services;
using Xunit;

namespace SunnySeat.Core.Tests.Services;

/// <summary>
/// Basic tests for ShadowCalculationService functionality
/// </summary>
public class ShadowCalculationBasicTests
{
    [Fact]
    public void BuildingHeightManager_GetEffectiveHeight_WithValidBuilding_ReturnsHeight()
    {
        // Arrange
        var heightManager = new BuildingHeightManager();
        var building = new Building
        {
            Height = 15.0,
            HeightSource = HeightSource.Osm
        };

        // Act
        var effectiveHeight = heightManager.GetEffectiveHeight(building);

        // Assert
        effectiveHeight.Should().Be(15.0);
    }

    [Fact]
    public void BuildingHeightManager_CalculateHeightConfidence_OsmData_ReturnsExpectedConfidence()
    {
        // Arrange
        var heightManager = new BuildingHeightManager();
        var building = new Building
        {
            HeightSource = HeightSource.Osm,
            Height = 10.0
        };

        // Act
        var confidence = heightManager.CalculateHeightConfidence(building);

        // Assert
        confidence.Should().Be(0.80);
    }

    [Fact]
    public void BuildingHeightManager_CanCastMeaningShadow_TallBuilding_ReturnsTrue()
    {
        // Arrange
        var heightManager = new BuildingHeightManager();
        var building = new Building
        {
            Height = 15.0
        };

        // Act
        var canCast = heightManager.CanCastMeaningShadow(building);

        // Assert
        canCast.Should().BeTrue();
    }

    [Fact]
    public void BuildingHeightManager_CanCastMeaningShadow_ShortBuilding_ReturnsFalse()
    {
        // Arrange
        var heightManager = new BuildingHeightManager();
        var building = new Building
        {
            Height = 2.0 // Below 3m threshold
        };

        // Act
        var canCast = heightManager.CanCastMeaningShadow(building);

        // Assert
        canCast.Should().BeFalse();
    }
}