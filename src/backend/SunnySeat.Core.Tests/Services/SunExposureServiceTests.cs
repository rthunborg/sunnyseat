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
/// Unit tests for SunExposureService
/// </summary>
public class SunExposureServiceTests
{
    private readonly Mock<ISolarCalculationService> _mockSolarService;
    private readonly Mock<IShadowCalculationService> _mockShadowService;
    private readonly Mock<IPatioRepository> _mockPatioRepository;
    private readonly ConfidenceCalculator _confidenceCalculator;
    private readonly SunExposureService _sunExposureService;
    private readonly GeometryFactory _geometryFactory;

    public SunExposureServiceTests()
    {
        _mockSolarService = new Mock<ISolarCalculationService>();
        _mockShadowService = new Mock<IShadowCalculationService>();
        _mockPatioRepository = new Mock<IPatioRepository>();
        _confidenceCalculator = new ConfidenceCalculator();
        _geometryFactory = new GeometryFactory();

        _sunExposureService = new SunExposureService(
            _mockSolarService.Object,
            _mockShadowService.Object,
            _mockPatioRepository.Object,
            _confidenceCalculator,
            NullLogger<SunExposureService>.Instance);
    }

    [Fact]
    public async Task CalculatePatioSunExposureAsync_ValidPatio_ReturnsCorrectSunExposure()
    {
        // Arrange
        var patioId = 1;
        var timestamp = DateTime.UtcNow;
        var patio = CreateTestPatio(patioId);
        var solarPosition = CreateTestSolarPosition(45.0, 180.0);
        var shadowInfo = CreateTestShadowInfo(patioId, 75.0); // 75% sunlit

        _mockPatioRepository.Setup(x => x.GetByIdAsync(patioId, default))
            .ReturnsAsync(patio);
        _mockSolarService.Setup(x => x.CalculateSolarPositionAsync(timestamp, It.IsAny<double>(), It.IsAny<double>(), default))
            .ReturnsAsync(solarPosition);
        _mockSolarService.Setup(x => x.IsSunVisible(solarPosition))
            .Returns(true);
        _mockShadowService.Setup(x => x.CalculatePatioShadowAsync(patioId, timestamp, default))
            .ReturnsAsync(shadowInfo);

        // Act
        var result = await _sunExposureService.CalculatePatioSunExposureAsync(patioId, timestamp);

        // Assert
        result.Should().NotBeNull();
        result.PatioId.Should().Be(patioId);
        result.SunExposurePercent.Should().Be(75.0);
        result.State.Should().Be(SunExposureState.Sunny);
        result.Confidence.Should().BeGreaterThan(0);
        result.SolarPosition.Should().Be(solarPosition);
    }

    [Fact]
    public async Task CalculatePatioSunExposureAsync_SunBelowHorizon_ReturnsNoSunExposure()
    {
        // Arrange
        var patioId = 1;
        var timestamp = DateTime.UtcNow;
        var patio = CreateTestPatio(patioId);
        var solarPosition = CreateTestSolarPosition(-10.0, 180.0); // Below horizon

        _mockPatioRepository.Setup(x => x.GetByIdAsync(patioId, default))
            .ReturnsAsync(patio);
        _mockSolarService.Setup(x => x.CalculateSolarPositionAsync(timestamp, It.IsAny<double>(), It.IsAny<double>(), default))
            .ReturnsAsync(solarPosition);
        _mockSolarService.Setup(x => x.IsSunVisible(solarPosition))
            .Returns(false);

        // Act
        var result = await _sunExposureService.CalculatePatioSunExposureAsync(patioId, timestamp);

        // Assert
        result.Should().NotBeNull();
        result.PatioId.Should().Be(patioId);
        result.SunExposurePercent.Should().Be(0.0);
        result.State.Should().Be(SunExposureState.NoSun);
        result.Confidence.Should().Be(95.0);
    }

    [Theory]
    [InlineData(85.0, SunExposureState.Sunny)]     // > 70% = Sunny
    [InlineData(50.0, SunExposureState.Partial)]   // 30-70% = Partial  
    [InlineData(15.0, SunExposureState.Shaded)]    // < 30% = Shaded
    public async Task CalculatePatioSunExposureAsync_DifferentSunExposure_ReturnsCorrectState(
        double sunExposurePercent, SunExposureState expectedState)
    {
        // Arrange
        var patioId = 1;
        var timestamp = DateTime.UtcNow;
        var patio = CreateTestPatio(patioId);
        var solarPosition = CreateTestSolarPosition(45.0, 180.0);
        var shadowInfo = CreateTestShadowInfo(patioId, sunExposurePercent);

        _mockPatioRepository.Setup(x => x.GetByIdAsync(patioId, default))
            .ReturnsAsync(patio);
        _mockSolarService.Setup(x => x.CalculateSolarPositionAsync(timestamp, It.IsAny<double>(), It.IsAny<double>(), default))
            .ReturnsAsync(solarPosition);
        _mockSolarService.Setup(x => x.IsSunVisible(solarPosition))
            .Returns(true);
        _mockShadowService.Setup(x => x.CalculatePatioShadowAsync(patioId, timestamp, default))
            .ReturnsAsync(shadowInfo);

        // Act
        var result = await _sunExposureService.CalculatePatioSunExposureAsync(patioId, timestamp);

        // Assert
        result.State.Should().Be(expectedState);
        result.SunExposurePercent.Should().Be(sunExposurePercent);
    }

    /// <summary>
    /// Create a test patio for testing
    /// </summary>
    private Patio CreateTestPatio(int patioId)
    {
        var coordinates = new[]
        {
            new Coordinate(11.97, 57.71),      // SW corner (Gothenburg area)
            new Coordinate(11.9702, 57.71),    // SE corner
            new Coordinate(11.9702, 57.7102),  // NE corner
            new Coordinate(11.97, 57.7102),    // NW corner
            new Coordinate(11.97, 57.71)       // Close the ring
        };

        return new Patio
        {
            Id = patioId,
            VenueId = 1,
            Name = $"Test Patio {patioId}",
            Geometry = _geometryFactory.CreatePolygon(coordinates),
            PolygonQuality = 0.8,
            HeightSource = HeightSource.Heuristic,
            Venue = new Venue
            {
                Id = 1,
                Name = "Test Venue",
                Address = "Test Address",
                Location = new Point(11.971, 57.7101) { SRID = 4326 }
            },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Create a test solar position
    /// </summary>
    private SolarPosition CreateTestSolarPosition(double elevation, double azimuth)
    {
        return new SolarPosition
        {
            Elevation = elevation,
            Azimuth = azimuth,
            Timestamp = DateTime.UtcNow,
            LocalTime = DateTime.Now,
            Latitude = 57.71,
            Longitude = 11.97
        };
    }

    /// <summary>
    /// Create test shadow information
    /// </summary>
    private PatioShadowInfo CreateTestShadowInfo(int patioId, double sunlitPercent)
    {
        return new PatioShadowInfo
        {
            PatioId = patioId,
            ShadowedAreaPercent = 100.0 - sunlitPercent,
            SunlitAreaPercent = sunlitPercent,
            Confidence = 0.85,
            CastingShadows = new List<ShadowProjection>(),
            Timestamp = DateTime.UtcNow,
            SolarPosition = CreateTestSolarPosition(45.0, 180.0)
        };
    }
}