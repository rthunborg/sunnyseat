using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Services;
using Xunit;

namespace SunnySeat.Core.Tests.Services;

/// <summary>
/// Unit tests for WeatherProcessingService cloud cover extraction and normalization
/// </summary>
public class WeatherProcessingServiceTests
{
    private readonly Mock<ILogger<WeatherProcessingService>> _loggerMock;
    private readonly Mock<IWeatherRepository> _weatherRepositoryMock;
    private readonly WeatherProcessingService _service;
    private readonly GeometryFactory _geometryFactory;

    public WeatherProcessingServiceTests()
    {
        _loggerMock = new Mock<ILogger<WeatherProcessingService>>();
        _weatherRepositoryMock = new Mock<IWeatherRepository>();
        _service = new WeatherProcessingService(_loggerMock.Object, _weatherRepositoryMock.Object);
        _geometryFactory = new GeometryFactory();
    }

    #region Cloud Cover Extraction and Normalization Tests

    [Fact]
    public async Task ProcessWeatherDataAsync_MetNoSource_NormalizesCloudCover()
    {
        // Arrange
        var weatherSlice = new WeatherSlice
        {
            Id = 1,
            Timestamp = DateTime.UtcNow.AddHours(1),
            CloudCover = 75.0,
            PrecipitationProbability = 0.1,
            Temperature = 15.0,
            Visibility = 10.0,
            IsForecast = true,
            Source = "met.no",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await _service.ProcessWeatherDataAsync(weatherSlice);

        // Assert
        result.Should().NotBeNull();
        result.NormalizedCloudCover.Should().Be(75.0);
        result.Condition.Should().Be(WeatherCondition.Cloudy);
        result.IsSunBlocking.Should().BeFalse();
    }

    [Fact]
    public async Task ProcessWeatherDataAsync_OpenWeatherMapSource_NormalizesCloudCover()
    {
        // Arrange
        var weatherSlice = new WeatherSlice
        {
            Id = 2,
            Timestamp = DateTime.UtcNow.AddHours(2),
            CloudCover = 45.0,
            PrecipitationProbability = 0.05,
            Temperature = 18.0,
            Visibility = 15.0,
            IsForecast = true,
            Source = "openweathermap",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await _service.ProcessWeatherDataAsync(weatherSlice);

        // Assert
        result.Should().NotBeNull();
        result.NormalizedCloudCover.Should().Be(45.0);
        result.Condition.Should().Be(WeatherCondition.PartlyCloudy);
    }

    [Theory]
    [InlineData(0.0, 0.0)]
    [InlineData(50.0, 50.0)]
    [InlineData(100.0, 100.0)]
    [InlineData(-10.0, 0.0)]   // Below range should clamp to 0
    [InlineData(110.0, 100.0)] // Above range should clamp to 100
    public async Task ProcessWeatherDataAsync_CloudCoverBoundaries_ClampsToValidRange(
        double inputCloudCover, double expectedNormalized)
    {
        // Arrange
        var weatherSlice = new WeatherSlice
        {
            Id = 3,
            Timestamp = DateTime.UtcNow,
            CloudCover = inputCloudCover,
            PrecipitationProbability = 0.0,
            Temperature = 15.0,
            Visibility = 10.0,
            IsForecast = false,
            Source = "met.no",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await _service.ProcessWeatherDataAsync(weatherSlice);

        // Assert
        result.NormalizedCloudCover.Should().Be(expectedNormalized);
    }

    [Fact]
    public async Task ProcessWeatherDataAsync_ClearConditions_CategorizesCorrectly()
    {
        // Arrange - Cloud cover < 20%
        var weatherSlice = new WeatherSlice
        {
            Id = 4,
            Timestamp = DateTime.UtcNow,
            CloudCover = 15.0,
            PrecipitationProbability = 0.0,
            Temperature = 20.0,
            Visibility = 20.0,
            IsForecast = false,
            Source = "met.no",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await _service.ProcessWeatherDataAsync(weatherSlice);

        // Assert
        result.Condition.Should().Be(WeatherCondition.Clear);
        result.IsSunBlocking.Should().BeFalse();
    }

    [Fact]
    public async Task ProcessWeatherDataAsync_PartlyCloudyConditions_CategorizesCorrectly()
    {
        // Arrange - Cloud cover between 20-70%
        var weatherSlice = new WeatherSlice
        {
            Id = 5,
            Timestamp = DateTime.UtcNow,
            CloudCover = 50.0,
            PrecipitationProbability = 0.1,
            Temperature = 18.0,
            Visibility = 15.0,
            IsForecast = true,
            Source = "met.no",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await _service.ProcessWeatherDataAsync(weatherSlice);

        // Assert
        result.Condition.Should().Be(WeatherCondition.PartlyCloudy);
        result.IsSunBlocking.Should().BeFalse();
    }

    [Fact]
    public async Task ProcessWeatherDataAsync_CloudyConditions_CategorizesCorrectly()
    {
        // Arrange - Cloud cover > 70% but < 80%
        var weatherSlice = new WeatherSlice
        {
            Id = 6,
            Timestamp = DateTime.UtcNow,
            CloudCover = 75.0,
            PrecipitationProbability = 0.15,
            Temperature = 16.0,
            Visibility = 12.0,
            IsForecast = true,
            Source = "openweathermap",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await _service.ProcessWeatherDataAsync(weatherSlice);

        // Assert
        result.Condition.Should().Be(WeatherCondition.Cloudy);
        result.IsSunBlocking.Should().BeFalse(); // Not blocking until > 80%
    }

    [Fact]
    public async Task ProcessWeatherDataAsync_OvercastConditions_CategorizesCorrectly()
    {
        // Arrange - Cloud cover >= 80%
        var weatherSlice = new WeatherSlice
        {
            Id = 7,
            Timestamp = DateTime.UtcNow,
            CloudCover = 85.0,
            PrecipitationProbability = 0.2,
            Temperature = 14.0,
            Visibility = 10.0,
            IsForecast = true,
            Source = "met.no",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await _service.ProcessWeatherDataAsync(weatherSlice);

        // Assert
        result.Condition.Should().Be(WeatherCondition.Overcast);
        result.IsSunBlocking.Should().BeTrue(); // Overcast blocks sun
    }

    #endregion

    #region Precipitation and Atmospheric Processing Tests

    [Theory]
    [InlineData(0.0, 0.0)]     // No precipitation
    [InlineData(0.1, 0.0)]     // Very low probability
    [InlineData(0.25, 0.1)]    // Light rain threshold
    [InlineData(0.5, 0.5)]     // Moderate rain
    [InlineData(0.8, 2.0)]     // Heavy rain
    public async Task ProcessWeatherDataAsync_PrecipitationProbability_CalculatesIntensity(
        double probability, double expectedMinIntensity)
    {
        // Arrange
        var weatherSlice = new WeatherSlice
        {
            Id = 8,
            Timestamp = DateTime.UtcNow,
            CloudCover = 60.0,
            PrecipitationProbability = probability,
            Temperature = 12.0,
            Visibility = 8.0,
            IsForecast = true,
            Source = "met.no",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await _service.ProcessWeatherDataAsync(weatherSlice);

        // Assert
        result.PrecipitationIntensity.Should().BeGreaterThanOrEqualTo(expectedMinIntensity);
    }

    [Fact]
    public async Task ProcessWeatherDataAsync_PrecipitationConditions_BlocksSun()
    {
        // Arrange - Precipitation > 40% probability to ensure categorization as Precipitation
        var weatherSlice = new WeatherSlice
        {
            Id = 9,
            Timestamp = DateTime.UtcNow,
            CloudCover = 70.0,
            PrecipitationProbability = 0.45, // 45% probability - triggers Precipitation category
            Temperature = 13.0,
            Visibility = 9.0,
            IsForecast = true,
            Source = "met.no",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await _service.ProcessWeatherDataAsync(weatherSlice);

        // Assert
        result.Condition.Should().Be(WeatherCondition.Precipitation);
        result.IsSunBlocking.Should().BeTrue();
        result.PrecipitationIntensity.Should().BeGreaterThan(0.1); // Above threshold
    }

    [Fact]
    public async Task ProcessWeatherDataAsync_LowVisibility_BlocksSunAndCategorizesCorrectly()
    {
        // Arrange - Visibility < 5km
        var weatherSlice = new WeatherSlice
        {
            Id = 10,
            Timestamp = DateTime.UtcNow,
            CloudCover = 50.0,
            PrecipitationProbability = 0.1,
            Temperature = 10.0,
            Visibility = 3.0, // Low visibility
            IsForecast = false,
            Source = "met.no",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await _service.ProcessWeatherDataAsync(weatherSlice);

        // Assert
        result.Condition.Should().Be(WeatherCondition.LowVisibility);
        result.IsSunBlocking.Should().BeTrue();
    }

    [Fact]
    public async Task ProcessWeatherDataAsync_NullVisibility_DoesNotBlockSun()
    {
        // Arrange - No visibility data
        var weatherSlice = new WeatherSlice
        {
            Id = 11,
            Timestamp = DateTime.UtcNow,
            CloudCover = 30.0,
            PrecipitationProbability = 0.05,
            Temperature = 18.0,
            Visibility = null, // No visibility data
            IsForecast = true,
            Source = "openweathermap",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await _service.ProcessWeatherDataAsync(weatherSlice);

        // Assert
        result.IsSunBlocking.Should().BeFalse();
        result.Condition.Should().Be(WeatherCondition.PartlyCloudy);
    }

    #endregion

    #region Confidence Calculation Tests

    [Fact]
    public async Task ProcessWeatherDataAsync_MetNoNowcast_HighConfidence()
    {
        // Arrange - Met.no nowcast data should have highest confidence
        var weatherSlice = new WeatherSlice
        {
            Id = 12,
            Timestamp = DateTime.UtcNow.AddMinutes(30),
            CloudCover = 40.0,
            PrecipitationProbability = 0.1,
            Temperature = 16.0,
            Visibility = 12.0,
            IsForecast = false, // Nowcast
            Source = "met.no",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await _service.ProcessWeatherDataAsync(weatherSlice);

        // Assert
        result.ConfidenceLevel.Should().BeGreaterThan(0.9); // Nowcast + Met.no bonus
    }

    [Fact]
    public async Task ProcessWeatherDataAsync_ShortTermForecast_GoodConfidence()
    {
        // Arrange - Short-term forecast
        var weatherSlice = new WeatherSlice
        {
            Id = 13,
            Timestamp = DateTime.UtcNow.AddHours(12),
            CloudCover = 55.0,
            PrecipitationProbability = 0.15,
            Temperature = 17.0,
            Visibility = 15.0,
            IsForecast = true,
            Source = "met.no",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await _service.ProcessWeatherDataAsync(weatherSlice);

        // Assert
        result.ConfidenceLevel.Should().BeGreaterThanOrEqualTo(0.7);
        result.ConfidenceLevel.Should().BeLessThan(0.95);
    }

    [Fact]
    public async Task ProcessWeatherDataAsync_LongTermForecast_LowerConfidence()
    {
        // Arrange - Long-term forecast (>48 hours)
        var weatherSlice = new WeatherSlice
        {
            Id = 14,
            Timestamp = DateTime.UtcNow.AddHours(60),
            CloudCover = 65.0,
            PrecipitationProbability = 0.2,
            Temperature = 15.0,
            Visibility = 10.0,
            IsForecast = true,
            Source = "openweathermap",
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = await _service.ProcessWeatherDataAsync(weatherSlice);

        // Assert
        result.ConfidenceLevel.Should().BeGreaterThanOrEqualTo(0.5);
        result.ConfidenceLevel.Should().BeLessThan(0.7);
    }

    #endregion

    #region Batch Processing Tests

    [Fact]
    public async Task ProcessWeatherDataBatchAsync_MultipleSlices_ProcessesAll()
    {
        // Arrange
        var weatherSlices = new List<WeatherSlice>
        {
            new WeatherSlice
            {
                Id = 15,
                Timestamp = DateTime.UtcNow.AddHours(1),
                CloudCover = 20.0,
                PrecipitationProbability = 0.0,
                Temperature = 18.0,
                Visibility = 20.0,
                IsForecast = true,
                Source = "met.no"
            },
            new WeatherSlice
            {
                Id = 16,
                Timestamp = DateTime.UtcNow.AddHours(2),
                CloudCover = 50.0,
                PrecipitationProbability = 0.1,
                Temperature = 17.0,
                Visibility = 15.0,
                IsForecast = true,
                Source = "met.no"
            },
            new WeatherSlice
            {
                Id = 17,
                Timestamp = DateTime.UtcNow.AddHours(3),
                CloudCover = 85.0,
                PrecipitationProbability = 0.4, // Will be categorized as Precipitation, not Overcast
                Temperature = 15.0,
                Visibility = 8.0,
                IsForecast = true,
                Source = "met.no"
            }
        };

        // Act
        var results = await _service.ProcessWeatherDataBatchAsync(weatherSlices);

        // Assert
        results.Should().HaveCount(3);
        results[0].Condition.Should().Be(WeatherCondition.PartlyCloudy);
        results[1].Condition.Should().Be(WeatherCondition.PartlyCloudy);
        results[2].Condition.Should().Be(WeatherCondition.Precipitation); // Precipitation takes priority
        results[2].IsSunBlocking.Should().BeTrue();
    }

    [Fact]
    public async Task ProcessWeatherDataBatchAsync_WithLocation_AttachesLocationToAll()
    {
        // Arrange
        var location = _geometryFactory.CreatePoint(new Coordinate(11.97, 57.71)); // Gothenburg
        var weatherSlices = new List<WeatherSlice>
        {
            new WeatherSlice { Id = 18, Timestamp = DateTime.UtcNow, CloudCover = 30.0,
                PrecipitationProbability = 0.0, Temperature = 16.0, IsForecast = true, Source = "met.no" },
            new WeatherSlice { Id = 19, Timestamp = DateTime.UtcNow.AddHours(1), CloudCover = 40.0,
                PrecipitationProbability = 0.05, Temperature = 15.0, IsForecast = true, Source = "met.no" }
        };

        // Act
        var results = await _service.ProcessWeatherDataBatchAsync(weatherSlices, location);

        // Assert
        results.Should().HaveCount(2);
        results.Should().AllSatisfy(r => r.Location.Should().Be(location));
    }

    #endregion

    #region Integration Tests

    [Fact]
    public async Task GetProcessedWeatherForPatioAsync_NoWeatherData_ReturnsEmpty()
    {
        // Arrange
        var location = _geometryFactory.CreatePoint(new Coordinate(11.97, 57.71));
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(24);

        _weatherRepositoryMock
            .Setup(r => r.GetForecastDataAsync(startTime, endTime, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<WeatherSlice>());

        // Act
        var results = await _service.GetProcessedWeatherForPatioAsync(location, startTime, endTime);

        // Assert
        results.Should().BeEmpty();
    }

    [Fact]
    public async Task GetProcessedWeatherForPatioAsync_WithWeatherData_ProcessesAndReturns()
    {
        // Arrange
        var location = _geometryFactory.CreatePoint(new Coordinate(11.97, 57.71));
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(6);

        var weatherData = new List<WeatherSlice>
        {
            new WeatherSlice { Id = 20, Timestamp = startTime.AddHours(1), CloudCover = 25.0,
                PrecipitationProbability = 0.0, Temperature = 18.0, Visibility = 20.0, IsForecast = true, Source = "met.no" },
            new WeatherSlice { Id = 21, Timestamp = startTime.AddHours(3), CloudCover = 60.0,
                PrecipitationProbability = 0.15, Temperature = 17.0, Visibility = 12.0, IsForecast = true, Source = "met.no" },
            new WeatherSlice { Id = 22, Timestamp = startTime.AddHours(5), CloudCover = 90.0,
                PrecipitationProbability = 0.5, Temperature = 15.0, Visibility = 6.0, IsForecast = true, Source = "met.no" }
        };

        _weatherRepositoryMock
            .Setup(r => r.GetForecastDataAsync(startTime, endTime, It.IsAny<CancellationToken>()))
            .ReturnsAsync(weatherData);

        // Act
        var results = await _service.GetProcessedWeatherForPatioAsync(location, startTime, endTime);

        // Assert
        results.Should().HaveCount(3);
        results[0].Condition.Should().Be(WeatherCondition.PartlyCloudy);
        results[1].Condition.Should().Be(WeatherCondition.PartlyCloudy);
        results[2].IsSunBlocking.Should().BeTrue();
    }

    #endregion

    #region Edge Cases and Error Handling

    [Fact]
    public async Task ProcessWeatherDataAsync_NullWeatherSlice_ThrowsArgumentNullException()
    {
        // Act & Assert
        await Assert.ThrowsAsync<ArgumentNullException>(
            async () => await _service.ProcessWeatherDataAsync(null!));
    }

    [Fact]
    public async Task ProcessWeatherDataBatchAsync_NullWeatherSlices_ThrowsArgumentNullException()
    {
        // Act & Assert
        await Assert.ThrowsAsync<ArgumentNullException>(
            async () => await _service.ProcessWeatherDataBatchAsync(null!));
    }

    [Fact]
    public async Task GetProcessedWeatherForPatioAsync_NullLocation_ThrowsArgumentNullException()
    {
        // Act & Assert
        await Assert.ThrowsAsync<ArgumentNullException>(
            async () => await _service.GetProcessedWeatherForPatioAsync(
                null!, DateTime.UtcNow, DateTime.UtcNow.AddHours(1)));
    }

    #endregion

    #region Performance Tests

    [Fact]
    public async Task ProcessWeatherDataBatchAsync_LargeDataset_CompletesWithin30Seconds()
    {
        // Arrange - Create a realistic dataset (48 hours of 5-minute data = 576 slices)
        var weatherSlices = new List<WeatherSlice>();
        var baseTime = DateTime.UtcNow;

        for (int i = 0; i < 576; i++)
        {
            weatherSlices.Add(new WeatherSlice
            {
                Id = i + 100,
                Timestamp = baseTime.AddMinutes(i * 5),
                CloudCover = 30.0 + (i % 70), // Varying cloud cover
                PrecipitationProbability = (i % 10) / 10.0,
                Temperature = 15.0 + (i % 10),
                Visibility = 10.0 + (i % 5),
                IsForecast = true,
                Source = "met.no"
            });
        }

        // Act
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var results = await _service.ProcessWeatherDataBatchAsync(weatherSlices);
        stopwatch.Stop();

        // Assert
        results.Should().HaveCount(576);
        stopwatch.Elapsed.Should().BeLessThan(TimeSpan.FromSeconds(30));

        // Log performance metrics (would be logged in real test run)
        var processingRate = results.Count / stopwatch.Elapsed.TotalSeconds;
        processingRate.Should().BeGreaterThan(19); // At least 19 slices/second for 30s limit
    }

    [Fact]
    public async Task ProcessWeatherDataAsync_SingleSlice_CompletesQuickly()
    {
        // Arrange
        var weatherSlice = new WeatherSlice
        {
            Id = 999,
            Timestamp = DateTime.UtcNow,
            CloudCover = 45.0,
            PrecipitationProbability = 0.15,
            Temperature = 17.0,
            Visibility = 12.0,
            IsForecast = true,
            Source = "met.no"
        };

        // Act
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var result = await _service.ProcessWeatherDataAsync(weatherSlice);
        stopwatch.Stop();

        // Assert
        result.Should().NotBeNull();
        stopwatch.Elapsed.Should().BeLessThan(TimeSpan.FromMilliseconds(100)); // Should be very fast
    }

    #endregion
}
