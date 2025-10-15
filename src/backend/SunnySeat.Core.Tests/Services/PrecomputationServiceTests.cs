using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Services;
using Xunit;

namespace SunnySeat.Core.Tests.Services;

/// <summary>
/// Unit tests for PrecomputationService
/// </summary>
public class PrecomputationServiceTests
{
    private readonly Mock<ISunExposureService> _mockSunExposureService;
    private readonly Mock<IPatioRepository> _mockPatioRepository;
    private readonly Mock<IPrecomputationRepository> _mockPrecomputationRepository;
    private readonly Mock<ICacheService> _mockCacheService;
    private readonly PrecomputationService _precomputationService;

    public PrecomputationServiceTests()
    {
        _mockSunExposureService = new Mock<ISunExposureService>();
        _mockPatioRepository = new Mock<IPatioRepository>();
        _mockPrecomputationRepository = new Mock<IPrecomputationRepository>();
        _mockCacheService = new Mock<ICacheService>();

        _precomputationService = new PrecomputationService(
            _mockSunExposureService.Object,
            _mockPatioRepository.Object,
            _mockPrecomputationRepository.Object,
            _mockCacheService.Object,
            NullLogger<PrecomputationService>.Instance);
    }

    [Fact]
    public async Task SchedulePrecomputationAsync_NewDate_CreatesNewSchedule()
    {
        // Arrange
        var targetDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1));

        _mockPrecomputationRepository.Setup(x => x.GetScheduleAsync(targetDate, default))
            .ReturnsAsync((PrecomputationSchedule?)null);

        var newSchedule = new PrecomputationSchedule
        {
            Id = 1,
            TargetDate = targetDate,
            Status = PrecomputationStatus.Scheduled,
            ScheduledAt = DateTime.UtcNow
        };

        _mockPrecomputationRepository.Setup(x => x.CreateScheduleAsync(It.IsAny<PrecomputationSchedule>(), default))
            .ReturnsAsync(newSchedule);

        // Act
        var result = await _precomputationService.SchedulePrecomputationAsync(targetDate);

        // Assert
        result.Should().NotBeNull();
        result.TargetDate.Should().Be(targetDate);
        result.Status.Should().Be(PrecomputationStatus.Scheduled);

        _mockPrecomputationRepository.Verify(x => x.CreateScheduleAsync(It.IsAny<PrecomputationSchedule>(), default), Times.Once);
    }

    [Fact]
    public async Task SchedulePrecomputationAsync_ExistingDate_ReturnsExistingSchedule()
    {
        // Arrange
        var targetDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1));
        var existingSchedule = new PrecomputationSchedule
        {
            Id = 1,
            TargetDate = targetDate,
            Status = PrecomputationStatus.Completed,
            ScheduledAt = DateTime.UtcNow.AddHours(-1)
        };

        _mockPrecomputationRepository.Setup(x => x.GetScheduleAsync(targetDate, default))
            .ReturnsAsync(existingSchedule);

        // Act
        var result = await _precomputationService.SchedulePrecomputationAsync(targetDate);

        // Assert
        result.Should().Be(existingSchedule);

        _mockPrecomputationRepository.Verify(x => x.CreateScheduleAsync(It.IsAny<PrecomputationSchedule>(), default), Times.Never);
    }

    [Fact]
    public async Task IsPrecomputationCompleteAsync_CallsRepository_ReturnsResult()
    {
        // Arrange
        var date = DateOnly.FromDateTime(DateTime.Today);
        _mockPrecomputationRepository.Setup(x => x.IsPrecomputationCompleteAsync(date, 0.95, default))
            .ReturnsAsync(true);

        // Act
        var result = await _precomputationService.IsPrecomputationCompleteAsync(date);

        // Assert
        result.Should().BeTrue();
        _mockPrecomputationRepository.Verify(x => x.IsPrecomputationCompleteAsync(date, 0.95, default), Times.Once);
    }

    [Fact]
    public async Task InvalidatePrecomputedDataAsync_ValidPatio_CallsBothRepositoryAndCache()
    {
        // Arrange
        var patioId = 1;
        var date = DateOnly.FromDateTime(DateTime.Today);

        _mockPrecomputationRepository.Setup(x => x.MarkPatioDataStaleAsync(patioId, date, default))
            .ReturnsAsync(5); // Mock return value

        // Act
        await _precomputationService.InvalidatePrecomputedDataAsync(patioId, date);

        // Assert
        _mockPrecomputationRepository.Verify(x => x.MarkPatioDataStaleAsync(patioId, date, default), Times.Once);
        _mockCacheService.Verify(x => x.InvalidateCacheAsync(patioId, date, default), Times.Once);
    }

    [Fact]
    public void GetCurrentAlgorithmVersion_ReturnsExpectedVersion()
    {
        // Act
        var version = _precomputationService.GetCurrentAlgorithmVersion();

        // Assert
        version.Should().Be("1.0");
    }

    [Fact]
    public void GetComputationTimeSlots_ReturnsValidTimeSlots()
    {
        // Act
        var timeSlots = _precomputationService.GetComputationTimeSlots();

        // Assert
        timeSlots.Should().NotBeEmpty();
        timeSlots.Should().BeInAscendingOrder();

        // Should start at 8 AM
        timeSlots.First().Should().Be(new TimeOnly(8, 0));

        // Should end at 8 PM  
        timeSlots.Last().Should().Be(new TimeOnly(20, 0));

        // Should have 10-minute intervals
        var expectedSlotCount = ((20 - 8) * 60 / 10) + 1; // 73 slots (8:00 to 20:00 inclusive)
        timeSlots.Length.Should().Be(expectedSlotCount);
    }

    [Fact]
    public void EstimateCompletionTime_WithValidInputs_ReturnsEstimateAfterCurrentTime()
    {
        // Arrange
        var patioCount = 5;
        var startTime = DateTime.UtcNow.AddMinutes(-1);

        // Act
        var estimatedCompletion = _precomputationService.EstimateCompletionTime(patioCount, startTime);

        // Assert
        estimatedCompletion.Should().BeAfter(DateTime.UtcNow);
        // Just check that it's a reasonable future time (not more than a day)
        estimatedCompletion.Should().BeBefore(DateTime.UtcNow.AddDays(1));
    }

    [Fact]
    public async Task ValidateDataIntegrityAsync_WithCompleteData_ReturnsValid()
    {
        // Arrange
        var date = DateOnly.FromDateTime(DateTime.Today);
        var patioCount = 10;
        var timeSlotCount = _precomputationService.GetComputationTimeSlots().Length;
        var expectedDataPoints = patioCount * timeSlotCount;

        var patios = Enumerable.Range(1, patioCount)
            .Select(i => new Patio { Id = i, Geometry = CreateTestPolygon() })
            .ToList();

        _mockPatioRepository.Setup(x => x.GetAllAsync(default))
            .ReturnsAsync(patios);

        _mockPrecomputationRepository.Setup(x => x.GetPrecomputedDataCountAsync(date, default))
            .ReturnsAsync(expectedDataPoints);

        // Act
        var result = await _precomputationService.ValidateDataIntegrityAsync(date);

        // Assert
        result.Should().NotBeNull();
        result.Date.Should().Be(date);
        result.ExpectedDataPoints.Should().Be(expectedDataPoints);
        result.ActualDataPoints.Should().Be(expectedDataPoints);
        result.IsValid.Should().BeTrue();
        result.CompletenessPercent.Should().Be(100.0);
    }

    [Fact]
    public async Task ValidateDataIntegrityAsync_WithIncompleteData_ReturnsInvalid()
    {
        // Arrange
        var date = DateOnly.FromDateTime(DateTime.Today);
        var patioCount = 10;
        var timeSlotCount = _precomputationService.GetComputationTimeSlots().Length;
        var expectedDataPoints = patioCount * timeSlotCount;
        var actualDataPoints = (int)(expectedDataPoints * 0.8); // 80% complete

        var patios = Enumerable.Range(1, patioCount)
            .Select(i => new Patio { Id = i, Geometry = CreateTestPolygon() })
            .ToList();

        _mockPatioRepository.Setup(x => x.GetAllAsync(default))
            .ReturnsAsync(patios);

        _mockPrecomputationRepository.Setup(x => x.GetPrecomputedDataCountAsync(date, default))
            .ReturnsAsync(actualDataPoints);

        // Act
        var result = await _precomputationService.ValidateDataIntegrityAsync(date);

        // Assert
        result.Should().NotBeNull();
        result.IsValid.Should().BeFalse(); // Below 95% threshold
        result.CompletenessPercent.Should().Be(80.0);
    }

    [Fact]
    public async Task CleanupExpiredDataAsync_CallsRepository_ReturnsCount()
    {
        // Arrange
        var expectedDeletedCount = 150;
        _mockPrecomputationRepository.Setup(x => x.DeleteExpiredDataAsync(It.IsAny<DateTime>(), default))
            .ReturnsAsync(expectedDeletedCount);

        // Act
        var result = await _precomputationService.CleanupExpiredDataAsync();

        // Assert
        result.Should().Be(expectedDeletedCount);
        _mockPrecomputationRepository.Verify(x => x.DeleteExpiredDataAsync(It.IsAny<DateTime>(), default), Times.Once);
    }

    /// <summary>
    /// Create a test polygon for patio geometry
    /// </summary>
    private NetTopologySuite.Geometries.Polygon CreateTestPolygon()
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

        return geometryFactory.CreatePolygon(coordinates);
    }
}