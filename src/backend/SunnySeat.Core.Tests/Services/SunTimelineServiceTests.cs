using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Services;
using Xunit;

namespace SunnySeat.Core.Tests.Services;

/// <summary>
/// Unit tests for SunTimelineService
/// </summary>
public class SunTimelineServiceTests
{
    private readonly Mock<ISunExposureService> _mockSunExposureService;
    private readonly Mock<IPrecomputationRepository> _mockPrecomputationRepository;
    private readonly Mock<ISolarCalculationService> _mockSolarCalculationService;
    private readonly Mock<ICacheService> _mockCacheService;
    private readonly Mock<IPatioRepository> _mockPatioRepository;
    private readonly SunTimelineService _timelineService;

    public SunTimelineServiceTests()
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
    public async Task GenerateTimelineAsync_ValidPatio_ReturnsTimeline()
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

        _mockSunExposureService.Setup(x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunExposure(patioId, startTime));

        _mockSolarCalculationService.Setup(x => x.GetSunTimesAsync(It.IsAny<DateOnly>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunTimes());

        // Act
        var timeline = await _timelineService.GenerateTimelineAsync(patioId, startTime, endTime, TimeSpan.FromMinutes(30));

        // Assert
        timeline.Should().NotBeNull();
        timeline.PatioId.Should().Be(patioId);
        timeline.StartTime.Should().Be(startTime);
        timeline.EndTime.Should().Be(endTime);
        timeline.Points.Should().NotBeEmpty();
        timeline.Interval.Should().Be(TimeSpan.FromMinutes(30));
    }

    [Fact]
    public async Task GenerateTimelineAsync_InvalidPatioId_ThrowsArgumentException()
    {
        // Arrange
        var patioId = 0;
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(2);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(
            () => _timelineService.GenerateTimelineAsync(patioId, startTime, endTime));
    }

    [Fact]
    public async Task GenerateTimelineAsync_EndTimeBeforeStartTime_ThrowsArgumentException()
    {
        // Arrange
        var patioId = 1;
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(-1); // End before start

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(
            () => _timelineService.GenerateTimelineAsync(patioId, startTime, endTime));
    }

    [Fact]
    public async Task GenerateTimelineAsync_TimeRangeTooLarge_ThrowsArgumentException()
    {
        // Arrange
        var patioId = 1;
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(50); // Exceeds 48-hour limit

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(
            () => _timelineService.GenerateTimelineAsync(patioId, startTime, endTime));
    }

    [Fact]
    public async Task GetTodayTimelineAsync_ValidPatio_ReturnsToday()
    {
        // Arrange
        var patioId = 1;
        var patio = CreateTestPatio(patioId);

        _mockPatioRepository.Setup(x => x.GetByIdAsync(patioId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(patio);

        _mockCacheService.Setup(x => x.GetCachedTimelineAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SunExposureTimeline?)null);

        _mockSunExposureService.Setup(x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunExposure(patioId, DateTime.UtcNow));

        _mockSolarCalculationService.Setup(x => x.GetSunTimesAsync(It.IsAny<DateOnly>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunTimes());

        // Act
        var timeline = await _timelineService.GetTodayTimelineAsync(patioId);

        // Assert
        timeline.Should().NotBeNull();
        timeline.PatioId.Should().Be(patioId);

        // The service uses DateTime.Today.ToUniversalTime() which accounts for local timezone
        var expectedStart = DateTime.Today.ToUniversalTime();
        var expectedEnd = DateTime.Today.AddDays(1).ToUniversalTime();
        timeline.StartTime.Should().Be(expectedStart);
        timeline.EndTime.Should().Be(expectedEnd);

        // Verify it's a 24-hour period
        (timeline.EndTime - timeline.StartTime).Should().Be(TimeSpan.FromDays(1));
    }

    [Fact]
    public async Task GetTomorrowTimelineAsync_ValidPatio_ReturnsTomorrow()
    {
        // Arrange
        var patioId = 1;
        var patio = CreateTestPatio(patioId);

        _mockPatioRepository.Setup(x => x.GetByIdAsync(patioId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(patio);

        _mockCacheService.Setup(x => x.GetCachedTimelineAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SunExposureTimeline?)null);

        _mockSunExposureService.Setup(x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunExposure(patioId, DateTime.UtcNow.AddDays(1)));

        _mockSolarCalculationService.Setup(x => x.GetSunTimesAsync(It.IsAny<DateOnly>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunTimes());

        // Act
        var timeline = await _timelineService.GetTomorrowTimelineAsync(patioId);

        // Assert
        timeline.Should().NotBeNull();
        timeline.PatioId.Should().Be(patioId);

        // The service uses DateTime.Today.AddDays(1).ToUniversalTime() 
        var expectedStart = DateTime.Today.AddDays(1).ToUniversalTime();
        var expectedEnd = DateTime.Today.AddDays(2).ToUniversalTime();
        timeline.StartTime.Should().Be(expectedStart);
        timeline.EndTime.Should().Be(expectedEnd);

        // Verify it's a 24-hour period
        (timeline.EndTime - timeline.StartTime).Should().Be(TimeSpan.FromDays(1));
    }

    [Fact]
    public async Task GetNext12HoursTimelineAsync_ValidPatio_Returns12HourRange()
    {
        // Arrange
        var patioId = 1;
        var patio = CreateTestPatio(patioId);
        var currentTime = DateTime.UtcNow;

        _mockPatioRepository.Setup(x => x.GetByIdAsync(patioId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(patio);

        _mockCacheService.Setup(x => x.GetCachedTimelineAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SunExposureTimeline?)null);

        _mockSunExposureService.Setup(x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunExposure(patioId, currentTime));

        _mockSolarCalculationService.Setup(x => x.GetSunTimesAsync(It.IsAny<DateOnly>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunTimes());

        // Act
        var timeline = await _timelineService.GetNext12HoursTimelineAsync(patioId);

        // Assert
        timeline.Should().NotBeNull();
        timeline.PatioId.Should().Be(patioId);
        timeline.Duration.Should().BeCloseTo(TimeSpan.FromHours(12), TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task GenerateBatchTimelinesAsync_MultiplePatios_ReturnsAllTimelines()
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

            _mockSunExposureService.Setup(x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(CreateTestSunExposure(patioId, startTime));
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
            timeline.StartTime.Should().Be(startTime);
            timeline.EndTime.Should().Be(endTime);
        });
    }

    [Fact]
    public async Task GetBestSunWindowsAsync_TimelineWithSunWindows_ReturnsRankedWindows()
    {
        // Arrange
        var patioId = 1;
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(6);
        var patio = CreateTestPatio(patioId);

        _mockPatioRepository.Setup(x => x.GetByIdAsync(patioId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(patio);

        _mockCacheService.Setup(x => x.GetCachedTimelineAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SunExposureTimeline?)null);

        // Setup sun exposure with varying levels to create windows
        _mockSunExposureService.SetupSequence(x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunExposure(patioId, startTime, 80.0, SunExposureState.Sunny)) // Good sun
            .ReturnsAsync(CreateTestSunExposure(patioId, startTime.AddMinutes(10), 85.0, SunExposureState.Sunny)) // Better sun
            .ReturnsAsync(CreateTestSunExposure(patioId, startTime.AddMinutes(20), 90.0, SunExposureState.Sunny)) // Best sun
            .ReturnsAsync(CreateTestSunExposure(patioId, startTime.AddMinutes(30), 10.0, SunExposureState.Shaded)) // Window ends
            .ReturnsAsync(CreateTestSunExposure(patioId, startTime.AddMinutes(40), 70.0, SunExposureState.Sunny)) // New window
            .ReturnsAsync(CreateTestSunExposure(patioId, startTime.AddMinutes(50), 75.0, SunExposureState.Sunny));

        _mockSolarCalculationService.Setup(x => x.GetSunTimesAsync(It.IsAny<DateOnly>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunTimes());

        // Act
        var sunWindows = await _timelineService.GetBestSunWindowsAsync(patioId, startTime, endTime, maxWindows: 2);

        // Assert
        var windowsList = sunWindows.ToList();
        windowsList.Should().NotBeEmpty();
        windowsList.Should().HaveCountLessOrEqualTo(2);

        // Should be ordered by priority score (best first)
        if (windowsList.Count > 1)
        {
            windowsList[0].PriorityScore.Should().BeGreaterOrEqualTo(windowsList[1].PriorityScore);
        }
    }

    [Fact]
    public void GenerateTimelineSummary_ValidTimeline_ReturnsAccurateSummary()
    {
        // Arrange
        var timeline = CreateTestTimelineWithVariedExposure();

        // Act
        var summary = _timelineService.GenerateTimelineSummary(timeline);

        // Assert
        summary.Should().NotBeNull();
        summary.MaxSunExposure.Should().BeGreaterThan(0);
        summary.MinSunExposure.Should().BeGreaterOrEqualTo(0);
        summary.AverageSunExposure.Should().BeGreaterOrEqualTo(summary.MinSunExposure);
        summary.AverageSunExposure.Should().BeLessOrEqualTo(summary.MaxSunExposure);
    }

    [Fact]
    public async Task ValidateTimelineQualityAsync_HighQualityTimeline_ReturnsGoodScore()
    {
        // Arrange
        var timeline = CreateHighQualityTimeline();

        // Act
        var quality = await _timelineService.ValidateTimelineQualityAsync(timeline);

        // Assert
        quality.Should().NotBeNull();
        quality.QualityScore.Should().BeGreaterThan(70.0); // Should meet quality standards
        quality.MeetsQualityStandards.Should().BeTrue();
        quality.CompletenessPercent.Should().BeGreaterThan(90.0);
    }

    [Fact]
    public async Task CompareVenueTimelinesAsync_MultiplePatios_ReturnsComparison()
    {
        // Arrange
        var patioIds = new[] { 1, 2 };
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(4);

        foreach (var patioId in patioIds)
        {
            var patio = CreateTestPatio(patioId);
            patio.Venue = new Venue { Id = patioId, Name = $"Test Venue {patioId}" };

            _mockPatioRepository.Setup(x => x.GetByIdAsync(patioId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(patio);

            _mockSunExposureService.Setup(x => x.CalculatePatioSunExposureAsync(patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(CreateTestSunExposure(patioId, startTime));
        }

        _mockCacheService.Setup(x => x.GetCachedTimelineAsync(It.IsAny<int>(), It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((SunExposureTimeline?)null);

        _mockSolarCalculationService.Setup(x => x.GetSunTimesAsync(It.IsAny<DateOnly>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CreateTestSunTimes());

        // Act
        var comparison = await _timelineService.CompareVenueTimelinesAsync(patioIds, startTime, endTime);

        // Assert
        comparison.Should().NotBeNull();
        comparison.Timelines.Should().HaveCount(2);
        comparison.Summary.Should().NotBeNull();
        comparison.Summary.VenuesCompared.Should().Be(2);
        comparison.BestTimes.Should().NotBeNull();
    }

    [Fact]
    public async Task GetPerformanceMetricsAsync_ReturnsValidMetrics()
    {
        // Act
        var metrics = await _timelineService.GetPerformanceMetricsAsync();

        // Assert
        metrics.Should().NotBeNull();
        metrics.CacheHitRate.Should().BeGreaterOrEqualTo(0.0);
        metrics.CacheHitRate.Should().BeLessOrEqualTo(1.0);
        metrics.PrecomputedDataUsage.Should().BeGreaterOrEqualTo(0.0);
        metrics.PrecomputedDataUsage.Should().BeLessOrEqualTo(1.0);
        metrics.PerformanceStatus.Should().NotBeNullOrEmpty();
    }

    // Test helper methods

    private Patio CreateTestPatio(int id)
    {
        var geometryFactory = new NetTopologySuite.Geometries.GeometryFactory();
        var coordinates = new[]
        {
            new NetTopologySuite.Geometries.Coordinate(11.97, 57.71),
            new NetTopologySuite.Geometries.Coordinate(11.971, 57.71),
            new NetTopologySuite.Geometries.Coordinate(11.971, 57.711),
            new NetTopologySuite.Geometries.Coordinate(11.97, 57.711),
            new NetTopologySuite.Geometries.Coordinate(11.97, 57.71)
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

    private SunExposureTimeline CreateTestTimelineWithVariedExposure()
    {
        var startTime = DateTime.UtcNow;
        var points = new[]
        {
            new SunExposureTimelinePoint
            {
                Timestamp = startTime,
                LocalTime = startTime.AddHours(2),
                SunExposurePercent = 20.0,
                State = SunExposureState.Partial,
                Confidence = 80.0,
                Source = DataSource.Calculated
            },
            new SunExposureTimelinePoint
            {
                Timestamp = startTime.AddMinutes(10),
                LocalTime = startTime.AddHours(2).AddMinutes(10),
                SunExposurePercent = 80.0,
                State = SunExposureState.Sunny,
                Confidence = 85.0,
                Source = DataSource.Calculated
            },
            new SunExposureTimelinePoint
            {
                Timestamp = startTime.AddMinutes(20),
                LocalTime = startTime.AddHours(2).AddMinutes(20),
                SunExposurePercent = 60.0,
                State = SunExposureState.Sunny,
                Confidence = 82.0,
                Source = DataSource.Calculated
            }
        };

        return new SunExposureTimeline
        {
            PatioId = 1,
            StartTime = startTime,
            EndTime = startTime.AddMinutes(30),
            Interval = TimeSpan.FromMinutes(10),
            Points = points,
            AverageConfidence = points.Average(p => p.Confidence)
        };
    }

    private SunExposureTimeline CreateHighQualityTimeline()
    {
        var startTime = DateTime.UtcNow;
        var points = Enumerable.Range(0, 12) // 2 hours at 10-minute intervals
            .Select(i => new SunExposureTimelinePoint
            {
                Timestamp = startTime.AddMinutes(i * 10),
                LocalTime = startTime.AddHours(2).AddMinutes(i * 10),
                SunExposurePercent = 75.0 + (i * 2), // Varying exposure
                State = SunExposureState.Sunny,
                Confidence = 90.0,
                Source = DataSource.Precomputed // High quality source
            })
            .ToList();

        return new SunExposureTimeline
        {
            PatioId = 1,
            StartTime = startTime,
            EndTime = startTime.AddHours(2),
            Interval = TimeSpan.FromMinutes(10),
            Points = points,
            PrecomputedPointsCount = points.Count, // All from precomputed data
            InterpolatedPointsCount = 0,
            AverageConfidence = points.Average(p => p.Confidence)
        };
    }
}