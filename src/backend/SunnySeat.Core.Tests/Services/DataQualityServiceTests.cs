using Moq;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Services;
using Xunit;
using FluentAssertions;

namespace SunnySeat.Core.Tests.Services;

/// <summary>
/// Unit tests for DataQualityService
/// </summary>
public class DataQualityServiceTests
{
    private readonly Mock<IVenueRepository> _mockVenueRepository;
    private readonly Mock<IPatioRepository> _mockPatioRepository;
    private readonly DataQualityService _dataQualityService;

    public DataQualityServiceTests()
    {
        _mockVenueRepository = new Mock<IVenueRepository>();
        _mockPatioRepository = new Mock<IPatioRepository>();

        _dataQualityService = new DataQualityService(
            _mockVenueRepository.Object,
            _mockPatioRepository.Object);
    }

    [Fact]
    public async Task ValidateVenueAsync_ValidVenue_ReturnsTrue()
    {
        // Arrange
        var venue = CreateValidVenue();
        // Add patios to make it truly valid
        venue.Patios = new List<Patio>
        {
            CreateValidPatio(1, venue.Id, "Patio 1", 0.8)
        };

        _mockVenueRepository.Setup(r => r.GetVenuesNearPointAsync(It.IsAny<Point>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Venue>());

        // Act
        var result = await _dataQualityService.ValidateVenueAsync(venue);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateVenueAsync_InvalidVenue_ReturnsFalse()
    {
        // Arrange
        var venue = CreateInvalidVenue();

        _mockVenueRepository.Setup(r => r.GetVenuesNearPointAsync(It.IsAny<Point>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Venue>());

        // Act
        var result = await _dataQualityService.ValidateVenueAsync(venue);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task GetVenueValidationIssuesAsync_InvalidVenue_ReturnsIssues()
    {
        // Arrange
        var venue = CreateInvalidVenue();

        _mockVenueRepository.Setup(r => r.GetVenuesNearPointAsync(It.IsAny<Point>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Venue>());

        // Act
        var issues = await _dataQualityService.GetVenueValidationIssuesAsync(venue);

        // Assert
        issues.Should().NotBeEmpty();
        issues.Should().Contain(issue => issue.Contains("Invalid or missing venue name"));
        issues.Should().Contain(issue => issue.Contains("Invalid or missing venue address"));
    }

    [Fact]
    public async Task GetVenueValidationIssuesAsync_DuplicateVenue_ReturnsDuplicateIssue()
    {
        // Arrange
        var venue = CreateValidVenue();
        venue.Id = 1;

        var duplicateVenue = CreateValidVenue();
        duplicateVenue.Id = 2;
        duplicateVenue.Name = venue.Name; // Same name

        _mockVenueRepository.Setup(r => r.GetVenuesNearPointAsync(venue.Location, 0.1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Venue> { duplicateVenue });

        // Act
        var issues = await _dataQualityService.GetVenueValidationIssuesAsync(venue);

        // Assert
        issues.Should().Contain(issue => issue.Contains("Potential duplicate venue found"));
    }

    [Fact]
    public async Task CalculateVenueQualityScoreAsync_VenueWithPatios_ReturnsCalculatedScore()
    {
        // Arrange
        var venue = CreateValidVenue();
        venue.Id = 1;

        var patios = new List<Patio>
        {
            CreateValidPatio(1, venue.Id, "Patio 1", 0.8),
            CreateValidPatio(2, venue.Id, "Patio 2", 0.9)
        };

        _mockPatioRepository.Setup(r => r.GetByVenueIdAsync(venue.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(patios);

        // Act
        var score = await _dataQualityService.CalculateVenueQualityScoreAsync(venue);

        // Assert
        score.Should().BeGreaterThan(0);
        score.Should().BeLessOrEqualTo(1.0);
    }

    [Fact]
    public async Task ValidatePatioAsync_ValidPatio_ReturnsTrue()
    {
        // Arrange
        var patio = CreateValidPatio(1, 1, "Test Patio", 0.8);

        _mockPatioRepository.Setup(r => r.GetPatiosNearPointAsync(It.IsAny<Point>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Patio>());

        // Act
        var issues = await _dataQualityService.GetPatioValidationIssuesAsync(patio);
        var result = await _dataQualityService.ValidatePatioAsync(patio);

        // Assert - patio should be valid (no issues)
        issues.Should().BeEmpty($"but found issues: {string.Join(", ", issues)}");
        result.Should().BeTrue();
    }

    [Fact]
    public async Task ValidatePatioAsync_InvalidPatio_ReturnsFalse()
    {
        // Arrange
        var patio = CreateInvalidPatio();

        _mockPatioRepository.Setup(r => r.GetPatiosNearPointAsync(It.IsAny<Point>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Patio>());

        // Act
        var result = await _dataQualityService.ValidatePatioAsync(patio);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task GetQualityMetricsAsync_ReturnsComprehensiveMetrics()
    {
        // Arrange
        _mockVenueRepository.Setup(r => r.CountAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(10);

        _mockPatioRepository.Setup(r => r.CountAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(15);

        _mockVenueRepository.Setup(r => r.GetUnmappedVenuesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Venue> { CreateValidVenue(), CreateValidVenue() });

        _mockPatioRepository.Setup(r => r.CountPatiosRequiringReviewAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(3);

        _mockPatioRepository.Setup(r => r.GetAverageQualityScoreAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(0.75);

        // Setup type distribution
        _mockVenueRepository.Setup(r => r.CountByTypeAsync(VenueType.Restaurant, It.IsAny<CancellationToken>()))
            .ReturnsAsync(5);
        _mockVenueRepository.Setup(r => r.CountByTypeAsync(VenueType.Cafe, It.IsAny<CancellationToken>()))
            .ReturnsAsync(3);
        _mockVenueRepository.Setup(r => r.CountByTypeAsync(VenueType.Bar, It.IsAny<CancellationToken>()))
            .ReturnsAsync(2);
        _mockVenueRepository.Setup(r => r.CountByTypeAsync(VenueType.Hotel, It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        _mockVenueRepository.Setup(r => r.CountByTypeAsync(VenueType.Other, It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        // Act
        var metrics = await _dataQualityService.GetQualityMetricsAsync();

        // Assert
        metrics.Should().ContainKey("totalVenues");
        metrics.Should().ContainKey("totalPatios");
        metrics.Should().ContainKey("mappedVenues");
        metrics.Should().ContainKey("unmappedVenues");
        metrics.Should().ContainKey("patiosNeedingReview");
        metrics.Should().ContainKey("averagePatioQuality");
        metrics.Should().ContainKey("venueTypeDistribution");
        metrics.Should().ContainKey("mappingProgress");

        metrics["totalVenues"].Should().Be(10);
        metrics["totalPatios"].Should().Be(15);
        metrics["unmappedVenues"].Should().Be(2);
        metrics["mappedVenues"].Should().Be(8);
        metrics["patiosNeedingReview"].Should().Be(3);
        metrics["averagePatioQuality"].Should().Be(0.75);
        metrics["mappingProgress"].Should().Be(80.0);
    }

    [Fact]
    public async Task ValidateVenueDetailedAsync_ExistingVenue_ReturnsDetailedMetrics()
    {
        // Arrange
        var venueId = 1;
        var venue = CreateValidVenue();
        venue.Id = venueId;
        venue.Patios = new List<Patio>
        {
            CreateValidPatio(1, venueId, "Patio 1", 0.8),
            CreateValidPatio(2, venueId, "Patio 2", 0.9)
        };

        _mockVenueRepository.Setup(r => r.GetByIdWithPatiosAsync(venueId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(venue);

        _mockVenueRepository.Setup(r => r.GetVenuesNearPointAsync(It.IsAny<Point>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Venue>());

        // Act
        var metrics = await _dataQualityService.ValidateVenueDetailedAsync(venueId);

        // Assert
        metrics.Should().NotBeNull();
        metrics.VenueId.Should().Be(venueId);
        metrics.OverallQuality.Should().BeGreaterThan(0);
        metrics.HasCompleteMetadata.Should().BeTrue();
        metrics.HasAccurateLocation.Should().BeTrue();
        metrics.HasQualityPatios.Should().BeTrue();
        metrics.PatioCount.Should().Be(2);
        metrics.AveragePatioQuality.Should().BeApproximately(0.85, 0.001); // Use tolerance for floating point
    }

    private static Venue CreateValidVenue()
    {
        return new Venue
        {
            Name = "Valid Test Venue",
            Address = "Test Street 123, G�teborg",
            Location = new Point(11.9746, 57.7089) { SRID = 4326 }, // Gothenberg coordinates
            Type = VenueType.Restaurant,
            Phone = "031-123456",
            Website = "https://testvenye.se",
            IsActive = true,
            IsMapped = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static Venue CreateInvalidVenue()
    {
        return new Venue
        {
            Name = "", // Invalid - empty name
            Address = "X", // Invalid - too short
            Location = new Point(0, 0) { SRID = 4326 }, // Invalid - outside Gothenburg
            Type = VenueType.Restaurant,
            IsActive = true,
            IsMapped = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static Patio CreateValidPatio(int id, int venueId, string name, double quality)
    {
        // Create a patio with reasonable size (small patio ~300 sqm in Gothenburg area)
        // Area must be between 0.000001 and 0.0001 sq degrees
        // 0.0015 × 0.0015 = 0.00000225 sq degrees (safely above minimum)
        var coordinates = new[]
        {
            new Coordinate(11.9746, 57.7089),
            new Coordinate(11.9761, 57.7089),  // ~0.0015 deg east (~105m)
            new Coordinate(11.9761, 57.7104),  // ~0.0015 deg north (~165m)
            new Coordinate(11.9746, 57.7104),  // Back to start longitude
            new Coordinate(11.9746, 57.7089)   // Close the polygon
        };

        return new Patio
        {
            Id = id,
            VenueId = venueId,
            Name = name,
            Geometry = new Polygon(new LinearRing(coordinates)) { SRID = 4326 },
            PolygonQuality = quality,
            HeightSource = HeightSource.Surveyed,
            ReviewNeeded = false,
            HeightM = 2.5,
            Orientation = "South",
            Notes = "Test patio",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static Patio CreateInvalidPatio()
    {
        return new Patio
        {
            Name = "", // Invalid - empty name
            Geometry = null!, // Invalid - null geometry
            PolygonQuality = 1.5, // Invalid - outside range
            HeightSource = HeightSource.Heuristic,
            ReviewNeeded = true,
            HeightM = -5, // Invalid - negative height
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }
}