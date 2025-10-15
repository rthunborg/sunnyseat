using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using NetTopologySuite.Geometries;
using SunnySeat.Api.Endpoints;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Models.Responses;
using Xunit;

namespace SunnySeat.Api.Tests.Endpoints;

/// <summary>
/// Unit tests for SunExposureController API endpoints
/// Validates AC3: API controller tests validate request/response handling
/// Validates AC4: All tests pass consistently without flakiness
/// </summary>
public class SunExposureControllerTests
{
    private readonly SunExposureController _controller;
    private readonly Mock<ISunExposureService> _mockSunExposureService;
    private readonly Mock<ILogger<SunExposureController>> _mockLogger;

    public SunExposureControllerTests()
    {
        _mockSunExposureService = new Mock<ISunExposureService>();
        _mockLogger = new Mock<ILogger<SunExposureController>>();
        _controller = new SunExposureController(
            _mockSunExposureService.Object,
            _mockLogger.Object);
    }

    #region GetPatioSunExposure Tests

    [Fact]
    public async Task GetPatioSunExposure_ValidRequest_ReturnsOkWithData()
    {
        // Arrange
        var patioId = 1;
        var timestamp = DateTime.UtcNow;
        var expectedSunExposure = CreateTestPatioSunExposure(patioId, timestamp);

        _mockSunExposureService
            .Setup(s => s.CalculatePatioSunExposureAsync(patioId, timestamp, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedSunExposure);

        // Act
        var result = await _controller.GetPatioSunExposure(patioId, timestamp);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        okResult!.Value.Should().BeOfType<PatioSunExposureResponse>();

        var response = okResult.Value as PatioSunExposureResponse;
        response!.PatioId.Should().Be(patioId);
        response.Timestamp.Should().Be(timestamp);
    }

    [Fact]
    public async Task GetPatioSunExposure_NoTimestamp_UsesCurrentTime()
    {
        // Arrange
        var patioId = 1;
        var expectedSunExposure = CreateTestPatioSunExposure(patioId, DateTime.UtcNow);

        _mockSunExposureService
            .Setup(s => s.CalculatePatioSunExposureAsync(
                patioId,
                It.IsAny<DateTime>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedSunExposure);

        // Act
        var result = await _controller.GetPatioSunExposure(patioId);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        _mockSunExposureService.Verify(
            s => s.CalculatePatioSunExposureAsync(
                patioId,
                It.Is<DateTime>(dt => dt.Kind == DateTimeKind.Utc),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task GetPatioSunExposure_PatioNotFound_ReturnsNotFound()
    {
        // Arrange
        var patioId = 999;
        var timestamp = DateTime.UtcNow;

        _mockSunExposureService
            .Setup(s => s.CalculatePatioSunExposureAsync(patioId, timestamp, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ArgumentException($"Patio {patioId} not found"));

        // Act
        var result = await _controller.GetPatioSunExposure(patioId, timestamp);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region GetCurrentSunExposure Tests

    [Fact]
    public async Task GetCurrentSunExposure_ValidPatioId_ReturnsOkWithCurrentData()
    {
        // Arrange
        var patioId = 1;
        var currentTime = DateTime.UtcNow;
        var expectedSunExposure = CreateTestPatioSunExposure(patioId, currentTime);

        _mockSunExposureService
            .Setup(s => s.GetCurrentSunExposureAsync(patioId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedSunExposure);

        // Act
        var result = await _controller.GetCurrentSunExposure(patioId);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as PatioSunExposureResponse;
        response!.PatioId.Should().Be(patioId);
    }

    #endregion

    #region GetSunExposureReliability Tests

    [Fact]
    public async Task GetSunExposureReliability_NoTimestamp_ReturnsReliabilityInfo()
    {
        // Act
        var result = await _controller.GetSunExposureReliability();

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        okResult!.Value.Should().BeOfType<SunExposureReliabilityInfo>();

        var reliabilityInfo = okResult.Value as SunExposureReliabilityInfo;
        reliabilityInfo!.ReliabilityScore.Should().BeInRange(0, 100);
        reliabilityInfo.IsReliable.Should().BeTrue();
        reliabilityInfo.ReliabilityCategory.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetSunExposureReliability_WithTimestamp_UsesProvidedTime()
    {
        // Arrange
        var timestamp = new DateTime(2024, 6, 21, 12, 0, 0, DateTimeKind.Utc);

        // Act
        var result = await _controller.GetSunExposureReliability(timestamp);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        var reliabilityInfo = okResult!.Value as SunExposureReliabilityInfo;
        reliabilityInfo!.Timestamp.Should().Be(timestamp);
    }

    [Fact]
    public async Task GetSunExposureReliability_MultipleCalls_ReturnsDeterministicResults()
    {
        // Test multiple calls to ensure consistency (AC4: no flakiness)
        var results = new List<SunExposureReliabilityInfo>();

        for (int i = 0; i < 5; i++)
        {
            // Act
            var result = await _controller.GetSunExposureReliability();

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            var okResult = result.Result as OkObjectResult;
            var reliabilityInfo = okResult!.Value as SunExposureReliabilityInfo;

            reliabilityInfo.Should().NotBeNull();
            results.Add(reliabilityInfo!);
        }

        // All results should have same reliability score (deterministic)
        results.Select(r => r.ReliabilityScore).Distinct().Should().HaveCount(1);
    }

    #endregion

    #region Helper Methods

    private PatioSunExposure CreateTestPatioSunExposure(int patioId, DateTime timestamp)
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

        var venue = new Venue
        {
            Id = 1,
            Name = "Test Venue",
            Address = "Test Address",
            Location = geometryFactory.CreatePoint(new Coordinate(11.9746, 57.7089))
        };

        var patio = new Patio
        {
            Id = patioId,
            VenueId = 1,
            Venue = venue,
            Name = "Test Patio",
            Geometry = geometryFactory.CreatePolygon(coordinates)
        };

        var weatherData = new WeatherSlice
        {
            Timestamp = timestamp,
            CloudCover = 30.0,
            Visibility = 10000,
            Temperature = 20.0,
            Source = "TestProvider"
        };

        return new PatioSunExposure
        {
            PatioId = patioId,
            Patio = patio,
            Timestamp = timestamp,
            LocalTime = timestamp.AddHours(2),
            SunExposurePercent = 75.5,
            State = SunExposureState.Sunny,
            Confidence = 85.0,
            SunlitAreaSqM = 75.5,
            ShadedAreaSqM = 24.5,
            SolarPosition = new SolarPosition
            {
                Azimuth = 180.0,
                Elevation = 55.0,
                Declination = 23.44,
                Timestamp = timestamp,
                LocalTime = timestamp.AddHours(2)
            },
            ConfidenceBreakdown = new ConfidenceFactors
            {
                BuildingDataQuality = 0.85,
                GeometryPrecision = 0.90,
                SolarAccuracy = 0.95,
                ShadowAccuracy = 0.80,
                OverallConfidence = 0.85
            },
            WeatherData = weatherData,
            CalculationDuration = TimeSpan.FromMilliseconds(50),
            CalculationSource = "test"
        };
    }

    #endregion
}
