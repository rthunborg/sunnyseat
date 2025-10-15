using Microsoft.Extensions.Logging;
using Moq;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Services;
using Xunit;
using FluentAssertions;

namespace SunnySeat.Core.Tests.Services;

/// <summary>
/// Unit tests for VenueBuildingIntegrationService
/// </summary>
public class VenueBuildingIntegrationServiceTests
{
    private readonly Mock<IVenueService> _mockVenueService;
    private readonly Mock<IBuildingRepository> _mockBuildingRepository;
    private readonly Mock<ILogger<VenueBuildingIntegrationService>> _mockLogger;
    private readonly VenueBuildingIntegrationService _integrationService;

    public VenueBuildingIntegrationServiceTests()
    {
        _mockVenueService = new Mock<IVenueService>();
        _mockBuildingRepository = new Mock<IBuildingRepository>();
        _mockLogger = new Mock<ILogger<VenueBuildingIntegrationService>>();

        _integrationService = new VenueBuildingIntegrationService(
            _mockVenueService.Object,
            _mockBuildingRepository.Object,
            _mockLogger.Object);
    }

    [Fact]
    public async Task CreateSamplePatiosForVenuesAsync_WithNearbyBuildings_CreatesPatiosBasedOnBuildings()
    {
        // Arrange
        var unmappedVenues = new List<Venue>
        {
            CreateTestVenue(1, "Test Venue 1", 11.9746, 57.7089, false),
            CreateTestVenue(2, "Test Venue 2", 11.9750, 57.7092, false)
        };

        var allVenues = unmappedVenues.Concat(new[]
        {
            CreateTestVenue(3, "Mapped Venue", 11.9740, 57.7088, true)
        });

        var nearbyBuildings = new List<Building>
        {
            CreateTestBuilding(1, 11.9746, 57.7089),
            CreateTestBuilding(2, 11.9750, 57.7092)
        };

        _mockVenueService.Setup(s => s.GetAllVenuesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(allVenues);

        _mockBuildingRepository.Setup(r => r.GetBuildingsNearPointAsync(It.IsAny<Point>(), 0.05, It.IsAny<CancellationToken>()))
            .ReturnsAsync(nearbyBuildings);

        _mockVenueService.Setup(s => s.CreatePatioAsync(It.IsAny<int>(), It.IsAny<Patio>(), It.IsAny<CancellationToken>()))
            .Returns<int, Patio, CancellationToken>((venueId, patio, ct) =>
            {
                patio.Id = venueId * 10; // Simple ID assignment
                return Task.FromResult(patio);
            });

        // Act
        var result = await _integrationService.CreateSamplePatiosForVenuesAsync();

        // Assert
        result.Should().Be(2); // Only unmapped venues should get patios

        _mockVenueService.Verify(s => s.CreatePatioAsync(1, It.IsAny<Patio>(), It.IsAny<CancellationToken>()), Times.Once);
        _mockVenueService.Verify(s => s.CreatePatioAsync(2, It.IsAny<Patio>(), It.IsAny<CancellationToken>()), Times.Once);
        _mockVenueService.Verify(s => s.CreatePatioAsync(3, It.IsAny<Patio>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateSamplePatiosForVenuesAsync_WithoutNearbyBuildings_CreatesGenericPatios()
    {
        // Arrange
        var unmappedVenues = new List<Venue>
        {
            CreateTestVenue(1, "Test Venue", 11.9746, 57.7089, false)
        };

        _mockVenueService.Setup(s => s.GetAllVenuesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(unmappedVenues);

        _mockBuildingRepository.Setup(r => r.GetBuildingsNearPointAsync(It.IsAny<Point>(), 0.05, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Building>()); // No nearby buildings

        _mockVenueService.Setup(s => s.CreatePatioAsync(It.IsAny<int>(), It.IsAny<Patio>(), It.IsAny<CancellationToken>()))
            .Returns<int, Patio, CancellationToken>((venueId, patio, ct) =>
            {
                patio.Id = venueId * 10;
                return Task.FromResult(patio);
            });

        // Act
        var result = await _integrationService.CreateSamplePatiosForVenuesAsync();

        // Assert
        result.Should().Be(1);

        _mockVenueService.Verify(s => s.CreatePatioAsync(1,
            It.Is<Patio>(p => p.Notes != null && p.Notes.Contains("Generic patio created")),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateSamplePatiosForVenuesAsync_WithPatioCreationFailure_ContinuesWithOtherVenues()
    {
        // Arrange
        var unmappedVenues = new List<Venue>
        {
            CreateTestVenue(1, "Test Venue 1", 11.9746, 57.7089, false),
            CreateTestVenue(2, "Test Venue 2", 11.9750, 57.7092, false)
        };

        _mockVenueService.Setup(s => s.GetAllVenuesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(unmappedVenues);

        _mockBuildingRepository.Setup(r => r.GetBuildingsNearPointAsync(It.IsAny<Point>(), 0.05, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Building>());

        var callCount = 0;

        // First venue fails, second succeeds
        _mockVenueService.Setup(s => s.CreatePatioAsync(It.IsAny<int>(), It.IsAny<Patio>(), It.IsAny<CancellationToken>()))
            .Returns<int, Patio, CancellationToken>((venueId, patio, ct) =>
            {
                callCount++;
                if (callCount == 1)
                {
                    throw new ArgumentException("Invalid patio data");
                }
                patio.Id = venueId * 10;
                return Task.FromResult(patio);
            });

        // Act
        var result = await _integrationService.CreateSamplePatiosForVenuesAsync();

        // Assert
        result.Should().Be(1); // Only one patio created successfully

        _mockVenueService.Verify(s => s.CreatePatioAsync(It.IsAny<int>(), It.IsAny<Patio>(), It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    [Fact]
    public async Task ValidateVenueLocationsAsync_ValidatesAllVenues()
    {
        // Arrange
        var venues = new List<Venue>
        {
            CreateTestVenue(1, "Test Venue 1", 11.9746, 57.7089, false),
            CreateTestVenue(2, "Test Venue 2", 11.9750, 57.7092, false),
            CreateTestVenue(3, "Test Venue 3", 11.9740, 57.7088, true)
        };

        _mockVenueService.Setup(s => s.GetAllVenuesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(venues);

        // First venue has nearby buildings, others don't
        _mockBuildingRepository.SetupSequence(r => r.GetBuildingsNearPointAsync(It.IsAny<Point>(), 0.01, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Building> { CreateTestBuilding(1, 11.9746, 57.7089) })
            .ReturnsAsync(new List<Building>())
            .ReturnsAsync(new List<Building>());

        // Act
        var result = await _integrationService.ValidateVenueLocationsAsync();

        // Assert
        result.Should().Be(3); // All venues validated

        _mockVenueService.Verify(s => s.GetAllVenuesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _mockBuildingRepository.Verify(r => r.GetBuildingsNearPointAsync(It.IsAny<Point>(), 0.01, It.IsAny<CancellationToken>()), Times.Exactly(3));
    }

    [Fact]
    public async Task ValidateVenueLocationsAsync_WithValidationFailure_ContinuesWithOtherVenues()
    {
        // Arrange
        var venues = new List<Venue>
        {
            CreateTestVenue(1, "Test Venue 1", 11.9746, 57.7089, false),
            CreateTestVenue(2, "Test Venue 2", 11.9750, 57.7092, false)
        };

        _mockVenueService.Setup(s => s.GetAllVenuesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(venues);

        // First query fails, second succeeds
        _mockBuildingRepository.SetupSequence(r => r.GetBuildingsNearPointAsync(It.IsAny<Point>(), 0.01, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Database error"))
            .ReturnsAsync(new List<Building>());

        // Act
        var result = await _integrationService.ValidateVenueLocationsAsync();

        // Assert
        // Only 1 venue successfully validated (the second one)
        result.Should().Be(1);

        _mockBuildingRepository.Verify(r => r.GetBuildingsNearPointAsync(It.IsAny<Point>(), 0.01, It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    [Fact]
    public async Task CreateSamplePatiosForVenuesAsync_ProcessesLimitedNumberOfVenues()
    {
        // Arrange
        var unmappedVenues = Enumerable.Range(1, 25)
            .Select(i => CreateTestVenue(i, $"Test Venue {i}", 11.9746 + i * 0.001, 57.7089 + i * 0.001, false))
            .ToList();

        _mockVenueService.Setup(s => s.GetAllVenuesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(unmappedVenues);

        _mockBuildingRepository.Setup(r => r.GetBuildingsNearPointAsync(It.IsAny<Point>(), 0.05, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<Building>());

        _mockVenueService.Setup(s => s.CreatePatioAsync(It.IsAny<int>(), It.IsAny<Patio>(), It.IsAny<CancellationToken>()))
            .Returns<int, Patio, CancellationToken>((venueId, patio, ct) =>
            {
                patio.Id = venueId * 10;
                return Task.FromResult(patio);
            });

        // Act
        var result = await _integrationService.CreateSamplePatiosForVenuesAsync();

        // Assert
        result.Should().Be(20); // Should process only first 20 venues

        _mockVenueService.Verify(s => s.CreatePatioAsync(It.IsAny<int>(), It.IsAny<Patio>(), It.IsAny<CancellationToken>()), Times.Exactly(20));
    }

    private static Venue CreateTestVenue(int id, string name, double longitude, double latitude, bool isMapped)
    {
        return new Venue
        {
            Id = id,
            Name = name,
            Address = $"Test Address {id}, G�teborg",
            Location = new Point(longitude, latitude) { SRID = 4326 },
            Type = VenueType.Restaurant,
            IsActive = true,
            IsMapped = isMapped,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static Building CreateTestBuilding(int id, double longitude, double latitude)
    {
        var coordinates = new[]
        {
            new Coordinate(longitude - 0.0001, latitude - 0.0001),
            new Coordinate(longitude + 0.0001, latitude - 0.0001),
            new Coordinate(longitude + 0.0001, latitude + 0.0001),
            new Coordinate(longitude - 0.0001, latitude + 0.0001),
            new Coordinate(longitude - 0.0001, latitude - 0.0001)
        };

        return new Building
        {
            Id = id,
            ExternalId = $"test_building_{id}",
            Source = "test",
            Geometry = new Polygon(new LinearRing(coordinates)) { SRID = 4326 },
            Height = 10.0,
            CreatedAt = DateTime.UtcNow
        };
    }
}