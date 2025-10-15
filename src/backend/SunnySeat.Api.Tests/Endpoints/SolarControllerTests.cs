using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using SunnySeat.Api.Endpoints;
using SunnySeat.Core.Constants;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using Xunit;

namespace SunnySeat.Api.Tests.Endpoints
{
    /// <summary>
    /// Unit tests for SolarController API endpoints
    /// Validates API behavior, error handling, and response formatting
    /// </summary>
    public class SolarControllerTests
    {
        private readonly SolarController _controller;
        private readonly Mock<ISolarCalculationService> _mockSolarService;
        private readonly Mock<ILogger<SolarController>> _mockLogger;

        public SolarControllerTests()
        {
            _mockSolarService = new Mock<ISolarCalculationService>();
            _mockLogger = new Mock<ILogger<SolarController>>();
            _controller = new SolarController(_mockSolarService.Object, _mockLogger.Object);
        }

        #region Constructor Tests

        [Fact]
        public void Constructor_NullSolarService_ThrowsArgumentNullException()
        {
            // Act & Assert
            var action = () => new SolarController(null!, _mockLogger.Object);
            action.Should().Throw<ArgumentNullException>().WithParameterName("solarCalculationService");
        }

        [Fact]
        public void Constructor_NullLogger_ThrowsArgumentNullException()
        {
            // Act & Assert
            var action = () => new SolarController(_mockSolarService.Object, null!);
            action.Should().Throw<ArgumentNullException>().WithParameterName("logger");
        }

        #endregion

        #region GetSolarPosition Tests

        [Fact]
        public async Task GetSolarPosition_ValidParameters_ReturnsOkWithSolarPosition()
        {
            // Arrange
            var timestamp = new DateTime(2024, 6, 21, 12, 0, 0, DateTimeKind.Utc);
            var expectedPosition = new SolarPosition
            {
                Azimuth = 180.0,
                Elevation = 55.0,
                Declination = 23.44,
                Timestamp = timestamp,
                Latitude = GothenburgCoordinates.Latitude,
                Longitude = GothenburgCoordinates.Longitude
            };

            _mockSolarService.Setup(s => s.CalculateSolarPositionAsync(
                timestamp, GothenburgCoordinates.Latitude, GothenburgCoordinates.Longitude, It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedPosition);

            // Act
            var result = await _controller.GetSolarPosition(timestamp);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            var okResult = result.Result as OkObjectResult;
            okResult.Value.Should().Be(expectedPosition);
        }

        [Fact]
        public async Task GetSolarPosition_CustomCoordinates_UsesProvidedCoordinates()
        {
            // Arrange
            var timestamp = new DateTime(2024, 6, 21, 12, 0, 0, DateTimeKind.Utc);
            var customLat = 59.3293; // Stockholm
            var customLng = 18.0686;
            var expectedPosition = new SolarPosition
            {
                Azimuth = 180.0,
                Elevation = 50.0,
                Latitude = customLat,
                Longitude = customLng
            };

            _mockSolarService.Setup(s => s.CalculateSolarPositionAsync(
                timestamp, customLat, customLng, It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedPosition);

            // Act
            var result = await _controller.GetSolarPosition(timestamp, customLat, customLng);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            _mockSolarService.Verify(s => s.CalculateSolarPositionAsync(timestamp, customLat, customLng, It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task GetSolarPosition_LocalTime_ConvertsToUtc()
        {
            // Arrange
            var localTime = new DateTime(2024, 6, 21, 14, 0, 0, DateTimeKind.Local); // 2 PM local
            var expectedUtcTime = localTime.ToUniversalTime();
            var expectedPosition = new SolarPosition { Azimuth = 180.0, Elevation = 55.0 };

            _mockSolarService.Setup(s => s.CalculateSolarPositionAsync(
                expectedUtcTime, It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedPosition);

            // Act
            var result = await _controller.GetSolarPosition(localTime);

            // Assert
            _mockSolarService.Verify(s => s.CalculateSolarPositionAsync(expectedUtcTime, It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task GetSolarPosition_UnspecifiedTime_TreatsAsUtc()
        {
            // Arrange
            var unspecifiedTime = new DateTime(2024, 6, 21, 12, 0, 0, DateTimeKind.Unspecified);
            var expectedUtcTime = DateTime.SpecifyKind(unspecifiedTime, DateTimeKind.Utc);
            var expectedPosition = new SolarPosition { Azimuth = 180.0, Elevation = 55.0 };

            _mockSolarService.Setup(s => s.CalculateSolarPositionAsync(
                expectedUtcTime, It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedPosition);

            // Act
            var result = await _controller.GetSolarPosition(unspecifiedTime);

            // Assert
            _mockSolarService.Verify(s => s.CalculateSolarPositionAsync(expectedUtcTime, It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task GetSolarPosition_ServiceThrowsArgumentException_ReturnsBadRequest()
        {
            // Arrange
            var timestamp = new DateTime(2024, 6, 21, 12, 0, 0, DateTimeKind.Utc);
            _mockSolarService.Setup(s => s.CalculateSolarPositionAsync(It.IsAny<DateTime>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new ArgumentException("Invalid coordinates"));

            // Act
            var result = await _controller.GetSolarPosition(timestamp);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
            var badRequestResult = result.Result as BadRequestObjectResult;
            badRequestResult.Value.Should().BeOfType<ValidationProblemDetails>();
        }

        [Fact]
        public async Task GetSolarPosition_ServiceThrowsException_ReturnsInternalServerError()
        {
            // Arrange
            var timestamp = new DateTime(2024, 6, 21, 12, 0, 0, DateTimeKind.Utc);
            _mockSolarService.Setup(s => s.CalculateSolarPositionAsync(It.IsAny<DateTime>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("Database error"));

            // Act
            var result = await _controller.GetSolarPosition(timestamp);

            // Assert
            result.Result.Should().BeOfType<ObjectResult>();
            var objectResult = result.Result as ObjectResult;
            objectResult.StatusCode.Should().Be(StatusCodes.Status500InternalServerError);
        }

        #endregion

        #region GetCurrentSolarPosition Tests

        [Fact]
        public async Task GetCurrentSolarPosition_DefaultParameters_ReturnsCurrentPosition()
        {
            // Arrange
            var expectedPosition = new SolarPosition
            {
                Azimuth = 245.0,
                Elevation = 35.0,
                Timestamp = DateTime.UtcNow,
                Latitude = GothenburgCoordinates.Latitude,
                Longitude = GothenburgCoordinates.Longitude
            };

            _mockSolarService.Setup(s => s.GetCurrentSolarPositionAsync(
                GothenburgCoordinates.Latitude, GothenburgCoordinates.Longitude, It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedPosition);

            // Act
            var result = await _controller.GetCurrentSolarPosition();

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            var okResult = result.Result as OkObjectResult;
            okResult.Value.Should().Be(expectedPosition);
        }

        [Fact]
        public async Task GetCurrentSolarPosition_CustomCoordinates_UsesProvidedCoordinates()
        {
            // Arrange
            var customLat = 59.3293; // Stockholm
            var customLng = 18.0686;
            var expectedPosition = new SolarPosition
            {
                Azimuth = 220.0,
                Elevation = 30.0,
                Latitude = customLat,
                Longitude = customLng
            };

            _mockSolarService.Setup(s => s.GetCurrentSolarPositionAsync(customLat, customLng, It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedPosition);

            // Act
            var result = await _controller.GetCurrentSolarPosition(customLat, customLng);

            // Assert
            _mockSolarService.Verify(s => s.GetCurrentSolarPositionAsync(customLat, customLng, It.IsAny<CancellationToken>()), Times.Once);
        }

        #endregion

        #region GetSolarTimeline Tests

        [Fact]
        public async Task GetSolarTimeline_ValidRange_ReturnsSolarPositions()
        {
            // Arrange
            var start = new DateTime(2024, 6, 21, 6, 0, 0, DateTimeKind.Utc);
            var end = new DateTime(2024, 6, 21, 18, 0, 0, DateTimeKind.Utc);
            var intervalMinutes = 60;
            var expectedPositions = new List<SolarPosition>
            {
                new() { Azimuth = 90.0, Elevation = 20.0, Timestamp = start },
                new() { Azimuth = 180.0, Elevation = 55.0, Timestamp = start.AddHours(6) },
                new() { Azimuth = 270.0, Elevation = 20.0, Timestamp = end }
            };

            _mockSolarService.Setup(s => s.CalculateSolarTimelineAsync(
                start, end, TimeSpan.FromMinutes(intervalMinutes), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedPositions);

            // Act
            var result = await _controller.GetSolarTimeline(start, end, intervalMinutes);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            var okResult = result.Result as OkObjectResult;
            var positions = okResult.Value as List<SolarPosition>;
            positions.Should().HaveCount(3);
        }

        [Fact]
        public async Task GetSolarTimeline_DefaultInterval_UsesDefaultOf10Minutes()
        {
            // Arrange
            var start = new DateTime(2024, 6, 21, 12, 0, 0, DateTimeKind.Utc);
            var end = new DateTime(2024, 6, 21, 13, 0, 0, DateTimeKind.Utc);
            var expectedPositions = new List<SolarPosition>();

            _mockSolarService.Setup(s => s.CalculateSolarTimelineAsync(
                start, end, TimeSpan.FromMinutes(10), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedPositions);

            // Act
            var result = await _controller.GetSolarTimeline(start, end); // No interval specified

            // Assert
            _mockSolarService.Verify(s => s.CalculateSolarTimelineAsync(
                start, end, TimeSpan.FromMinutes(10), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task GetSolarTimeline_ServiceThrowsArgumentException_ReturnsBadRequest()
        {
            // Arrange
            var start = DateTime.UtcNow;
            var end = start.AddHours(-1); // Invalid range

            _mockSolarService.Setup(s => s.CalculateSolarTimelineAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<TimeSpan>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new ArgumentException("End time must be after start time"));

            // Act
            var result = await _controller.GetSolarTimeline(start, end);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        #endregion

        #region GetSunTimes Tests

        [Fact]
        public async Task GetSunTimes_ValidDate_ReturnsSunTimes()
        {
            // Arrange
            var date = new DateOnly(2024, 6, 21); // Summer solstice
            var expectedSunTimes = new SunTimes
            {
                Date = date,
                SunriseUtc = new DateTime(2024, 6, 21, 3, 30, 0, DateTimeKind.Utc),
                SunsetUtc = new DateTime(2024, 6, 21, 20, 30, 0, DateTimeKind.Utc),
                MaxElevation = 55.0,
                Latitude = GothenburgCoordinates.Latitude,
                Longitude = GothenburgCoordinates.Longitude
            };

            _mockSolarService.Setup(s => s.GetSunTimesAsync(
                date, GothenburgCoordinates.Latitude, GothenburgCoordinates.Longitude, It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedSunTimes);

            // Act
            var result = await _controller.GetSunTimes(date);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            var okResult = result.Result as OkObjectResult;
            okResult.Value.Should().Be(expectedSunTimes);
        }

        [Fact]
        public async Task GetSunTimes_CustomCoordinates_UsesProvidedCoordinates()
        {
            // Arrange
            var date = new DateOnly(2024, 6, 21);
            var customLat = 60.0;
            var customLng = 10.0;
            var expectedSunTimes = new SunTimes
            {
                Date = date,
                Latitude = customLat,
                Longitude = customLng
            };

            _mockSolarService.Setup(s => s.GetSunTimesAsync(date, customLat, customLng, It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedSunTimes);

            // Act
            var result = await _controller.GetSunTimes(date, customLat, customLng);

            // Assert
            _mockSolarService.Verify(s => s.GetSunTimesAsync(date, customLat, customLng, It.IsAny<CancellationToken>()), Times.Once);
        }

        #endregion

        #region GetSolarPositionForVenue Tests

        [Fact]
        public async Task GetSolarPositionForVenue_ValidVenueId_ReturnsVenueSolarPosition()
        {
            // Arrange
            var venueId = 123;
            var timestamp = new DateTime(2024, 6, 21, 12, 0, 0, DateTimeKind.Utc);
            var expectedPosition = new SolarPosition
            {
                Azimuth = 180.0,
                Elevation = 55.0,
                Timestamp = timestamp
            };

            _mockSolarService.Setup(s => s.CalculateForVenueAsync(venueId, timestamp, It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedPosition);

            // Act
            var result = await _controller.GetSolarPositionForVenue(venueId, timestamp);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            var okResult = result.Result as OkObjectResult;
            okResult.Value.Should().Be(expectedPosition);
        }

        [Fact]
        public async Task GetSolarPositionForVenue_InvalidVenueId_ReturnsBadRequest()
        {
            // Arrange
            var invalidVenueId = -1;
            var timestamp = DateTime.UtcNow;

            // Act
            var result = await _controller.GetSolarPositionForVenue(invalidVenueId, timestamp);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
            var badRequestResult = result.Result as BadRequestObjectResult;
            var problemDetails = badRequestResult.Value as ValidationProblemDetails;
            problemDetails.Detail.Should().Contain("Venue ID must be positive");
        }

        [Fact]
        public async Task GetSolarPositionForVenue_VenueNotFound_ReturnsNotFound()
        {
            // Arrange
            var venueId = 999;
            var timestamp = DateTime.UtcNow;

            _mockSolarService.Setup(s => s.CalculateForVenueAsync(venueId, timestamp, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new ArgumentException($"Venue {venueId} has no location data"));

            // Act
            var result = await _controller.GetSolarPositionForVenue(venueId, timestamp);

            // Assert
            result.Result.Should().BeOfType<NotFoundObjectResult>();
            var notFoundResult = result.Result as NotFoundObjectResult;
            notFoundResult.Value.Should().Be($"Venue {venueId} not found or has no location data");
        }

        #endregion

        #region GetSolarPositionForPatio Tests

        [Fact]
        public async Task GetSolarPositionForPatio_ValidPatioId_ReturnsPatioSolarPosition()
        {
            // Arrange
            var patioId = 456;
            var timestamp = new DateTime(2024, 6, 21, 12, 0, 0, DateTimeKind.Utc);
            var expectedPosition = new SolarPosition
            {
                Azimuth = 180.0,
                Elevation = 55.0,
                Timestamp = timestamp
            };

            _mockSolarService.Setup(s => s.CalculateForPatioAsync(patioId, timestamp, It.IsAny<CancellationToken>()))
                .ReturnsAsync(expectedPosition);

            // Act
            var result = await _controller.GetSolarPositionForPatio(patioId, timestamp);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            var okResult = result.Result as OkObjectResult;
            okResult.Value.Should().Be(expectedPosition);
        }

        [Fact]
        public async Task GetSolarPositionForPatio_InvalidPatioId_ReturnsBadRequest()
        {
            // Arrange
            var invalidPatioId = 0;
            var timestamp = DateTime.UtcNow;

            // Act
            var result = await _controller.GetSolarPositionForPatio(invalidPatioId, timestamp);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
            var badRequestResult = result.Result as BadRequestObjectResult;
            var problemDetails = badRequestResult.Value as ValidationProblemDetails;
            problemDetails.Detail.Should().Contain("Patio ID must be positive");
        }

        [Fact]
        public async Task GetSolarPositionForPatio_PatioNotFound_ReturnsNotFound()
        {
            // Arrange
            var patioId = 999;
            var timestamp = DateTime.UtcNow;

            _mockSolarService.Setup(s => s.CalculateForPatioAsync(patioId, timestamp, It.IsAny<CancellationToken>()))
                .ThrowsAsync(new ArgumentException($"Patio {patioId} has no geometry data"));

            // Act
            var result = await _controller.GetSolarPositionForPatio(patioId, timestamp);

            // Assert
            result.Result.Should().BeOfType<NotFoundObjectResult>();
            var notFoundResult = result.Result as NotFoundObjectResult;
            notFoundResult.Value.Should().Be($"Patio {patioId} not found or has no geometry data");
        }

        #endregion

        #region Parameter Validation Tests

        [Theory]
        [InlineData(-91.0, 0.0)]   // Invalid latitude
        [InlineData(91.0, 0.0)]    // Invalid latitude
        [InlineData(0.0, -181.0)]  // Invalid longitude
        [InlineData(0.0, 181.0)]   // Invalid longitude
        public async Task SolarEndpoints_InvalidCoordinates_ValidationHandledByModel(double lat, double lng)
        {
            // Note: In a real integration test, this would be handled by model validation
            // Here we just ensure the controller doesn't crash with extreme values

            // Arrange
            var timestamp = DateTime.UtcNow;
            var validPosition = new SolarPosition { Azimuth = 0, Elevation = 0 };

            _mockSolarService.Setup(s => s.CalculateSolarPositionAsync(It.IsAny<DateTime>(), lat, lng, It.IsAny<CancellationToken>()))
                .ReturnsAsync(validPosition);

            // Act & Assert - Should not throw
            var result = await _controller.GetSolarPosition(timestamp, lat, lng);
            result.Should().NotBeNull();
        }

        [Theory]
        [InlineData(0)]      // Invalid interval
        [InlineData(-10)]    // Negative interval
        [InlineData(1441)]   // Too large interval (>24 hours)
        public async Task GetSolarTimeline_InvalidInterval_ValidationHandledByModel(int intervalMinutes)
        {
            // Note: In a real integration test, this would be handled by model validation attributes

            // Arrange
            var start = DateTime.UtcNow;
            var end = start.AddHours(1);
            var validPositions = new List<SolarPosition>();

            // For this unit test, we assume the service handles validation
            _mockSolarService.Setup(s => s.CalculateSolarTimelineAsync(It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<TimeSpan>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(validPositions);

            // Act & Assert - Should not throw at controller level
            var result = await _controller.GetSolarTimeline(start, end, intervalMinutes);
            result.Should().NotBeNull();
        }

        #endregion

        #region Cancellation Tests

        [Fact]
        public async Task GetSolarPosition_CancellationRequested_ReturnsInternalServerError()
        {
            // Arrange
            var timestamp = DateTime.UtcNow;
            var cts = new CancellationTokenSource();
            cts.Cancel();

            _mockSolarService.Setup(s => s.CalculateSolarPositionAsync(It.IsAny<DateTime>(), It.IsAny<double>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new OperationCanceledException());

            // Act
            var result = await _controller.GetSolarPosition(timestamp, cancellationToken: cts.Token);

            // Assert
            result.Result.Should().BeOfType<ObjectResult>();
            var objectResult = result.Result as ObjectResult;
            objectResult!.StatusCode.Should().Be(StatusCodes.Status500InternalServerError);
        }

        #endregion
    }
}