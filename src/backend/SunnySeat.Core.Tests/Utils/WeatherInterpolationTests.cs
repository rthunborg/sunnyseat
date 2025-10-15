using FluentAssertions;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Utils;
using Xunit;

namespace SunnySeat.Core.Tests.Utils;

/// <summary>
/// Unit tests for WeatherInterpolation spatial and temporal interpolation
/// </summary>
public class WeatherInterpolationTests
{
    private readonly GeometryFactory _geometryFactory;

    public WeatherInterpolationTests()
    {
        _geometryFactory = new GeometryFactory();
    }

    #region Spatial Interpolation Tests

    [Fact]
    public void InterpolateForLocation_SingleGridPoint_ReturnsSameData()
    {
        // Arrange
        var patioLocation = _geometryFactory.CreatePoint(new Coordinate(11.97, 57.71));
        var gridPoint = _geometryFactory.CreatePoint(new Coordinate(11.97, 57.71));

        var gridWeather = new ProcessedWeather
        {
            Id = 1,
            Timestamp = DateTime.UtcNow,
            NormalizedCloudCover = 50.0,
            PrecipitationIntensity = 0.0,
            Condition = WeatherCondition.PartlyCloudy,
            IsSunBlocking = false,
            ConfidenceLevel = 0.85,
            Location = gridPoint
        };

        var gridData = new List<(Point GridPoint, ProcessedWeather Weather)>
        {
            (gridPoint, gridWeather)
        };

        // Act
        var result = WeatherInterpolation.InterpolateForLocation(patioLocation, gridData);

        // Assert
        result.Should().NotBeNull();
        result.NormalizedCloudCover.Should().Be(50.0);
        result.Condition.Should().Be(WeatherCondition.PartlyCloudy);
        result.Location.Should().Be(patioLocation);
    }

    [Fact]
    public void InterpolateForLocation_FourGridPoints_InterpolatesCorrectly()
    {
        // Arrange - Create a 2x2 grid around the patio
        var patioLocation = _geometryFactory.CreatePoint(new Coordinate(12.0, 57.7)); // Center

        var gridData = new List<(Point GridPoint, ProcessedWeather Weather)>
        {
            // Southwest corner - cloudy
            (_geometryFactory.CreatePoint(new Coordinate(11.99, 57.69)),
                CreateWeather(80.0, 0.0, WeatherCondition.Cloudy)),
            
            // Southeast corner - clear
            (_geometryFactory.CreatePoint(new Coordinate(12.01, 57.69)),
                CreateWeather(10.0, 0.0, WeatherCondition.Clear)),
            
            // Northwest corner - partly cloudy
            (_geometryFactory.CreatePoint(new Coordinate(11.99, 57.71)),
                CreateWeather(40.0, 0.0, WeatherCondition.PartlyCloudy)),
            
            // Northeast corner - partly cloudy
            (_geometryFactory.CreatePoint(new Coordinate(12.01, 57.71)),
                CreateWeather(30.0, 0.0, WeatherCondition.PartlyCloudy))
        };

        // Act
        var result = WeatherInterpolation.InterpolateForLocation(patioLocation, gridData);

        // Assert
        result.Should().NotBeNull();
        result.Location.Should().Be(patioLocation);
        // Cloud cover should be somewhere between the values (weighted average)
        result.NormalizedCloudCover.Should().BeGreaterThan(10.0);
        result.NormalizedCloudCover.Should().BeLessThan(80.0);
        // Given the distribution, should be partly cloudy
        result.Condition.Should().BeOneOf(
            WeatherCondition.Clear,
            WeatherCondition.PartlyCloudy,
            WeatherCondition.Cloudy);
    }

    [Fact]
    public void InterpolateForLocation_PatioAtGridPoint_ReturnsExactValue()
    {
        // Arrange - Patio exactly at a grid point
        var patioLocation = _geometryFactory.CreatePoint(new Coordinate(12.0, 57.7));

        var gridData = new List<(Point GridPoint, ProcessedWeather Weather)>
        {
            (patioLocation, CreateWeather(65.0, 0.0, WeatherCondition.Cloudy)),
            (_geometryFactory.CreatePoint(new Coordinate(12.01, 57.7)),
                CreateWeather(20.0, 0.0, WeatherCondition.PartlyCloudy)),
            (_geometryFactory.CreatePoint(new Coordinate(12.0, 57.71)),
                CreateWeather(30.0, 0.0, WeatherCondition.PartlyCloudy))
        };

        // Act
        var result = WeatherInterpolation.InterpolateForLocation(patioLocation, gridData);

        // Assert - Should be heavily weighted toward the exact match
        result.NormalizedCloudCover.Should().BeApproximately(65.0, 5.0);
    }

    [Fact]
    public void InterpolateForLocation_BoundaryCondition_HandlesEdgeCases()
    {
        // Arrange - Patio near grid boundary
        var patioLocation = _geometryFactory.CreatePoint(new Coordinate(11.95, 57.68));

        var gridData = new List<(Point GridPoint, ProcessedWeather Weather)>
        {
            (_geometryFactory.CreatePoint(new Coordinate(11.95, 57.69)),
                CreateWeather(50.0, 0.5, WeatherCondition.Precipitation)),
            (_geometryFactory.CreatePoint(new Coordinate(11.96, 57.69)),
                CreateWeather(40.0, 0.0, WeatherCondition.PartlyCloudy))
        };

        // Act
        var result = WeatherInterpolation.InterpolateForLocation(patioLocation, gridData);

        // Assert
        result.Should().NotBeNull();
        result.Location.Should().Be(patioLocation);
        // Should use nearest neighbor since less than 4 points
        result.NormalizedCloudCover.Should().Be(50.0);
    }

    [Fact]
    public void InterpolateForLocation_PrecipitationInterpolation_AveragesIntensity()
    {
        // Arrange
        var patioLocation = _geometryFactory.CreatePoint(new Coordinate(12.0, 57.7));

        var gridData = new List<(Point GridPoint, ProcessedWeather Weather)>
        {
            (_geometryFactory.CreatePoint(new Coordinate(11.99, 57.69)),
                CreateWeather(70.0, 2.0, WeatherCondition.Precipitation)),
            (_geometryFactory.CreatePoint(new Coordinate(12.01, 57.69)),
                CreateWeather(60.0, 0.0, WeatherCondition.PartlyCloudy)),
            (_geometryFactory.CreatePoint(new Coordinate(11.99, 57.71)),
                CreateWeather(65.0, 1.0, WeatherCondition.Precipitation)),
            (_geometryFactory.CreatePoint(new Coordinate(12.01, 57.71)),
                CreateWeather(55.0, 0.5, WeatherCondition.Precipitation))
        };

        // Act
        var result = WeatherInterpolation.InterpolateForLocation(patioLocation, gridData);

        // Assert
        result.PrecipitationIntensity.Should().BeGreaterThan(0.0);
        result.PrecipitationIntensity.Should().BeLessThan(2.0);
    }

    #endregion

    #region Temporal Interpolation Tests

    [Fact]
    public void InterpolateTemporally_MidpointTime_AveragesValues()
    {
        // Arrange
        var baseTime = DateTime.UtcNow;
        var weather1 = CreateWeather(20.0, 0.0, WeatherCondition.PartlyCloudy, baseTime);
        var weather2 = CreateWeather(60.0, 0.0, WeatherCondition.Cloudy, baseTime.AddHours(2));
        var targetTime = baseTime.AddHours(1); // Midpoint

        // Act
        var result = WeatherInterpolation.InterpolateTemporally(targetTime, weather1, weather2);

        // Assert
        result.Timestamp.Should().Be(targetTime);
        result.NormalizedCloudCover.Should().BeApproximately(40.0, 0.1); // Average of 20 and 60
    }

    [Fact]
    public void InterpolateTemporally_QuarterTime_WeightsCorrectly()
    {
        // Arrange
        var baseTime = DateTime.UtcNow;
        var weather1 = CreateWeather(0.0, 0.0, WeatherCondition.Clear, baseTime);
        var weather2 = CreateWeather(100.0, 0.0, WeatherCondition.Overcast, baseTime.AddHours(4));
        var targetTime = baseTime.AddHours(1); // 25% of the way

        // Act
        var result = WeatherInterpolation.InterpolateTemporally(targetTime, weather1, weather2);

        // Assert
        result.NormalizedCloudCover.Should().BeApproximately(25.0, 0.1);
    }

    [Fact]
    public void InterpolateTemporally_BeforeFirstTime_ReturnsFirstWeather()
    {
        // Arrange
        var baseTime = DateTime.UtcNow;
        var weather1 = CreateWeather(30.0, 0.0, WeatherCondition.PartlyCloudy, baseTime);
        var weather2 = CreateWeather(70.0, 0.0, WeatherCondition.Cloudy, baseTime.AddHours(2));
        var targetTime = baseTime.AddHours(-1); // Before first

        // Act
        var result = WeatherInterpolation.InterpolateTemporally(targetTime, weather1, weather2);

        // Assert
        result.NormalizedCloudCover.Should().Be(30.0);
        result.Condition.Should().Be(WeatherCondition.PartlyCloudy);
    }

    [Fact]
    public void InterpolateTemporally_AfterSecondTime_ReturnsSecondWeather()
    {
        // Arrange
        var baseTime = DateTime.UtcNow;
        var weather1 = CreateWeather(30.0, 0.0, WeatherCondition.PartlyCloudy, baseTime);
        var weather2 = CreateWeather(70.0, 0.0, WeatherCondition.Cloudy, baseTime.AddHours(2));
        var targetTime = baseTime.AddHours(3); // After second

        // Act
        var result = WeatherInterpolation.InterpolateTemporally(targetTime, weather1, weather2);

        // Assert
        result.NormalizedCloudCover.Should().Be(70.0);
        result.Condition.Should().Be(WeatherCondition.Cloudy);
    }

    [Fact]
    public void InterpolateTemporally_PrecipitationTransition_InterpolatesIntensity()
    {
        // Arrange
        var baseTime = DateTime.UtcNow;
        var weather1 = CreateWeather(40.0, 0.0, WeatherCondition.PartlyCloudy, baseTime);
        var weather2 = CreateWeather(80.0, 2.0, WeatherCondition.Precipitation, baseTime.AddHours(1));
        var targetTime = baseTime.AddMinutes(30); // Halfway

        // Act
        var result = WeatherInterpolation.InterpolateTemporally(targetTime, weather1, weather2);

        // Assert
        result.PrecipitationIntensity.Should().BeApproximately(1.0, 0.1);
        result.NormalizedCloudCover.Should().BeApproximately(60.0, 0.1);
    }

    [Fact]
    public void InterpolateTemporally_ConditionRecategorization_UpdatesCorrectly()
    {
        // Arrange
        var baseTime = DateTime.UtcNow;
        var weather1 = CreateWeather(15.0, 0.0, WeatherCondition.Clear, baseTime);
        var weather2 = CreateWeather(85.0, 0.0, WeatherCondition.Overcast, baseTime.AddHours(2));
        var targetTime = baseTime.AddMinutes(45); // ~37.5% through

        // Act
        var result = WeatherInterpolation.InterpolateTemporally(targetTime, weather1, weather2);

        // Assert
        var expectedCloudCover = 15.0 + (85.0 - 15.0) * 0.375;
        result.NormalizedCloudCover.Should().BeApproximately(expectedCloudCover, 0.5);
        // Should be categorized based on interpolated value
        result.Condition.Should().BeOneOf(
            WeatherCondition.PartlyCloudy,
            WeatherCondition.Cloudy);
    }

    #endregion

    #region Edge Cases and Error Handling

    [Fact]
    public void InterpolateForLocation_NullPatioLocation_ThrowsArgumentNullException()
    {
        // Arrange
        var gridData = new List<(Point GridPoint, ProcessedWeather Weather)>
        {
            (_geometryFactory.CreatePoint(new Coordinate(12.0, 57.7)),
                CreateWeather(50.0, 0.0, WeatherCondition.PartlyCloudy))
        };

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            WeatherInterpolation.InterpolateForLocation(null!, gridData));
    }

    [Fact]
    public void InterpolateForLocation_EmptyGridData_ThrowsArgumentException()
    {
        // Arrange
        var patioLocation = _geometryFactory.CreatePoint(new Coordinate(12.0, 57.7));
        var emptyGrid = new List<(Point GridPoint, ProcessedWeather Weather)>();

        // Act & Assert
        Assert.Throws<ArgumentException>(() =>
            WeatherInterpolation.InterpolateForLocation(patioLocation, emptyGrid));
    }

    [Fact]
    public void InterpolateTemporally_NullWeather_ThrowsArgumentNullException()
    {
        // Arrange
        var baseTime = DateTime.UtcNow;
        var weather = CreateWeather(50.0, 0.0, WeatherCondition.PartlyCloudy, baseTime);

        // Act & Assert
        Assert.Throws<ArgumentNullException>(() =>
            WeatherInterpolation.InterpolateTemporally(baseTime, null!, weather));

        Assert.Throws<ArgumentNullException>(() =>
            WeatherInterpolation.InterpolateTemporally(baseTime, weather, null!));
    }

    [Fact]
    public void InterpolateTemporally_ReversedTimeOrder_ThrowsArgumentException()
    {
        // Arrange
        var baseTime = DateTime.UtcNow;
        var weather1 = CreateWeather(50.0, 0.0, WeatherCondition.PartlyCloudy, baseTime.AddHours(2));
        var weather2 = CreateWeather(60.0, 0.0, WeatherCondition.Cloudy, baseTime);

        // Act & Assert
        Assert.Throws<ArgumentException>(() =>
            WeatherInterpolation.InterpolateTemporally(baseTime.AddHours(1), weather1, weather2));
    }

    #endregion

    #region Helper Methods

    private ProcessedWeather CreateWeather(
        double cloudCover,
        double precipitation,
        WeatherCondition condition,
        DateTime? timestamp = null)
    {
        return new ProcessedWeather
        {
            Timestamp = timestamp ?? DateTime.UtcNow,
            NormalizedCloudCover = cloudCover,
            PrecipitationIntensity = precipitation,
            Condition = condition,
            IsSunBlocking = precipitation > 0.1 || cloudCover > 80.0,
            ConfidenceLevel = 0.85,
            ProcessedAt = DateTime.UtcNow
        };
    }

    #endregion
}
