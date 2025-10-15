using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;
using Microsoft.Extensions.Logging;
using Moq;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Services;

namespace SunnySeat.Performance.Benchmarks;

/// <summary>
/// Performance benchmarks for sun exposure calculation APIs
/// Validates AC3 from Story 3.4: 95th percentile response time <200ms
/// </summary>
[MemoryDiagnoser]
[SimpleJob(warmupCount: 3, iterationCount: 100)]
public class SunExposurePerformanceBenchmarks
{
    private ISunExposureService _sunExposureService = null!;
    private ISunTimelineService _sunTimelineService = null!;
    private Patio _testPatio = null!;
    private DateTime _testTimestamp;

    [GlobalSetup]
    public void Setup()
    {
        // Create test patio with realistic geometry
        var geometryFactory = new GeometryFactory();
        var coordinates = new[]
        {
            new Coordinate(11.9745, 57.7089),
            new Coordinate(11.9755, 57.7089),
            new Coordinate(11.9755, 57.7099),
            new Coordinate(11.9745, 57.7099),
            new Coordinate(11.9745, 57.7089)
        };

        _testPatio = new Patio
        {
            Id = 1,
            Name = "Benchmark Test Patio",
            Geometry = geometryFactory.CreatePolygon(coordinates),
            Venue = new Venue
            {
                Id = 1,
                Name = "Benchmark Test Venue",
                Location = geometryFactory.CreatePoint(new Coordinate(11.9750, 57.7094))
            }
        };

        _testTimestamp = DateTime.UtcNow;

        // Mock dependencies
        var mockPatioRepository = new Mock<IPatioRepository>();
        mockPatioRepository
            .Setup(r => r.GetByIdAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(_testPatio);

        var mockWeatherRepository = new Mock<IWeatherRepository>();
        mockWeatherRepository
            .Setup(w => w.GetLatestWeatherAsync(It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WeatherSlice
            {
                Timestamp = _testTimestamp,
                CloudCover = 20.0,
                Temperature = 20.0,
                PrecipitationProbability = 0.0,
                IsForecast = false,
                Source = "benchmark"
            });

        var mockPrecomputationRepository = new Mock<IPrecomputationRepository>();
        mockPrecomputationRepository
            .Setup(r => r.GetPrecomputedSunExposureAsync(
                It.IsAny<int>(),
                It.IsAny<DateTime>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((PrecomputedSunExposure?)null); // Force real-time calculation

        var mockBuildingRepository = new Mock<IBuildingRepository>();
        var mockSolarCalculationService = new Mock<ISolarCalculationService>();
        var mockShadowCalculationService = new Mock<IShadowCalculationService>();
        var mockConfidenceCalculator = new Mock<ConfidenceCalculator>();
        var mockLogger1 = new Mock<ILogger<SunExposureService>>();
        var mockLogger2 = new Mock<ILogger<SunTimelineService>>();
        var mockCacheService = new Mock<ICacheService>();

        // Mock solar calculations
        mockSolarCalculationService
            .Setup(s => s.GetSunTimesAsync(It.IsAny<DateOnly>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SunTimes
            {
                Date = DateOnly.FromDateTime(DateTime.Today),
                SunriseUtc = DateTime.Today.AddHours(5),
                SunsetUtc = DateTime.Today.AddHours(19),
                SunriseLocal = DateTime.Today.AddHours(7),
                SunsetLocal = DateTime.Today.AddHours(21),
                SolarNoon = DateTime.Today.AddHours(12),
                MaxElevation = 55.0,
                Latitude = 57.7089,
                Longitude = 11.9746
            });

        mockSolarCalculationService
            .Setup(s => s.CalculateSolarPositionAsync(It.IsAny<DateTime>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SolarPosition
            {
                Elevation = 45.0,
                Azimuth = 180.0,
                Timestamp = _testTimestamp,
                LocalTime = _testTimestamp.AddHours(2)
            });

        // Return null from cache to force calculation
        mockCacheService
            .Setup(c => c.GetCachedTimelineAsync(
                It.IsAny<int>(),
                It.IsAny<DateTime>(),
                It.IsAny<DateTime>(),
                It.IsAny<TimeSpan>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((SunExposureTimeline?)null);

        _sunExposureService = new SunExposureService(
            mockSolarCalculationService.Object,
            mockShadowCalculationService.Object,
            mockPatioRepository.Object,
            mockConfidenceCalculator.Object,
            mockLogger1.Object,
            mockWeatherRepository.Object
        );

        _sunTimelineService = new SunTimelineService(
            _sunExposureService,
            mockPrecomputationRepository.Object,
            mockSolarCalculationService.Object,
            mockCacheService.Object,
            mockPatioRepository.Object,
            mockLogger2.Object
        );
    }

    /// <summary>
    /// Benchmark: CalculatePatioSunExposure with weather data
    /// Target: 95th percentile <200ms
    /// </summary>
    [Benchmark]
    public async Task<PatioSunExposure> GetSunExposure_WithWeatherData()
    {
        return await _sunExposureService.CalculatePatioSunExposureAsync(
            _testPatio.Id,
            _testTimestamp,
            CancellationToken.None);
    }

    /// <summary>
    /// Benchmark: GetCurrentSunExposure (current time)
    /// Target: 95th percentile <200ms
    /// </summary>
    [Benchmark]
    public async Task<PatioSunExposure> GetSunExposure_CurrentTime()
    {
        return await _sunExposureService.GetCurrentSunExposureAsync(
            _testPatio.Id,
            CancellationToken.None);
    }

    /// <summary>
    /// Benchmark: CalculateSunExposureTimeline for today
    /// Target: 95th percentile <200ms
    /// </summary>
    [Benchmark]
    public async Task<SunExposureTimeline> GetSunTimeline_Today()
    {
        var startTime = DateTime.UtcNow.Date;
        var endTime = startTime.AddDays(1);

        return await _sunExposureService.CalculateSunExposureTimelineAsync(
            _testPatio.Id,
            startTime,
            endTime,
            TimeSpan.FromMinutes(10),
            CancellationToken.None);
    }

    /// <summary>
    /// Benchmark: CalculateSunExposureTimeline for next 12 hours
    /// Target: 95th percentile <200ms
    /// </summary>
    [Benchmark]
    public async Task<SunExposureTimeline> GetSunTimeline_Next12Hours()
    {
        var startTime = DateTime.UtcNow;
        var endTime = startTime.AddHours(12);

        return await _sunExposureService.CalculateSunExposureTimelineAsync(
            _testPatio.Id,
            startTime,
            endTime,
            TimeSpan.FromMinutes(10),
            CancellationToken.None);
    }
}

/// <summary>
/// Program entry point for running benchmarks
/// Usage: dotnet run -c Release
/// </summary>
public class Program
{
    public static void Main(string[] args)
    {
        var summary = BenchmarkRunner.Run<SunExposurePerformanceBenchmarks>();

        // Check if 95th percentile is <200ms
        Console.WriteLine("\n=== Performance Summary ===");
        Console.WriteLine("Target: 95th percentile response time <200ms");
        Console.WriteLine("Run benchmarks with: dotnet run -c Release");
        Console.WriteLine("Results will show Mean, StdDev, and percentiles for each operation.");
    }
}
