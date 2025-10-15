using Moq;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Services;
using SunnySeat.Core.Models.Requests;
using SunnySeat.Core.Models.Responses;
using Xunit;
using FluentAssertions;

namespace SunnySeat.Core.Tests.Services;

/// <summary>
/// Unit tests for AccuracyTrackingService
/// </summary>
public class AccuracyTrackingServiceTests
{
    private readonly Mock<IFeedbackRepository> _mockFeedbackRepository;
    private readonly Mock<IPatioRepository> _mockPatioRepository;
    private readonly Mock<IVenueRepository> _mockVenueRepository;
    private readonly Mock<ISunExposureService> _mockSunExposureService;
    private readonly AccuracyTrackingService _service;

    public AccuracyTrackingServiceTests()
    {
        _mockFeedbackRepository = new Mock<IFeedbackRepository>();
        _mockPatioRepository = new Mock<IPatioRepository>();
        _mockVenueRepository = new Mock<IVenueRepository>();
        _mockSunExposureService = new Mock<ISunExposureService>();

        _service = new AccuracyTrackingService(
            _mockFeedbackRepository.Object,
            _mockPatioRepository.Object,
            _mockVenueRepository.Object,
            _mockSunExposureService.Object);
    }

    [Fact]
    public async Task SubmitFeedbackAsync_ValidRequest_ReturnsFeedbackResponse()
    {
        // Arrange
        var request = new SubmitFeedbackRequest
        {
            PatioId = 1,
            Timestamp = DateTime.UtcNow,
            WasSunny = true,
            PredictedSunExposure = 85.0,
            PredictedConfidence = 90.0
        };
        var ipAddress = "192.168.1.1";

        var patio = CreateTestPatio(1, 1);
        var venue = CreateTestVenue(1, "Test Venue");
        patio.Venue = venue;

        _mockPatioRepository.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(patio);

        _mockFeedbackRepository.Setup(r => r.CountRecentFeedbackByIpAsync(ipAddress, It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(5);

        _mockFeedbackRepository.Setup(r => r.HasRecentDuplicateFeedbackAsync(1, It.IsAny<DateTime>(), ipAddress, It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        _mockFeedbackRepository.Setup(r => r.CreateAsync(It.IsAny<Feedback>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Feedback f, CancellationToken ct) =>
            {
                f.Id = 1;
                f.Patio = patio;
                f.Venue = venue;
                return f;
            });

        // Act
        var result = await _service.SubmitFeedbackAsync(request, ipAddress);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(1);
        result.PatioId.Should().Be(1);
        result.WasSunny.Should().BeTrue();
        result.PredictedState.Should().Be("sunny");
    }

    [Fact]
    public async Task SubmitFeedbackAsync_NonExistentPatio_ThrowsArgumentException()
    {
        // Arrange
        var request = new SubmitFeedbackRequest
        {
            PatioId = 999,
            Timestamp = DateTime.UtcNow,
            WasSunny = true
        };
        var ipAddress = "192.168.1.1";

        _mockPatioRepository.Setup(r => r.GetByIdAsync(999, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Patio?)null);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.SubmitFeedbackAsync(request, ipAddress));
    }

    [Fact]
    public async Task SubmitFeedbackAsync_RateLimitExceeded_ThrowsInvalidOperationException()
    {
        // Arrange
        var request = new SubmitFeedbackRequest
        {
            PatioId = 1,
            Timestamp = DateTime.UtcNow,
            WasSunny = true
        };
        var ipAddress = "192.168.1.1";

        var patio = CreateTestPatio(1, 1);
        _mockPatioRepository.Setup(r => r.GetByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(patio);

        _mockFeedbackRepository.Setup(r => r.CountRecentFeedbackByIpAsync(ipAddress, It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(20); // At rate limit

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.SubmitFeedbackAsync(request, ipAddress));
    }

    [Fact]
    public async Task ValidateFeedbackSubmissionAsync_WithinLimits_ReturnsTrue()
    {
        // Arrange
        var patioId = 1;
        var timestamp = DateTime.UtcNow;
        var ipAddress = "192.168.1.1";

        _mockFeedbackRepository.Setup(r => r.CountRecentFeedbackByIpAsync(ipAddress, It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(10);

        _mockFeedbackRepository.Setup(r => r.HasRecentDuplicateFeedbackAsync(patioId, timestamp, ipAddress, It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        // Act
        var result = await _service.ValidateFeedbackSubmissionAsync(patioId, timestamp, ipAddress);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateFeedbackSubmissionAsync_DuplicateSubmission_ReturnsFalse()
    {
        // Arrange
        var patioId = 1;
        var timestamp = DateTime.UtcNow;
        var ipAddress = "192.168.1.1";

        _mockFeedbackRepository.Setup(r => r.CountRecentFeedbackByIpAsync(ipAddress, It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(5);

        _mockFeedbackRepository.Setup(r => r.HasRecentDuplicateFeedbackAsync(patioId, timestamp, ipAddress, It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true); // Duplicate found

        // Act
        var result = await _service.ValidateFeedbackSubmissionAsync(patioId, timestamp, ipAddress);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task GetAccuracyMetricsAsync_ReturnsCorrectMetrics()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddDays(-14);
        var endDate = DateTime.UtcNow;

        _mockFeedbackRepository.Setup(r => r.CountByDateRangeAsync(startDate, endDate, It.IsAny<CancellationToken>()))
            .ReturnsAsync(100);

        _mockFeedbackRepository.Setup(r => r.CountCorrectPredictionsAsync(startDate, endDate, It.IsAny<CancellationToken>()))
            .ReturnsAsync(85);

        _mockFeedbackRepository.Setup(r => r.CalculateAccuracyRateAsync(startDate, endDate, It.IsAny<CancellationToken>()))
            .ReturnsAsync(85.0);

        // Act
        var result = await _service.GetAccuracyMetricsAsync(startDate, endDate);

        // Assert
        result.Should().NotBeNull();
        result.TotalFeedback.Should().Be(100);
        result.CorrectPredictions.Should().Be(85);
        result.AccuracyRate.Should().Be(85.0);
        result.StartDate.Should().Be(startDate);
        result.EndDate.Should().Be(endDate);
    }

    [Fact]
    public async Task GetProblematicVenuesAsync_ReturnsVenuesBelowThreshold()
    {
        // Arrange
        var venues = new List<Venue>
        {
            CreateTestVenue(1, "Venue 1"),
            CreateTestVenue(2, "Venue 2")
        };

        _mockVenueRepository.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(venues);

        // Venue 1: Low accuracy (below threshold)
        _mockFeedbackRepository.Setup(r => r.GetByVenueAndDateRangeAsync(1, It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Feedback> { CreateTestFeedback(1, 1, 1), CreateTestFeedback(2, 1, 1) });

        _mockFeedbackRepository.Setup(r => r.CalculateAccuracyRateByVenueAsync(1, It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(75.0); // Below 80% threshold

        // Venue 2: High accuracy (above threshold)
        _mockFeedbackRepository.Setup(r => r.GetByVenueAndDateRangeAsync(2, It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Feedback> { CreateTestFeedback(3, 2, 2) });

        _mockFeedbackRepository.Setup(r => r.CalculateAccuracyRateByVenueAsync(2, It.IsAny<DateTime>(), It.IsAny<DateTime>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(90.0); // Above threshold

        // Act
        var result = await _service.GetProblematicVenuesAsync(80.0, 2);

        // Assert
        result.Should().NotBeEmpty();
        result.Should().ContainSingle();
        result.First().VenueId.Should().Be(1);
        result.First().AccuracyRate.Should().Be(75.0);
    }

    [Fact]
    public async Task CheckAccuracyAlertThresholdAsync_BelowThreshold_ReturnsTrue()
    {
        // Arrange
        var threshold = 80.0;
        var consecutiveDays = 3;

        // Setup 3 consecutive days with low accuracy
        for (int i = 0; i < 3; i++)
        {
            var dayStart = DateTime.UtcNow.Date.AddDays(-i);
            var dayEnd = dayStart.AddDays(1).AddTicks(-1);

            _mockFeedbackRepository.Setup(r => r.CountByDateRangeAsync(dayStart, dayEnd, It.IsAny<CancellationToken>()))
                .ReturnsAsync(10);

            _mockFeedbackRepository.Setup(r => r.CountCorrectPredictionsAsync(dayStart, dayEnd, It.IsAny<CancellationToken>()))
                .ReturnsAsync(7);

            _mockFeedbackRepository.Setup(r => r.CalculateAccuracyRateAsync(dayStart, dayEnd, It.IsAny<CancellationToken>()))
                .ReturnsAsync(70.0); // Below threshold
        }

        // Act
        var result = await _service.CheckAccuracyAlertThresholdAsync(threshold, consecutiveDays);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task CheckAccuracyAlertThresholdAsync_AboveThreshold_ReturnsFalse()
    {
        // Arrange
        var threshold = 80.0;
        var consecutiveDays = 3;

        // Setup days with good accuracy
        for (int i = 0; i < 7; i++)
        {
            var dayStart = DateTime.UtcNow.Date.AddDays(-i);
            var dayEnd = dayStart.AddDays(1).AddTicks(-1);

            _mockFeedbackRepository.Setup(r => r.CountByDateRangeAsync(dayStart, dayEnd, It.IsAny<CancellationToken>()))
                .ReturnsAsync(10);

            _mockFeedbackRepository.Setup(r => r.CountCorrectPredictionsAsync(dayStart, dayEnd, It.IsAny<CancellationToken>()))
                .ReturnsAsync(9);

            _mockFeedbackRepository.Setup(r => r.CalculateAccuracyRateAsync(dayStart, dayEnd, It.IsAny<CancellationToken>()))
                .ReturnsAsync(90.0); // Above threshold
        }

        // Act
        var result = await _service.CheckAccuracyAlertThresholdAsync(threshold, consecutiveDays);

        // Assert
        result.Should().BeFalse();
    }

    // Helper methods
    private static Patio CreateTestPatio(int id, int venueId)
    {
        return new Patio
        {
            Id = id,
            VenueId = venueId,
            Name = $"Patio {id}",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static Venue CreateTestVenue(int id, string name)
    {
        return new Venue
        {
            Id = id,
            Name = name,
            Address = "Test Address",
            Type = VenueType.Restaurant,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static Feedback CreateTestFeedback(int id, int venueId, int patioId)
    {
        return new Feedback
        {
            Id = id,
            VenueId = venueId,
            PatioId = patioId,
            UserTimestamp = DateTime.UtcNow,
            PredictedState = "sunny",
            ConfidenceAtPrediction = 85.0,
            WasSunny = true,
            BinnedTimestamp = DateTime.UtcNow,
            IpAddress = "192.168.1.1",
            CreatedAt = DateTime.UtcNow
        };
    }
}
