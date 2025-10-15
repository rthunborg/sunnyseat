using FluentAssertions;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Services;
using Xunit;

namespace SunnySeat.Core.Tests.Services;

/// <summary>
/// Unit tests for ConfidenceCalculator
/// </summary>
public class ConfidenceCalculatorTests
{
    private readonly ConfidenceCalculator _calculator;
    private readonly GeometryFactory _geometryFactory;

    public ConfidenceCalculatorTests()
    {
        _calculator = new ConfidenceCalculator();
        _geometryFactory = new GeometryFactory();
    }

    [Fact]
    public void CalculateConfidenceFactors_HighQualityData_ReturnsHighConfidence()
    {
        // Arrange
        var patio = CreateTestPatio(0.9); // High patio quality
        var shadowInfo = CreateTestShadowInfo(0.9, 1); // High shadow confidence, single building
        var solarPosition = CreateTestSolarPosition(45.0); // Good sun angle

        // Act
        var result = _calculator.CalculateConfidenceFactors(patio, shadowInfo, solarPosition);

        // Assert
        result.Should().NotBeNull();
        result.OverallConfidence.Should().BeGreaterThan(0.8);
        result.ConfidenceCategory.Should().Be("High");
        result.BuildingDataQuality.Should().Be(0.9);
        result.GeometryPrecision.Should().Be(0.9);
        result.SolarAccuracy.Should().BeGreaterThan(0.9);
    }

    [Fact]
    public void CalculateConfidenceFactors_NoShadows_ReturnsMaxBuildingQuality()
    {
        // Arrange
        var patio = CreateTestPatio(0.8);
        var shadowInfo = CreateTestShadowInfo(0.8, 0); // No shadows
        var solarPosition = CreateTestSolarPosition(60.0);

        // Act
        var result = _calculator.CalculateConfidenceFactors(patio, shadowInfo, solarPosition);

        // Assert
        result.BuildingDataQuality.Should().Be(1.0); // No shadows = max building quality
        result.OverallConfidence.Should().BeGreaterThan(0.8);
        result.ConfidenceCategory.Should().Be("High");
    }

    [Theory]
    [InlineData(60.0, 0.98)] // High sun - maximum accuracy
    [InlineData(25.0, 0.95)] // Medium sun - very good accuracy
    [InlineData(8.0, 0.85)]  // Low sun - good accuracy
    [InlineData(2.0, 0.70)]  // Very low sun - acceptable accuracy
    [InlineData(-5.0, 0.50)] // Below horizon - limited accuracy
    public void CalculateSolarAccuracy_DifferentElevations_ReturnsExpectedAccuracy(
        double elevation, double expectedAccuracy)
    {
        // Arrange
        var patio = CreateTestPatio(0.8);
        var shadowInfo = CreateTestShadowInfo(0.8, 1);
        var solarPosition = CreateTestSolarPosition(elevation);

        // Act
        var result = _calculator.CalculateConfidenceFactors(patio, shadowInfo, solarPosition);

        // Assert
        result.SolarAccuracy.Should().BeApproximately(expectedAccuracy, 0.01);
    }

    [Fact]
    public void CalculateDisplayConfidence_ConvertsToPercentage()
    {
        // Arrange
        var factors = new ConfidenceFactors { OverallConfidence = 0.8567 };

        // Act
        var displayConfidence = _calculator.CalculateDisplayConfidence(factors);

        // Assert
        displayConfidence.Should().Be(85.7);
    }

    [Theory]
    [InlineData(0.75, true)]  // Above threshold
    [InlineData(0.60, true)]  // At threshold
    [InlineData(0.45, false)] // Below threshold
    public void IsSufficientConfidence_DifferentLevels_ReturnsExpected(
        double confidenceLevel, bool expectedSufficient)
    {
        // Arrange
        var factors = new ConfidenceFactors { OverallConfidence = confidenceLevel };

        // Act
        var isSufficient = _calculator.IsSufficientConfidence(factors);

        // Assert
        isSufficient.Should().Be(expectedSufficient);
    }

    #region Weather-Aware Confidence Tests

    [Fact]
    public void CalculateConfidenceFactors_WithNowcastWeather_ReturnsHighConfidence()
    {
        // Arrange
        var patio = CreateTestPatio(0.9);
        var shadowInfo = CreateTestShadowInfo(0.9, 1);
        var solarPosition = CreateTestSolarPosition(45.0);
        var weatherData = CreateTestWeather(isForecast: false, "yr.no", minutesOld: 3);

        // Act
        var result = _calculator.CalculateConfidenceFactors(patio, shadowInfo, solarPosition, weatherData);

        // Assert
        result.Should().NotBeNull();
        result.CloudCertainty.Should().BeGreaterThan(0.9); // Nowcast + fresh + reliable source
        result.OverallConfidence.Should().BeGreaterThan(0.85);
        result.ConfidenceCategory.Should().Be("High");
    }

    [Fact]
    public void CalculateConfidenceFactors_WithForecastWeather_CapsAt90Percent()
    {
        // Arrange
        var patio = CreateTestPatio(0.95);
        var shadowInfo = CreateTestShadowInfo(0.95, 0);
        var solarPosition = CreateTestSolarPosition(60.0);
        var weatherData = CreateTestWeather(isForecast: true, "yr.no", minutesOld: 5);

        // Act
        var result = _calculator.CalculateConfidenceFactors(patio, shadowInfo, solarPosition, weatherData);

        // Assert
        result.OverallConfidence.Should().BeLessOrEqualTo(0.90); // Forecast cap
        result.QualityIssues.Should().Contain(i => i.Contains("forecast"));
    }

    [Fact]
    public void CalculateConfidenceFactors_WithoutWeather_CapsAt60Percent()
    {
        // Arrange
        var patio = CreateTestPatio(0.95);
        var shadowInfo = CreateTestShadowInfo(0.95, 0);
        var solarPosition = CreateTestSolarPosition(60.0);

        // Act
        var result = _calculator.CalculateConfidenceFactors(patio, shadowInfo, solarPosition, null);

        // Assert
        result.OverallConfidence.Should().BeLessOrEqualTo(0.60); // Missing weather cap
        result.QualityIssues.Should().Contain(i => i.Contains("No weather data"));
    }

    [Theory]
    [InlineData(3, 1.0)]      // 3 minutes old - 100%
    [InlineData(10, 0.95)]    // 10 minutes old - 95%
    [InlineData(20, 0.90)]    // 20 minutes old - 90%
    [InlineData(45, 0.85)]    // 45 minutes old - 85%
    [InlineData(90, 0.75)]    // 90 minutes old - 75%
    [InlineData(180, 0.60)]   // 3 hours old - 60%
    [InlineData(420, 0.40)]   // 7 hours old - 40%
    public void CalculateConfidenceFactors_WeatherDataAge_AffectsConfidence(
        int minutesOld, double expectedMinFreshness)
    {
        // Arrange
        var patio = CreateTestPatio(0.9);
        var shadowInfo = CreateTestShadowInfo(0.9, 1);
        var solarPosition = CreateTestSolarPosition(45.0);
        var weatherData = CreateTestWeather(isForecast: false, "yr.no", minutesOld);

        // Act
        var result = _calculator.CalculateConfidenceFactors(patio, shadowInfo, solarPosition, weatherData);

        // Assert - CloudCertainty should reflect weather freshness
        result.CloudCertainty.Should().BeGreaterOrEqualTo(expectedMinFreshness * 0.9); // Allow some tolerance
    }

    [Theory]
    [InlineData("yr.no", 0.95)]
    [InlineData("metno", 0.95)]
    [InlineData("openweathermap", 0.85)]
    [InlineData("openweather", 0.85)]
    [InlineData("unknown", 0.80)]
    public void CalculateConfidenceFactors_WeatherSource_AffectsReliability(
        string source, double expectedReliability)
    {
        // Arrange
        var patio = CreateTestPatio(0.9);
        var shadowInfo = CreateTestShadowInfo(0.9, 1);
        var solarPosition = CreateTestSolarPosition(45.0);
        var weatherData = CreateTestWeather(isForecast: false, source, minutesOld: 5);

        // Act
        var result = _calculator.CalculateConfidenceFactors(patio, shadowInfo, solarPosition, weatherData);

        // Assert - CloudCertainty should reflect source reliability
        result.CloudCertainty.Should().BeGreaterOrEqualTo(expectedReliability * 0.9); // Allow tolerance for nowcast factor
    }

    [Fact]
    public void CalculateConfidenceFactors_PoorBuildingData_CapsAt70Percent()
    {
        // Arrange
        var patio = CreateTestPatio(0.9);
        var shadowInfo = CreateTestShadowInfo(0.5, 3); // Low building data quality
        var solarPosition = CreateTestSolarPosition(45.0);
        var weatherData = CreateTestWeather(isForecast: false, "yr.no", minutesOld: 5);

        // Act
        var result = _calculator.CalculateConfidenceFactors(patio, shadowInfo, solarPosition, weatherData);

        // Assert
        result.OverallConfidence.Should().BeLessOrEqualTo(0.70); // Poor building data cap
        result.BuildingDataQuality.Should().Be(0.5);
    }

    [Fact]
    public void CalculateConfidenceFactors_NewFormula_Uses60_40Weighting()
    {
        // Arrange
        var patio = CreateTestPatio(0.8); // Geometry component
        var shadowInfo = CreateTestShadowInfo(0.8, 1);
        var solarPosition = CreateTestSolarPosition(45.0);
        var weatherData = CreateTestWeather(isForecast: false, "yr.no", minutesOld: 5);

        // Act
        var result = _calculator.CalculateConfidenceFactors(patio, shadowInfo, solarPosition, weatherData);

        // Assert - Should use 60/40 weighting (GeometryQuality × 0.6 + CloudCertainty × 0.4)
        result.GeometryQuality.Should().BeGreaterThan(0.0);
        result.CloudCertainty.Should().BeGreaterThan(0.0);

        // Verify formula approximately (allowing for caps)
        var expectedBase = (result.GeometryQuality * 0.6) + (result.CloudCertainty * 0.4);
        result.OverallConfidence.Should().BeLessOrEqualTo(expectedBase + 0.01);
    }

    [Theory]
    [InlineData(0.95, 0.95, "High")]   // High geometry + fresh nowcast = High
    [InlineData(0.85, 0.85, "High")]   // Good geometry + forecast = High
    [InlineData(0.70, 0.70, "Medium")] // Medium geometry + medium weather = Medium (65%)
    [InlineData(0.65, 0.65, "Medium")] // Medium-low geometry = Medium
    [InlineData(0.40, 0.40, "Medium")] // Lower data quality = Medium
    [InlineData(0.50, null, "Medium")] // No weather data = Medium (50% capped at 60%)
    public void CalculateConfidenceFactors_ConfidenceLevel_MapsCorrectly(
        double geometryQuality, double? weatherQuality, string expectedCategory)
    {
        // Arrange
        var patio = CreateTestPatio(geometryQuality);
        var shadowInfo = CreateTestShadowInfo(geometryQuality, 1);
        var solarPosition = CreateTestSolarPosition(45.0);

        // Create weather based on quality parameter
        WeatherSlice? weatherData = null;
        if (weatherQuality.HasValue)
        {
            if (weatherQuality.Value >= 0.9)
                weatherData = CreateTestWeather(isForecast: false, "yr.no", minutesOld: 3); // Fresh nowcast
            else if (weatherQuality.Value >= 0.8)
                weatherData = CreateTestWeather(isForecast: true, "yr.no", minutesOld: 10); // Forecast
            else
                weatherData = CreateTestWeather(isForecast: true, "openweather", minutesOld: 90); // Older forecast
        }

        // Act
        var result = _calculator.CalculateConfidenceFactors(patio, shadowInfo, solarPosition, weatherData);

        // Assert - Category should match expected
        result.ConfidenceCategory.Should().Be(expectedCategory,
            $"with geometry={geometryQuality}, weather={weatherQuality?.ToString() ?? "none"}, " +
            $"actual confidence={result.OverallConfidence:P0}");
    }
    [Fact]
    public void CalculateConfidenceFactors_StaleWeather_IdentifiesIssue()
    {
        // Arrange
        var patio = CreateTestPatio(0.9);
        var shadowInfo = CreateTestShadowInfo(0.9, 1);
        var solarPosition = CreateTestSolarPosition(45.0);
        var weatherData = CreateTestWeather(isForecast: false, "yr.no", minutesOld: 180); // 3 hours old

        // Act
        var result = _calculator.CalculateConfidenceFactors(patio, shadowInfo, solarPosition, weatherData);

        // Assert
        result.QualityIssues.Should().Contain(i => i.Contains("hours old"));
        result.Improvements.Should().Contain(i => i.Contains("Refresh weather data"));
    }

    [Fact]
    public void CalculateConfidenceFactors_BackwardCompatibility_WithoutWeatherParam()
    {
        // Arrange
        var patio = CreateTestPatio(0.9);
        var shadowInfo = CreateTestShadowInfo(0.9, 1);
        var solarPosition = CreateTestSolarPosition(45.0);

        // Act - Call original method without weather parameter
        var result = _calculator.CalculateConfidenceFactors(patio, shadowInfo, solarPosition);

        // Assert - Should still work with legacy calculation
        result.Should().NotBeNull();
        result.OverallConfidence.Should().BeGreaterThan(0.0);
        result.BuildingDataQuality.Should().Be(0.9);
    }

    #endregion

    /// <summary>
    /// Create a test patio with specified quality
    /// </summary>
    private Patio CreateTestPatio(double polygonQuality)
    {
        var coordinates = new[]
        {
            new Coordinate(11.97, 57.71),
            new Coordinate(11.971, 57.71),
            new Coordinate(11.971, 57.711),
            new Coordinate(11.97, 57.711),
            new Coordinate(11.97, 57.71)
        };

        return new Patio
        {
            Id = 1,
            VenueId = 1,
            Name = "Test Patio",
            Geometry = _geometryFactory.CreatePolygon(coordinates),
            PolygonQuality = polygonQuality,
            HeightSource = HeightSource.Heuristic,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Create test shadow info with specified confidence and building count
    /// </summary>
    private PatioShadowInfo CreateTestShadowInfo(double confidence, int buildingCount)
    {
        var shadows = new List<ShadowProjection>();
        for (int i = 0; i < buildingCount; i++)
        {
            shadows.Add(new ShadowProjection
            {
                BuildingId = i + 1,
                Confidence = confidence,
                BuildingHeight = 15.0,
                Length = 15.0,
                Direction = 0.0,
                Timestamp = DateTime.UtcNow
            });
        }

        return new PatioShadowInfo
        {
            PatioId = 1,
            ShadowedAreaPercent = 25.0,
            SunlitAreaPercent = 75.0,
            Confidence = confidence,
            CastingShadows = shadows,
            Timestamp = DateTime.UtcNow,
            SolarPosition = CreateTestSolarPosition(45.0)
        };
    }

    /// <summary>
    /// Create a test solar position with specified elevation
    /// </summary>
    private SolarPosition CreateTestSolarPosition(double elevation)
    {
        return new SolarPosition
        {
            Elevation = elevation,
            Azimuth = 180.0,
            Timestamp = DateTime.UtcNow,
            LocalTime = DateTime.Now,
            Latitude = 57.71,
            Longitude = 11.97
        };
    }

    /// <summary>
    /// Create test weather data with specified parameters
    /// </summary>
    private WeatherSlice CreateTestWeather(bool isForecast, string source, int minutesOld)
    {
        return new WeatherSlice
        {
            Id = 1,
            Timestamp = DateTime.UtcNow,
            CloudCover = 30.0,
            PrecipitationProbability = 0.1,
            Temperature = 18.0,
            Visibility = 10.0,
            IsForecast = isForecast,
            Source = source,
            CreatedAt = DateTime.UtcNow.AddMinutes(-minutesOld)
        };
    }
}