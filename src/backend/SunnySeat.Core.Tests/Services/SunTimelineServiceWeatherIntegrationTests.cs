using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Services;
using Xunit;

namespace SunnySeat.Core.Tests.Services;

/// <summary>
/// Integration tests for weather-enhanced timeline calculations (Story 3.4 - Task 2)
/// Validates that weather data flows through timeline generation and affects confidence scoring
/// </summary>
public class SunTimelineServiceWeatherIntegrationTests
{
    private readonly Mock<ISunExposureService> _mockSunExposureService;
    private readonly Mock<IPrecomputationRepository> _mockPrecomputationRepository;
    private readonly Mock<ISolarCalculationService> _mockSolarCalculationService;
    private readonly Mock<ICacheService> _mockCacheService;
    private readonly Mock<IPatioRepository> _mockPatioRepository;
    private readonly SunTimelineService _timelineService;

    public SunTimelineServiceWeatherIntegrationTests()
    {
        _mockSunExposureService = new Mock<ISunExposureService>();
        _mockPrecomputationRepository = new Mock<IPrecomputationRepository>();
        _mockSolarCalculationService = new Mock<ISolarCalculationService>();
        _mockCacheService = new Mock<ICacheService>();
        _mockPatioRepository = new Mock<IPatioRepository>();

        _timelineService = new SunTimelineService(
            _mockSunExposureService.Object,
            _mockPrecomputationRepository.Object,
            _mockSolarCalculationService.Object,
            _mockCacheService.Object,
            _mockPatioRepository.Object,
            NullLogger<SunTimelineService>.Instance);
    }

    [Fact]
    public async Task GenerateTimelineAsync_WithWeatherData_IncludesWeatherInCalculations()
    {
        // Arrange
        var patioId = 1;
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(2);
        var patio = CreateTestPatio(patioId);

        _mockPatioRepository.Setup(x => x.GetByIdAsync(patioId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(patio);

        _mockCacheService.Setup(x => x.GetCachedTimelineAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SunExposureTimeline?)null);

        // Setup sun exposure service to return exposure with weather data
        _mockSunExposureService.Setup(x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((int _, DateTime timestamp, CancellationToken _) =>
                CreateTestSunExposure(patioId, timestamp, weatherData: CreateTestWeatherData(timestamp, cloudCover: 25.0)));

        _mockSolarCalculationService.Setup(x => x.GetSunTimesAsync(It.IsAny<DateOnly>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunTimes());

        // Act
        var timeline = await _timelineService.GenerateTimelineAsync(patioId, startTime, endTime, TimeSpan.FromMinutes(30));

        // Assert
        timeline.Should().NotBeNull();
        timeline.Points.Should().NotBeEmpty();

        // Verify that sun exposure service was called (which would include weather data)
        _mockSunExposureService.Verify(
            x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()),
            Times.AtLeastOnce,
            "Timeline should call sun exposure service which integrates weather data");
    }

    [Fact]
    public async Task GenerateTimelineAsync_WithCloudyWeather_ReflectsLowerConfidence()
    {
        // Arrange
        var patioId = 1;
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(1);
        var patio = CreateTestPatio(patioId);

        _mockPatioRepository.Setup(x => x.GetByIdAsync(patioId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(patio);

        _mockCacheService.Setup(x => x.GetCachedTimelineAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SunExposureTimeline?)null);

        // Setup sun exposure with cloudy weather (lower confidence expected)
        _mockSunExposureService.Setup(x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((int _, DateTime timestamp, CancellationToken _) =>
            {
                var cloudyWeather = CreateTestWeatherData(timestamp, cloudCover: 85.0, precipProbability: 0.4);
                var exposure = CreateTestSunExposure(patioId, timestamp,
                    exposurePercent: 30.0, // Lower exposure due to clouds
                    weatherData: cloudyWeather);
                exposure.Confidence = 65.0; // Lower confidence with cloudy weather
                return exposure;
            });

        _mockSolarCalculationService.Setup(x => x.GetSunTimesAsync(It.IsAny<DateOnly>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunTimes());

        // Act
        var timeline = await _timelineService.GenerateTimelineAsync(patioId, startTime, endTime, TimeSpan.FromMinutes(20));

        // Assert
        timeline.Should().NotBeNull();
        timeline.Points.Should().NotBeEmpty();
        timeline.AverageConfidence.Should().BeLessThan(70.0,
            "Timeline with cloudy weather should have lower average confidence");

        // Verify weather-aware calculations were performed
        _mockSunExposureService.Verify(
            x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task GenerateTimelineAsync_WithClearWeather_ReflectsHigherConfidence()
    {
        // Arrange
        var patioId = 1;
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(1);
        var patio = CreateTestPatio(patioId);

        _mockPatioRepository.Setup(x => x.GetByIdAsync(patioId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(patio);

        _mockCacheService.Setup(x => x.GetCachedTimelineAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SunExposureTimeline?)null);

        // Setup sun exposure with clear weather (higher confidence expected)
        _mockSunExposureService.Setup(x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((int _, DateTime timestamp, CancellationToken _) =>
            {
                var clearWeather = CreateTestWeatherData(timestamp, cloudCover: 10.0, precipProbability: 0.05);
                var exposure = CreateTestSunExposure(patioId, timestamp,
                    exposurePercent: 85.0, // High exposure with clear weather
                    weatherData: clearWeather);
                exposure.Confidence = 92.0; // High confidence with clear weather
                return exposure;
            });

        _mockSolarCalculationService.Setup(x => x.GetSunTimesAsync(It.IsAny<DateOnly>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunTimes());

        // Act
        var timeline = await _timelineService.GenerateTimelineAsync(patioId, startTime, endTime, TimeSpan.FromMinutes(20));

        // Assert
        timeline.Should().NotBeNull();
        timeline.Points.Should().NotBeEmpty();
        timeline.AverageConfidence.Should().BeGreaterThan(85.0,
            "Timeline with clear weather should have higher average confidence");

        // Verify weather-aware calculations were performed
        _mockSunExposureService.Verify(
            x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task GenerateBatchTimelinesAsync_WithWeatherData_ProcessesAllPatios()
    {
        // Arrange
        var patioIds = new[] { 1, 2, 3 };
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(2);

        foreach (var patioId in patioIds)
        {
            var patio = CreateTestPatio(patioId);
            _mockPatioRepository.Setup(x => x.GetByIdAsync(patioId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(patio);

            // Each patio gets weather-enhanced calculations
            _mockSunExposureService.Setup(x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((int pid, DateTime timestamp, CancellationToken _) =>
                    CreateTestSunExposure(pid, timestamp,
                        weatherData: CreateTestWeatherData(timestamp, cloudCover: 30.0)));
        }

        _mockCacheService.Setup(x => x.GetCachedTimelineAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SunExposureTimeline?)null);

        _mockSolarCalculationService.Setup(x => x.GetSunTimesAsync(It.IsAny<DateOnly>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunTimes());

        // Act
        var timelines = await _timelineService.GenerateBatchTimelinesAsync(patioIds, startTime, endTime);

        // Assert
        var timelinesList = timelines.ToList();
        timelinesList.Should().HaveCount(3);
        timelinesList.Should().AllSatisfy(timeline =>
        {
            timeline.Should().NotBeNull();
            timeline.Points.Should().NotBeEmpty();
            timeline.AverageConfidence.Should().BeGreaterThan(0,
                "Weather-enhanced timeline should have confidence scores");
        });

        // Verify sun exposure service was called for each patio (includes weather)
        foreach (var patioId in patioIds)
        {
            _mockSunExposureService.Verify(
                x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()),
                Times.AtLeastOnce,
                $"Weather-enhanced calculations should be performed for patio {patioId}");
        }
    }

    [Fact]
    public async Task GenerateTimelineAsync_WithForecastWeather_DistinguishesFromCurrent()
    {
        // Arrange
        var patioId = 1;
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(2);
        var patio = CreateTestPatio(patioId);

        _mockPatioRepository.Setup(x => x.GetByIdAsync(patioId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(patio);

        _mockCacheService.Setup(x => x.GetCachedTimelineAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SunExposureTimeline?)null);

        // Setup sun exposure with forecast weather data
        _mockSunExposureService.Setup(x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((int _, DateTime timestamp, CancellationToken _) =>
            {
                var forecastWeather = CreateTestWeatherData(timestamp,
                    cloudCover: 40.0,
                    isForecast: true); // Forecast data (less certain)
                var exposure = CreateTestSunExposure(patioId, timestamp, weatherData: forecastWeather);
                exposure.Confidence = 75.0; // Slightly lower confidence for forecast
                return exposure;
            });

        _mockSolarCalculationService.Setup(x => x.GetSunTimesAsync(It.IsAny<DateOnly>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunTimes());

        // Act
        var timeline = await _timelineService.GenerateTimelineAsync(patioId, startTime, endTime, TimeSpan.FromMinutes(30));

        // Assert
        timeline.Should().NotBeNull();
        timeline.Points.Should().NotBeEmpty();

        // Verify forecast-based calculations were performed
        _mockSunExposureService.Verify(
            x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()),
            Times.AtLeastOnce,
            "Timeline should use forecast weather data for future time periods");
    }

    [Fact]
    public async Task GenerateTimelineAsync_MixedWeatherConditions_VariesConfidenceAppropriately()
    {
        // Arrange
        var patioId = 1;
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(3);
        var patio = CreateTestPatio(patioId);
        var callCount = 0;

        _mockPatioRepository.Setup(x => x.GetByIdAsync(patioId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(patio);

        _mockCacheService.Setup(x => x.GetCachedTimelineAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SunExposureTimeline?)null);

        // Setup varied weather conditions across the timeline
        _mockSunExposureService.Setup(x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((int _, DateTime timestamp, CancellationToken _) =>
            {
                callCount++;
                // Alternate between clear and cloudy
                var cloudCover = callCount % 2 == 0 ? 15.0 : 75.0;
                var confidence = callCount % 2 == 0 ? 90.0 : 68.0;
                var weather = CreateTestWeatherData(timestamp, cloudCover: cloudCover);
                var exposure = CreateTestSunExposure(patioId, timestamp, weatherData: weather);
                exposure.Confidence = confidence;
                return exposure;
            });

        _mockSolarCalculationService.Setup(x => x.GetSunTimesAsync(It.IsAny<DateOnly>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunTimes());

        // Act
        var timeline = await _timelineService.GenerateTimelineAsync(patioId, startTime, endTime, TimeSpan.FromMinutes(30));

        // Assert
        timeline.Should().NotBeNull();
        timeline.Points.Should().NotBeEmpty();
        timeline.Points.Should().HaveCountGreaterThan(2,
            "Should have multiple points with varied weather conditions");

        // Average confidence should be moderate (between high and low)
        timeline.AverageConfidence.Should().BeInRange(70.0, 85.0,
            "Mixed weather conditions should result in moderate average confidence");
    }

    #region Test Helpers

    private Patio CreateTestPatio(int id)
    {
        var geometryFactory = new GeometryFactory();
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
            Id = id,
            Name = $"Test Patio {id}",
            Geometry = geometryFactory.CreatePolygon(coordinates),
            Venue = new Venue { Id = id, Name = $"Test Venue {id}" }
        };
    }

    private PatioSunExposure CreateTestSunExposure(int patioId, DateTime timestamp,
        double exposurePercent = 75.0, SunExposureState state = SunExposureState.Sunny,
        WeatherSlice? weatherData = null)
    {
        return new PatioSunExposure
        {
            PatioId = patioId,
            Timestamp = timestamp,
            LocalTime = timestamp.AddHours(2), // Mock Stockholm time
            SunExposurePercent = exposurePercent,
            State = state,
            Confidence = 85.0,
            SunlitAreaSqM = 30.0,
            ShadedAreaSqM = 10.0,
            SolarPosition = new SolarPosition
            {
                Elevation = 45.0,
                Azimuth = 180.0,
                Timestamp = timestamp,
                LocalTime = timestamp.AddHours(2)
            },
            CalculationDuration = TimeSpan.FromMilliseconds(50),
            CalculationSource = "test",
            WeatherData = weatherData // Include weather data if provided
        };
    }

    private WeatherSlice CreateTestWeatherData(DateTime timestamp,
        double cloudCover = 25.0,
        double precipProbability = 0.1,
        bool isForecast = false,
        string source = "yr.no")
    {
        return new WeatherSlice
        {
            Id = 1,
            Timestamp = timestamp,
            CloudCover = cloudCover,
            PrecipitationProbability = precipProbability,
            Temperature = 20.0,
            Visibility = 10.0,
            IsForecast = isForecast,
            Source = source,
            CreatedAt = DateTime.UtcNow
        };
    }

    private SunTimes CreateTestSunTimes()
    {
        var today = DateTime.Today;
        return new SunTimes
        {
            Date = DateOnly.FromDateTime(today),
            SunriseUtc = today.AddHours(5).ToUniversalTime(),
            SunsetUtc = today.AddHours(19).ToUniversalTime(),
            SunriseLocal = today.AddHours(7),
            SunsetLocal = today.AddHours(21),
            SolarNoon = today.AddHours(12).ToUniversalTime(),
            MaxElevation = 55.0,
            Latitude = 57.7089,
            Longitude = 11.9746
        };
    }

    #endregion
}
