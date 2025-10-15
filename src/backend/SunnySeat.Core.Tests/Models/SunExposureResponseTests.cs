using FluentAssertions;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Models.Responses;
using Xunit;
using NetTopologySuite.Geometries;

namespace SunnySeat.Core.Tests.Models;

/// <summary>
/// Unit tests for enhanced SunExposureResponse models with weather context
/// </summary>
public class SunExposureResponseTests
{
    #region WeatherContextInfo Tests

    [Fact]
    public void WeatherContextInfo_FromWeatherSlice_WithValidData_MapsCorrectly()
    {
        // Arrange
        var weatherSlice = new WeatherSlice
        {
            Id = 1,
            Timestamp = DateTime.UtcNow,
            CloudCover = 45.5,
            PrecipitationProbability = 0.15,
            Temperature = 22.5,
            Visibility = 10.0,
            IsForecast = false,
            Source = "yr.no",
            CreatedAt = DateTime.UtcNow.AddMinutes(-5)
        };

        // Act
        var result = WeatherContextInfo.FromWeatherSlice(weatherSlice);

        // Assert
        result.Should().NotBeNull();
        result!.CloudCover.Should().Be(45.5);
        result.Source.Should().Be("yr.no");
        result.Conditions.Should().Be("Partly Cloudy");
        result.IsSunBlocking.Should().BeFalse();
        result.PrecipitationProbability.Should().Be(0.15);
        result.DataAge.Should().Contain("minutes");
    }

    [Fact]
    public void WeatherContextInfo_FromWeatherSlice_WithNull_ReturnsNull()
    {
        // Act
        var result = WeatherContextInfo.FromWeatherSlice(null);

        // Assert
        result.Should().BeNull();
    }

    [Theory]
    [InlineData(10, 0.05, "Clear")]
    [InlineData(50, 0.10, "Partly Cloudy")]
    [InlineData(75, 0.15, "Cloudy")]
    [InlineData(85, 0.10, "Overcast")]
    [InlineData(50, 0.25, "Possible Rain")]
    [InlineData(50, 0.60, "Rain Expected")]
    public void WeatherContextInfo_GetWeatherConditionDescription_ReturnsCorrectCondition(
        double cloudCover, double precipProb, string expectedCondition)
    {
        // Arrange
        var weatherSlice = new WeatherSlice
        {
            CloudCover = cloudCover,
            PrecipitationProbability = precipProb,
            Source = "test",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = WeatherContextInfo.FromWeatherSlice(weatherSlice);

        // Assert
        result!.Conditions.Should().Be(expectedCondition);
    }

    [Theory]
    [InlineData(85, 0.10, true)]  // High cloud cover
    [InlineData(75, 0.25, true)]  // High precipitation probability
    [InlineData(50, 0.10, false)] // Neither high
    [InlineData(70, 0.15, false)] // Below thresholds
    public void WeatherContextInfo_IsSunBlocking_CalculatesCorrectly(
        double cloudCover, double precipProb, bool expectedSunBlocking)
    {
        // Arrange
        var weatherSlice = new WeatherSlice
        {
            CloudCover = cloudCover,
            PrecipitationProbability = precipProb,
            Source = "test",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = WeatherContextInfo.FromWeatherSlice(weatherSlice);

        // Assert
        result!.IsSunBlocking.Should().Be(expectedSunBlocking);
    }

    [Fact]
    public void WeatherContextInfo_DataAge_FormatsCorrectlyForMinutes()
    {
        // Arrange
        var weatherSlice = new WeatherSlice
        {
            CloudCover = 50,
            PrecipitationProbability = 0.1,
            Source = "test",
            CreatedAt = DateTime.UtcNow.AddMinutes(-15)
        };

        // Act
        var result = WeatherContextInfo.FromWeatherSlice(weatherSlice);

        // Assert
        result!.DataAge.Should().Contain("15 minutes");
    }

    [Fact]
    public void WeatherContextInfo_DataAge_FormatsCorrectlyForHours()
    {
        // Arrange
        var weatherSlice = new WeatherSlice
        {
            CloudCover = 50,
            PrecipitationProbability = 0.1,
            Source = "test",
            CreatedAt = DateTime.UtcNow.AddHours(-2.5)
        };

        // Act
        var result = WeatherContextInfo.FromWeatherSlice(weatherSlice);

        // Assert
        result!.DataAge.Should().Contain("2 hours");
    }

    [Fact]
    public void WeatherContextInfo_PrecipitationProbability_OmitsZeroValues()
    {
        // Arrange
        var weatherSlice = new WeatherSlice
        {
            CloudCover = 30,
            PrecipitationProbability = 0.0,
            Source = "test",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = WeatherContextInfo.FromWeatherSlice(weatherSlice);

        // Assert
        result!.PrecipitationProbability.Should().BeNull();
    }

    #endregion

    #region ConfidenceBreakdownInfo Tests

    [Fact]
    public void ConfidenceBreakdownInfo_FromConfidenceFactors_MapsAllFields()
    {
        // Arrange
        var factors = new ConfidenceFactors
        {
            BuildingDataQuality = 0.85,
            GeometryPrecision = 0.90,
            SolarAccuracy = 0.95,
            ShadowAccuracy = 0.88,
            GeometryQuality = 0.87,
            CloudCertainty = 0.75,
            OverallConfidence = 0.82,
            ConfidenceCategory = "High",
            QualityIssues = new[] { "Minor geometry gaps" },
            Improvements = new[] { "Add building height data" }
        };

        // Act
        var result = ConfidenceBreakdownInfo.FromConfidenceFactors(factors);

        // Assert
        result.BuildingDataQuality.Should().Be(85.0);
        result.GeometryPrecision.Should().Be(90.0);
        result.SolarAccuracy.Should().Be(95.0);
        result.ShadowAccuracy.Should().Be(88.0);
        result.OverallConfidence.Should().Be(82.0);
        result.ConfidenceCategory.Should().Be("High");
        result.Explanation.Should().NotBeNullOrEmpty();
        result.QualityIssues.Should().Contain("Minor geometry gaps");
        result.ImprovementSuggestions.Should().Contain("Add building height data");
    }

    [Fact]
    public void ConfidenceBreakdownInfo_GenerateExplanation_HighConfidenceWithWeather()
    {
        // Arrange
        var factors = new ConfidenceFactors
        {
            GeometryQuality = 0.85,
            CloudCertainty = 0.70,
            OverallConfidence = 0.78,
            ConfidenceCategory = "High"
        };

        // Act
        var result = ConfidenceBreakdownInfo.FromConfidenceFactors(factors);

        // Assert
        result.Explanation.Should().Contain("78% confidence");
        result.Explanation.Should().Contain("high geometric accuracy");
        result.Explanation.Should().Contain("weather data");
    }

    [Fact]
    public void ConfidenceBreakdownInfo_GenerateExplanation_MediumConfidenceGeometryLimited()
    {
        // Arrange
        var factors = new ConfidenceFactors
        {
            GeometryQuality = 0.50,
            CloudCertainty = 0.80,
            OverallConfidence = 0.60,
            ConfidenceCategory = "Medium"
        };

        // Act
        var result = ConfidenceBreakdownInfo.FromConfidenceFactors(factors);

        // Assert
        result.Explanation.Should().Contain("60% confidence");
        result.Explanation.Should().Contain("building geometry");
    }

    [Fact]
    public void ConfidenceBreakdownInfo_GenerateExplanation_MediumConfidenceWeatherLimited()
    {
        // Arrange
        var factors = new ConfidenceFactors
        {
            GeometryQuality = 0.85,
            CloudCertainty = 0.45,
            OverallConfidence = 0.62,
            ConfidenceCategory = "Medium"
        };

        // Act
        var result = ConfidenceBreakdownInfo.FromConfidenceFactors(factors);

        // Assert
        result.Explanation.Should().Contain("62% confidence");
        result.Explanation.Should().Contain("weather forecast");
    }

    [Fact]
    public void ConfidenceBreakdownInfo_GenerateExplanation_LowConfidence()
    {
        // Arrange
        var factors = new ConfidenceFactors
        {
            GeometryQuality = 0.35,
            CloudCertainty = 0.30,
            OverallConfidence = 0.32,
            ConfidenceCategory = "Low"
        };

        // Act
        var result = ConfidenceBreakdownInfo.FromConfidenceFactors(factors);

        // Assert
        result.Explanation.Should().Contain("32% confidence");
        result.Explanation.Should().Contain("data quality limitations");
    }

    [Fact]
    public void ConfidenceBreakdownInfo_GenerateExplanation_NoWeatherData()
    {
        // Arrange
        var factors = new ConfidenceFactors
        {
            GeometryQuality = 0.75,
            CloudCertainty = 0.0,
            OverallConfidence = 0.75,
            ConfidenceCategory = "High"
        };

        // Act
        var result = ConfidenceBreakdownInfo.FromConfidenceFactors(factors);

        // Assert
        result.Explanation.Should().Contain("75% confidence");
        result.Explanation.Should().Contain("geometric calculations alone");
        result.Explanation.Should().Contain("no weather data available");
    }

    #endregion

    #region PatioSunExposureResponse Tests

    [Fact]
    public void PatioSunExposureResponse_FromPatioSunExposure_WithWeather_IncludesWeatherContext()
    {
        // Arrange
        var patio = CreateTestPatio();
        var sunExposure = CreateTestSunExposure(patio);
        var weatherSlice = CreateTestWeatherSlice();

        // Act
        var response = PatioSunExposureResponse.FromPatioSunExposure(sunExposure, weatherSlice);

        // Assert
        response.Should().NotBeNull();
        response.PatioId.Should().Be(patio.Id);
        response.PatioName.Should().Be(patio.Name);
        response.SunExposurePercent.Should().Be(75.5);
        response.Confidence.Should().Be(82.0);
        response.WeatherContext.Should().NotBeNull();
        response.WeatherContext!.CloudCover.Should().Be(30.0);
        response.WeatherContext.Source.Should().Be("yr.no");
    }

    [Fact]
    public void PatioSunExposureResponse_FromPatioSunExposure_WithoutWeather_HasNullWeatherContext()
    {
        // Arrange
        var patio = CreateTestPatio();
        var sunExposure = CreateTestSunExposure(patio);

        // Act
        var response = PatioSunExposureResponse.FromPatioSunExposure(sunExposure, null);

        // Assert
        response.Should().NotBeNull();
        response.WeatherContext.Should().BeNull();
    }

    [Fact]
    public void PatioSunExposureResponse_FromPatioSunExposure_RoundsNumericValues()
    {
        // Arrange
        var patio = CreateTestPatio();
        var sunExposure = CreateTestSunExposure(patio);
        sunExposure.SunExposurePercent = 75.5678;
        sunExposure.Confidence = 82.3456;

        // Act
        var response = PatioSunExposureResponse.FromPatioSunExposure(sunExposure);

        // Assert
        response.SunExposurePercent.Should().Be(75.6);
        response.Confidence.Should().Be(82.3);
    }

    #endregion

    #region SolarPositionInfo Tests

    [Fact]
    public void SolarPositionInfo_FromSolarPosition_VisibleSun_SetsCorrectDescription()
    {
        // Arrange
        var solarPosition = new SolarPosition
        {
            Elevation = 45.5,
            Azimuth = 180.0
        };

        // Act
        var result = SolarPositionInfo.FromSolarPosition(solarPosition);

        // Assert
        result.Elevation.Should().Be(45.5);
        result.Azimuth.Should().Be(180.0);
        result.IsSunVisible.Should().BeTrue();
        result.SunDescription.Should().Contain("Sun at");
        result.SunDescription.Should().Contain("elevation");
        result.SunDescription.Should().Contain("S");
    }

    [Fact]
    public void SolarPositionInfo_FromSolarPosition_SunBelowHorizon_SetsCorrectDescription()
    {
        // Arrange
        var solarPosition = new SolarPosition
        {
            Elevation = -15.0,
            Azimuth = 90.0
        };

        // Act
        var result = SolarPositionInfo.FromSolarPosition(solarPosition);

        // Assert
        result.IsSunVisible.Should().BeFalse();
        result.SunDescription.Should().Be("Sun below horizon");
    }

    [Theory]
    [InlineData(0, "N")]
    [InlineData(45, "NE")]
    [InlineData(90, "E")]
    [InlineData(135, "SE")]
    [InlineData(180, "S")]
    [InlineData(225, "SW")]
    [InlineData(270, "W")]
    [InlineData(315, "NW")]
    public void SolarPositionInfo_GetCompassDirection_ReturnsCorrectDirection(
        double azimuth, string expectedDirection)
    {
        // Arrange
        var solarPosition = new SolarPosition
        {
            Elevation = 30.0,
            Azimuth = azimuth
        };

        // Act
        var result = SolarPositionInfo.FromSolarPosition(solarPosition);

        // Assert
        result.SunDescription.Should().Contain(expectedDirection);
    }

    #endregion

    #region Helper Methods

    private Patio CreateTestPatio()
    {
        var geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
        var coordinates = new[]
        {
            new Coordinate(18.0686, 59.3293),
            new Coordinate(18.0687, 59.3293),
            new Coordinate(18.0687, 59.3294),
            new Coordinate(18.0686, 59.3294),
            new Coordinate(18.0686, 59.3293)
        };
        var polygon = geometryFactory.CreatePolygon(coordinates);

        return new Patio
        {
            Id = 1,
            Name = "Test Patio",
            VenueId = 1,
            Venue = new Venue
            {
                Id = 1,
                Name = "Test Venue",
                Address = "Test Address 123",
                Location = geometryFactory.CreatePoint(new Coordinate(18.0686, 59.3293))
            },
            Geometry = polygon
        };
    }

    private PatioSunExposure CreateTestSunExposure(Patio patio)
    {
        return new PatioSunExposure
        {
            PatioId = patio.Id,
            Patio = patio,
            Timestamp = DateTime.UtcNow,
            LocalTime = DateTime.Now,
            SunExposurePercent = 75.5,
            State = SunExposureState.Sunny,
            Confidence = 82.0,
            SunlitAreaSqM = 50.0,
            ShadedAreaSqM = 20.0,
            SolarPosition = new SolarPosition
            {
                Elevation = 45.0,
                Azimuth = 180.0
            },
            ConfidenceBreakdown = new ConfidenceFactors
            {
                BuildingDataQuality = 0.85,
                GeometryPrecision = 0.90,
                SolarAccuracy = 0.95,
                ShadowAccuracy = 0.88,
                GeometryQuality = 0.87,
                CloudCertainty = 0.75,
                OverallConfidence = 0.82,
                ConfidenceCategory = "High"
            },
            CalculationDuration = TimeSpan.FromMilliseconds(50),
            CalculationSource = "Realtime",
            Shadows = new List<ShadowProjection>()
        };
    }

    private WeatherSlice CreateTestWeatherSlice()
    {
        return new WeatherSlice
        {
            Id = 1,
            Timestamp = DateTime.UtcNow,
            CloudCover = 30.0,
            PrecipitationProbability = 0.05,
            Temperature = 22.0,
            Visibility = 10.0,
            IsForecast = false,
            Source = "yr.no",
            CreatedAt = DateTime.UtcNow.AddMinutes(-5)
        };
    }

    #endregion
}
