using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using SunnySeat.Api.Endpoints;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Models.Requests;
using SunnySeat.Core.Models.Responses;
using Xunit;

namespace SunnySeat.Api.Tests.Endpoints;

/// <summary>
/// Unit tests for ShadowController API endpoints
/// Validates API behavior, error handling, and response formatting
/// </summary>
public class ShadowControllerTests
{
    private readonly ShadowController _controller;
    private readonly Mock<IShadowCalculationService> _mockShadowService;
    private readonly Mock<ILogger<ShadowController>> _mockLogger;

    public ShadowControllerTests()
    {
        _mockShadowService = new Mock<IShadowCalculationService>();
        _mockLogger = new Mock<ILogger<ShadowController>>();
        _controller = new ShadowController(_mockShadowService.Object, _mockLogger.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_NullShadowService_ThrowsArgumentNullException()
    {
        // Act & Assert
        var action = () => new ShadowController(null!, _mockLogger.Object);
        action.Should().Throw<ArgumentNullException>().WithParameterName("shadowService");
    }

    [Fact]
    public void Constructor_NullLogger_ThrowsArgumentNullException()
    {
        // Act & Assert
        var action = () => new ShadowController(_mockShadowService.Object, null!);
        action.Should().Throw<ArgumentNullException>().WithParameterName("logger");
    }

    #endregion

    #region GetPatioShadow Tests

    [Fact]
    public async Task GetPatioShadow_ValidPatioId_ReturnsOkWithShadowInfo()
    {
        // Arrange
        var patioId = 123;
        var timestamp = new DateTime(2025, 10, 13, 14, 0, 0, DateTimeKind.Utc);
        var expectedShadowInfo = new PatioShadowInfo
        {
            PatioId = patioId,
            Timestamp = timestamp,
            ShadowedAreaPercent = 35.5,
            SunlitAreaPercent = 64.5,
            Confidence = 0.92,
            CastingShadows = new List<ShadowProjection>(),
            SolarPosition = new SolarPosition { Azimuth = 195.0, Elevation = 32.5 }
        };

        _mockShadowService.Setup(s => s.CalculatePatioShadowAsync(
            patioId, timestamp, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedShadowInfo);

        // Act
        var result = await _controller.GetPatioShadow(patioId, timestamp);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        okResult!.Value.Should().Be(expectedShadowInfo);
    }

    [Fact]
    public async Task GetPatioShadow_NoTimestamp_UsesCurrentTime()
    {
        // Arrange
        var patioId = 123;
        var expectedShadowInfo = new PatioShadowInfo
        {
            PatioId = patioId,
            ShadowedAreaPercent = 40.0,
            SunlitAreaPercent = 60.0,
            Confidence = 0.9
        };

        _mockShadowService.Setup(s => s.CalculatePatioShadowAsync(
            patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedShadowInfo);

        // Act
        var result = await _controller.GetPatioShadow(patioId);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        _mockShadowService.Verify(s => s.CalculatePatioShadowAsync(
            patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetPatioShadow_LocalTime_ConvertsToUtc()
    {
        // Arrange
        var patioId = 123;
        var localTime = new DateTime(2025, 10, 13, 16, 0, 0, DateTimeKind.Local);
        var expectedUtcTime = localTime.ToUniversalTime();
        var expectedShadowInfo = new PatioShadowInfo { PatioId = patioId };

        _mockShadowService.Setup(s => s.CalculatePatioShadowAsync(
            patioId, expectedUtcTime, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedShadowInfo);

        // Act
        var result = await _controller.GetPatioShadow(patioId, localTime);

        // Assert
        _mockShadowService.Verify(s => s.CalculatePatioShadowAsync(
            patioId, expectedUtcTime, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetPatioShadow_UnspecifiedTime_TreatsAsUtc()
    {
        // Arrange
        var patioId = 123;
        var unspecifiedTime = new DateTime(2025, 10, 13, 14, 0, 0, DateTimeKind.Unspecified);
        var expectedUtcTime = DateTime.SpecifyKind(unspecifiedTime, DateTimeKind.Utc);
        var expectedShadowInfo = new PatioShadowInfo { PatioId = patioId };

        _mockShadowService.Setup(s => s.CalculatePatioShadowAsync(
            patioId, expectedUtcTime, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedShadowInfo);

        // Act
        var result = await _controller.GetPatioShadow(patioId, unspecifiedTime);

        // Assert
        _mockShadowService.Verify(s => s.CalculatePatioShadowAsync(
            patioId, expectedUtcTime, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetPatioShadow_PatioNotFound_ReturnsNotFound()
    {
        // Arrange
        var patioId = 999;
        _mockShadowService.Setup(s => s.CalculatePatioShadowAsync(
            patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new KeyNotFoundException($"Patio with ID {patioId} not found"));

        // Act
        var result = await _controller.GetPatioShadow(patioId);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetPatioShadow_ServiceThrowsArgumentException_ReturnsBadRequest()
    {
        // Arrange
        var patioId = 123;
        _mockShadowService.Setup(s => s.CalculatePatioShadowAsync(
            patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ArgumentException("Invalid parameters"));

        // Act
        var result = await _controller.GetPatioShadow(patioId);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GetPatioShadow_ServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var patioId = 123;
        _mockShadowService.Setup(s => s.CalculatePatioShadowAsync(
            patioId, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _controller.GetPatioShadow(patioId);

        // Assert
        result.Result.Should().BeOfType<ObjectResult>();
        var objectResult = result.Result as ObjectResult;
        objectResult!.StatusCode.Should().Be(500);
    }

    #endregion

    #region GetBatchPatioShadow Tests

    [Fact]
    public async Task GetBatchPatioShadow_ValidRequest_ReturnsOkWithBatchResponse()
    {
        // Arrange
        var request = new BatchShadowRequest
        {
            PatioIds = new[] { 1, 2, 3 },
            Timestamp = new DateTime(2025, 10, 13, 14, 0, 0, DateTimeKind.Utc)
        };

        var shadowResults = new Dictionary<int, PatioShadowInfo>
        {
            { 1, new PatioShadowInfo { PatioId = 1, ShadowedAreaPercent = 30.0 } },
            { 2, new PatioShadowInfo { PatioId = 2, ShadowedAreaPercent = 40.0 } },
            { 3, new PatioShadowInfo { PatioId = 3, ShadowedAreaPercent = 50.0 } }
        };

        _mockShadowService.Setup(s => s.CalculatePatioBatchShadowAsync(
            request.PatioIds, request.Timestamp.Value, It.IsAny<CancellationToken>()))
            .ReturnsAsync(shadowResults);

        // Act
        var result = await _controller.GetBatchPatioShadow(request);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        var response = okResult!.Value as BatchShadowResponse;
        response.Should().NotBeNull();
        response!.Results.Should().HaveCount(3);
        response.CalculationTimeMs.Should().BeGreaterOrEqualTo(0);
    }

    [Fact]
    public async Task GetBatchPatioShadow_NoTimestamp_UsesCurrentTime()
    {
        // Arrange
        var request = new BatchShadowRequest
        {
            PatioIds = new[] { 1, 2 }
        };

        var shadowResults = new Dictionary<int, PatioShadowInfo>
        {
            { 1, new PatioShadowInfo { PatioId = 1 } },
            { 2, new PatioShadowInfo { PatioId = 2 } }
        };

        _mockShadowService.Setup(s => s.CalculatePatioBatchShadowAsync(
            request.PatioIds, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(shadowResults);

        // Act
        var result = await _controller.GetBatchPatioShadow(request);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetBatchPatioShadow_EmptyPatioIds_ReturnsBadRequest()
    {
        // Arrange
        var request = new BatchShadowRequest
        {
            PatioIds = Array.Empty<int>()
        };

        // Act
        var result = await _controller.GetBatchPatioShadow(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GetBatchPatioShadow_NullPatioIds_ReturnsBadRequest()
    {
        // Arrange
        var request = new BatchShadowRequest
        {
            PatioIds = null!
        };

        // Act
        var result = await _controller.GetBatchPatioShadow(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GetBatchPatioShadow_TooManyPatios_ReturnsBadRequest()
    {
        // Arrange
        var request = new BatchShadowRequest
        {
            PatioIds = Enumerable.Range(1, 101).ToArray() // 101 patios
        };

        // Act
        var result = await _controller.GetBatchPatioShadow(request);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
        var badRequestResult = result.Result as BadRequestObjectResult;
        var problemDetails = badRequestResult!.Value as ValidationProblemDetails;
        problemDetails!.Detail.Should().Contain("100 patios");
    }

    [Fact]
    public async Task GetBatchPatioShadow_Exactly100Patios_ReturnsOk()
    {
        // Arrange
        var patioIds = Enumerable.Range(1, 100).ToArray();
        var request = new BatchShadowRequest
        {
            PatioIds = patioIds
        };

        var shadowResults = patioIds.ToDictionary(
            id => id,
            id => new PatioShadowInfo { PatioId = id }
        );

        _mockShadowService.Setup(s => s.CalculatePatioBatchShadowAsync(
            request.PatioIds, It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(shadowResults);

        // Act
        var result = await _controller.GetBatchPatioShadow(request);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetBatchPatioShadow_ServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var request = new BatchShadowRequest
        {
            PatioIds = new[] { 1, 2, 3 }
        };

        _mockShadowService.Setup(s => s.CalculatePatioBatchShadowAsync(
            It.IsAny<IEnumerable<int>>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _controller.GetBatchPatioShadow(request);

        // Assert
        result.Result.Should().BeOfType<ObjectResult>();
        var objectResult = result.Result as ObjectResult;
        objectResult!.StatusCode.Should().Be(500);
    }

    #endregion

    #region GetPatioShadowTimeline Tests

    [Fact]
    public async Task GetPatioShadowTimeline_ValidParameters_ReturnsOkWithTimeline()
    {
        // Arrange
        var patioId = 123;
        var start = new DateTime(2025, 10, 13, 8, 0, 0, DateTimeKind.Utc);
        var end = new DateTime(2025, 10, 13, 20, 0, 0, DateTimeKind.Utc);
        var intervalMinutes = 10;

        var expectedTimeline = new ShadowTimeline
        {
            PatioId = patioId,
            StartTime = start,
            EndTime = end,
            Interval = TimeSpan.FromMinutes(intervalMinutes),
            Points = new List<ShadowTimelinePoint>
            {
                new ShadowTimelinePoint
                {
                    Timestamp = start,
                    ShadowedAreaPercent = 85.0,
                    SunlitAreaPercent = 15.0,
                    Confidence = 0.90,
                    IsSunVisible = true
                }
            },
            AverageConfidence = 0.91
        };

        _mockShadowService.Setup(s => s.CalculatePatioShadowTimelineAsync(
            patioId, start, end, TimeSpan.FromMinutes(intervalMinutes), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedTimeline);

        // Act
        var result = await _controller.GetPatioShadowTimeline(patioId, start, end, intervalMinutes);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
        var okResult = result.Result as OkObjectResult;
        okResult!.Value.Should().Be(expectedTimeline);
    }

    [Fact]
    public async Task GetPatioShadowTimeline_DefaultInterval_Uses10Minutes()
    {
        // Arrange
        var patioId = 123;
        var start = new DateTime(2025, 10, 13, 8, 0, 0, DateTimeKind.Utc);
        var end = new DateTime(2025, 10, 13, 20, 0, 0, DateTimeKind.Utc);
        var expectedTimeline = new ShadowTimeline { PatioId = patioId };

        _mockShadowService.Setup(s => s.CalculatePatioShadowTimelineAsync(
            patioId, start, end, TimeSpan.FromMinutes(10), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedTimeline);

        // Act
        var result = await _controller.GetPatioShadowTimeline(patioId, start, end);

        // Assert
        _mockShadowService.Verify(s => s.CalculatePatioShadowTimelineAsync(
            patioId, start, end, TimeSpan.FromMinutes(10), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetPatioShadowTimeline_EndBeforeStart_ReturnsBadRequest()
    {
        // Arrange
        var patioId = 123;
        var start = new DateTime(2025, 10, 13, 20, 0, 0, DateTimeKind.Utc);
        var end = new DateTime(2025, 10, 13, 8, 0, 0, DateTimeKind.Utc);

        // Act
        var result = await _controller.GetPatioShadowTimeline(patioId, start, end);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task GetPatioShadowTimeline_TimeRangeOver48Hours_ReturnsBadRequest()
    {
        // Arrange
        var patioId = 123;
        var start = new DateTime(2025, 10, 13, 8, 0, 0, DateTimeKind.Utc);
        var end = start.AddHours(49); // 49 hours > 48 hour limit

        // Act
        var result = await _controller.GetPatioShadowTimeline(patioId, start, end);

        // Assert
        result.Result.Should().BeOfType<BadRequestObjectResult>();
        var badRequestResult = result.Result as BadRequestObjectResult;
        var problemDetails = badRequestResult!.Value as ValidationProblemDetails;
        problemDetails!.Detail.Should().Contain("48 hours");
    }

    [Fact]
    public async Task GetPatioShadowTimeline_Exactly48Hours_ReturnsOk()
    {
        // Arrange
        var patioId = 123;
        var start = new DateTime(2025, 10, 13, 8, 0, 0, DateTimeKind.Utc);
        var end = start.AddHours(48); // Exactly 48 hours
        var expectedTimeline = new ShadowTimeline { PatioId = patioId };

        _mockShadowService.Setup(s => s.CalculatePatioShadowTimelineAsync(
            patioId, start, end, It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedTimeline);

        // Act
        var result = await _controller.GetPatioShadowTimeline(patioId, start, end);

        // Assert
        result.Result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetPatioShadowTimeline_PatioNotFound_ReturnsNotFound()
    {
        // Arrange
        var patioId = 999;
        var start = new DateTime(2025, 10, 13, 8, 0, 0, DateTimeKind.Utc);
        var end = new DateTime(2025, 10, 13, 20, 0, 0, DateTimeKind.Utc);

        _mockShadowService.Setup(s => s.CalculatePatioShadowTimelineAsync(
            patioId, start, end, It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new KeyNotFoundException($"Patio with ID {patioId} not found"));

        // Act
        var result = await _controller.GetPatioShadowTimeline(patioId, start, end);

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetPatioShadowTimeline_LocalTime_ConvertsToUtc()
    {
        // Arrange
        var patioId = 123;
        var localStart = new DateTime(2025, 10, 13, 10, 0, 0, DateTimeKind.Local);
        var localEnd = new DateTime(2025, 10, 13, 22, 0, 0, DateTimeKind.Local);
        var expectedUtcStart = localStart.ToUniversalTime();
        var expectedUtcEnd = localEnd.ToUniversalTime();
        var expectedTimeline = new ShadowTimeline { PatioId = patioId };

        _mockShadowService.Setup(s => s.CalculatePatioShadowTimelineAsync(
            patioId, expectedUtcStart, expectedUtcEnd, It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedTimeline);

        // Act
        var result = await _controller.GetPatioShadowTimeline(patioId, localStart, localEnd);

        // Assert
        _mockShadowService.Verify(s => s.CalculatePatioShadowTimelineAsync(
            patioId, expectedUtcStart, expectedUtcEnd, It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetPatioShadowTimeline_ServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        var patioId = 123;
        var start = new DateTime(2025, 10, 13, 8, 0, 0, DateTimeKind.Utc);
        var end = new DateTime(2025, 10, 13, 20, 0, 0, DateTimeKind.Utc);

        _mockShadowService.Setup(s => s.CalculatePatioShadowTimelineAsync(
            patioId, start, end, It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _controller.GetPatioShadowTimeline(patioId, start, end);

        // Assert
        result.Result.Should().BeOfType<ObjectResult>();
        var objectResult = result.Result as ObjectResult;
        objectResult!.StatusCode.Should().Be(500);
    }

    #endregion
}
