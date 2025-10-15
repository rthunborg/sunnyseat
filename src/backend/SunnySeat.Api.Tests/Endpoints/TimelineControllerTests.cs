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
/// Unit tests for TimelineController API endpoints
/// Validates AC3: API controller tests validate request/response handling for TimelineController
/// Validates AC4: All tests pass consistently without flakiness
/// </summary>
public class TimelineControllerTests
{
    private readonly TimelineController _controller;
    private readonly Mock<ISunTimelineService> _mockTimelineService;
    private readonly Mock<ILogger<TimelineController>> _mockLogger;

    public TimelineControllerTests()
    {
        _mockTimelineService = new Mock<ISunTimelineService>();
        _mockLogger = new Mock<ILogger<TimelineController>>();
        _controller = new TimelineController(
            _mockTimelineService.Object,
            _mockLogger.Object);
    }

    #region GetPatioTimeline Tests

    [Fact]
    public async Task GetPatioTimeline_ValidParameters_ReturnsOkWithTimeline()
    {
        // Arrange
        var patioId = 1;
        var start = DateTime.UtcNow;
        var end = start.AddHours(12);
        var resolution = 10;
        var expectedTimeline = CreateTestTimeline(patioId, start, end);

        _mockTimelineService
            .Setup(s => s.GenerateTimelineAsync(
                patioId,
                start,
                end,
                TimeSpan.FromMinutes(resolution),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedTimeline);

        // Act
        var result = await _controller.GetPatioTimeline(patioId, start, end, resolution);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        okResult!.Value.Should().BeOfType<SunExposureTimelineResponse>();

        var response = okResult.Value as SunExposureTimelineResponse;
        response!.PatioId.Should().Be(patioId);
        response.StartTime.Should().Be(start);
        response.EndTime.Should().Be(end);
    }

    [Fact]
    public async Task GetPatioTimeline_NoParameters_UsesDefaults()
    {
        // Arrange
        var patioId = 1;
        var expectedTimeline = CreateTestTimeline(patioId, DateTime.UtcNow, DateTime.UtcNow.AddHours(12));

        _mockTimelineService
            .Setup(s => s.GenerateTimelineAsync(
                patioId,
                It.IsAny<DateTime>(),
                It.IsAny<DateTime>(),
                TimeSpan.FromMinutes(10),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedTimeline);

        // Act
        var result = await _controller.GetPatioTimeline(patioId);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        _mockTimelineService.Verify(
            s => s.GenerateTimelineAsync(
                patioId,
                It.Is<DateTime>(dt => dt.Kind == DateTimeKind.Utc),
                It.Is<DateTime>(dt => dt.Kind == DateTimeKind.Utc),
                TimeSpan.FromMinutes(10),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task GetPatioTimeline_InvalidPatioId_ReturnsBadRequest()
    {
        // Arrange
        var patioId = 999;

        _mockTimelineService
            .Setup(s => s.GenerateTimelineAsync(
                patioId,
                It.IsAny<DateTime>(),
                It.IsAny<DateTime>(),
                It.IsAny<TimeSpan>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ArgumentException($"Patio {patioId} not found"));

        // Act
        var result = await _controller.GetPatioTimeline(patioId);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    #endregion

    #region GetTodayTimeline Tests

    [Fact]
    public async Task GetTodayTimeline_ValidPatioId_ReturnsOkWithTodayTimeline()
    {
        // Arrange
        var patioId = 1;
        var today = DateTime.UtcNow.Date;
        var expectedTimeline = CreateTestTimeline(patioId, today, today.AddDays(1));

        _mockTimelineService
            .Setup(s => s.GetTodayTimelineAsync(patioId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedTimeline);

        // Act
        var result = await _controller.GetTodayTimeline(patioId);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as SunExposureTimelineResponse;
        response!.PatioId.Should().Be(patioId);
    }

    #endregion

    #region GetTomorrowTimeline Tests

    [Fact]
    public async Task GetTomorrowTimeline_ValidPatioId_ReturnsOkWithTomorrowTimeline()
    {
        // Arrange
        var patioId = 1;
        var tomorrow = DateTime.UtcNow.Date.AddDays(1);
        var expectedTimeline = CreateTestTimeline(patioId, tomorrow, tomorrow.AddDays(1));

        _mockTimelineService
            .Setup(s => s.GetTomorrowTimelineAsync(patioId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedTimeline);

        // Act
        var result = await _controller.GetTomorrowTimeline(patioId);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as SunExposureTimelineResponse;
        response!.PatioId.Should().Be(patioId);
    }

    #endregion

    #region GetNext12HoursTimeline Tests

    [Fact]
    public async Task GetNext12HoursTimeline_ValidPatioId_ReturnsOkWithTimeline()
    {
        // Arrange
        var patioId = 1;
        var now = DateTime.UtcNow;
        var expectedTimeline = CreateTestTimeline(patioId, now, now.AddHours(12));

        _mockTimelineService
            .Setup(s => s.GetNext12HoursTimelineAsync(patioId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedTimeline);

        // Act
        var result = await _controller.GetNext12HoursTimeline(patioId);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as SunExposureTimelineResponse;
        response!.PatioId.Should().Be(patioId);
        response.Points.Should().NotBeEmpty();
    }

    #endregion

    #region GetBestSunWindows Tests

    [Fact]
    public async Task GetBestSunWindows_ValidParameters_ReturnsOkWithWindows()
    {
        // Arrange
        var patioId = 1;
        var start = DateTime.UtcNow;
        var end = start.AddHours(24);
        var maxWindows = 3;
        var expectedWindows = CreateTestSunWindows(3);

        _mockTimelineService
            .Setup(s => s.GetBestSunWindowsAsync(
                patioId,
                start,
                end,
                maxWindows,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedWindows);

        // Act
        var result = await _controller.GetBestSunWindows(patioId, start, end, maxWindows);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        var windows = okResult!.Value as IEnumerable<SunWindow>;
        windows.Should().NotBeNull();
        windows!.Count().Should().Be(3);
    }

    #endregion

    #region Deterministic Tests (AC4: No Flakiness)

    [Fact]
    public async Task GetPatioTimeline_MultipleCalls_ReturnsConsistentResults()
    {
        // Arrange
        var patioId = 1;
        var start = new DateTime(2024, 6, 21, 12, 0, 0, DateTimeKind.Utc);
        var end = start.AddHours(6);
        var timeline = CreateTestTimeline(patioId, start, end);

        _mockTimelineService
            .Setup(s => s.GenerateTimelineAsync(
                patioId,
                start,
                end,
                It.IsAny<TimeSpan>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(timeline);

        // Act - call multiple times
        var results = new List<ActionResult<SunExposureTimelineResponse>>();
        for (int i = 0; i < 5; i++)
        {
            results.Add(await _controller.GetPatioTimeline(patioId, start, end));
        }

        // Assert - all results should be identical
        foreach (var result in results)
        {
            result.Result.Should().BeOfType<OkObjectResult>();
            var okResult = result.Result as OkObjectResult;
            var response = okResult!.Value as SunExposureTimelineResponse;

            response!.PatioId.Should().Be(patioId);
            response.StartTime.Should().Be(start);
            response.EndTime.Should().Be(end);
        }
    }

    #endregion

    #region Helper Methods

    private SunExposureTimeline CreateTestTimeline(int patioId, DateTime start, DateTime end)
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

        var points = new List<SunExposureTimelinePoint>();
        var current = start;

        while (current <= end)
        {
            points.Add(new SunExposureTimelinePoint
            {
                Timestamp = current,
                LocalTime = current.AddHours(2),
                SunExposurePercent = 75.0,
                State = SunExposureState.Sunny,
                Confidence = 85.0,
                Source = DataSource.Calculated
            });
            current = current.AddMinutes(30);
        }

        return new SunExposureTimeline
        {
            PatioId = patioId,
            Patio = patio,
            StartTime = start,
            EndTime = end,
            Interval = TimeSpan.FromMinutes(30),
            Points = points,
            SunWindows = new List<SunWindow>(),
            Metadata = new TimelineMetadata(),
            AverageConfidence = 85.0,
            PrecomputedPointsCount = 0,
            InterpolatedPointsCount = 0,
            GeneratedAt = DateTime.UtcNow
        };
    }

    private List<SunWindow> CreateTestSunWindows(int count)
    {
        var windows = new List<SunWindow>();
        var start = DateTime.UtcNow;

        for (int i = 0; i < count; i++)
        {
            windows.Add(new SunWindow
            {
                StartTime = start.AddHours(i * 3),
                EndTime = start.AddHours(i * 3 + 2),
                LocalStartTime = start.AddHours(i * 3 + 2),
                LocalEndTime = start.AddHours(i * 3 + 4),
                PeakExposure = 90.0 - (i * 5),
                MinExposurePercent = 70.0 - (i * 5),
                MaxExposurePercent = 95.0 - (i * 5),
                AverageExposurePercent = 85.0 - (i * 5),
                Confidence = 85.0,
                Quality = SunWindowQuality.Excellent
            });
        }

        return windows;
    }

    #endregion
}
