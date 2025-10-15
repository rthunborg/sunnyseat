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
/// Unit tests for VenueService
/// </summary>
public class VenueServiceTests
{
    private readonly Mock<IVenueRepository> _mockVenueRepository;
    private readonly Mock<IPatioRepository> _mockPatioRepository;
    private readonly Mock<IDataQualityService> _mockDataQualityService;
    private readonly VenueService _venueService;

    public VenueServiceTests()
    {
        _mockVenueRepository = new Mock<IVenueRepository>();
        _mockPatioRepository = new Mock<IPatioRepository>();
        _mockDataQualityService = new Mock<IDataQualityService>();

        _venueService = new VenueService(
            _mockVenueRepository.Object,
            _mockPatioRepository.Object,
            _mockDataQualityService.Object);
    }

    [Fact]
    public async Task GetVenueByIdAsync_ExistingVenue_ReturnsVenue()
    {
        // Arrange
        var venueId = 1;
        var expectedVenue = CreateTestVenue(venueId, "Test Venue");

        _mockVenueRepository.Setup(r => r.GetByIdAsync(venueId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedVenue);

        // Act
        var result = await _venueService.GetVenueByIdAsync(venueId);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(venueId);
        result.Name.Should().Be("Test Venue");
    }

    [Fact]
    public async Task GetVenueByIdAsync_NonExistingVenue_ReturnsNull()
    {
        // Arrange
        var venueId = 999;

        _mockVenueRepository.Setup(r => r.GetByIdAsync(venueId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Venue?)null);

        // Act
        var result = await _venueService.GetVenueByIdAsync(venueId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task CreateVenueAsync_ValidVenue_ReturnsCreatedVenue()
    {
        // Arrange
        var venue = CreateTestVenue(0, "New Venue");
        var createdVenue = CreateTestVenue(1, "New Venue");

        _mockDataQualityService.Setup(s => s.ValidateVenueAsync(venue))
            .ReturnsAsync(true);

        _mockVenueRepository.Setup(r => r.CreateAsync(venue, It.IsAny<CancellationToken>()))
            .ReturnsAsync(createdVenue);

        // Act
        var result = await _venueService.CreateVenueAsync(venue);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(1);
        result.Name.Should().Be("New Venue");
    }

    [Fact]
    public async Task CreateVenueAsync_InvalidVenue_ThrowsArgumentException()
    {
        // Arrange - Create venue with invalid data that will fail VenueValidator
        var venue = new Venue
        {
            Id = 0,
            Name = "X", // Invalid: too short (< 2 chars)
            Address = "Abc", // Invalid: too short (< 5 chars)
            Location = new Point(0, 0) { SRID = 4326 }, // Invalid: outside Gothenburg bounds
            IsMapped = false
        };

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => _venueService.CreateVenueAsync(venue));

        exception.Message.Should().Contain("Venue validation failed");
    }

    [Fact]
    public async Task SearchVenuesAsync_WithSearchTerm_ReturnsMatchingVenues()
    {
        // Arrange
        var searchTerm = "cafe";
        var nameResults = new List<Venue> { CreateTestVenue(1, "Cafe Central") };
        var addressResults = new List<Venue> { CreateTestVenue(2, "Restaurant", "Cafe Street 1") };

        _mockVenueRepository.Setup(r => r.SearchByNameAsync(searchTerm, It.IsAny<CancellationToken>()))
            .ReturnsAsync(nameResults);

        _mockVenueRepository.Setup(r => r.SearchByAddressAsync(searchTerm, It.IsAny<CancellationToken>()))
            .ReturnsAsync(addressResults);

        // Act
        var result = await _venueService.SearchVenuesAsync(searchTerm);

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain(v => v.Name == "Cafe Central");
        result.Should().Contain(v => v.Address == "Cafe Street 1");
    }

    [Fact]
    public async Task GetUnmappedVenuesAsync_ReturnsUnmappedVenues()
    {
        // Arrange
        var unmappedVenues = new List<Venue>
        {
            CreateTestVenue(1, "Unmapped Venue 1", isMapped: false),
            CreateTestVenue(2, "Unmapped Venue 2", isMapped: false)
        };

        _mockVenueRepository.Setup(r => r.GetUnmappedVenuesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(unmappedVenues);

        // Act
        var result = await _venueService.GetUnmappedVenuesAsync();

        // Assert
        result.Should().HaveCount(2);
        result.Should().AllSatisfy(v => v.IsMapped.Should().BeFalse());
    }

    [Fact]
    public async Task CreatePatioAsync_ValidPatio_ReturnsCreatedPatio()
    {
        // Arrange
        var venueId = 1;
        var venue = CreateTestVenue(venueId, "Test Venue");
        var patio = CreateTestPatio(0, venueId, "Test Patio");
        var createdPatio = CreateTestPatio(1, venueId, "Test Patio");

        _mockVenueRepository.Setup(r => r.GetByIdAsync(venueId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(venue);

        _mockDataQualityService.Setup(s => s.ValidatePatioAsync(patio))
            .ReturnsAsync(true);

        _mockPatioRepository.Setup(r => r.CreateAsync(patio, It.IsAny<CancellationToken>()))
            .ReturnsAsync(createdPatio);

        // Act
        var result = await _venueService.CreatePatioAsync(venueId, patio);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().Be(1);
        result.VenueId.Should().Be(venueId);
        result.Name.Should().Be("Test Patio");

        // Verify that venue mapping status is updated
        _mockVenueRepository.Verify(r => r.UpdateAsync(It.Is<Venue>(v => v.IsMapped == true), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreatePatioAsync_VenueNotFound_ThrowsArgumentException()
    {
        // Arrange
        var venueId = 999;
        var patio = CreateTestPatio(0, venueId, "Test Patio");

        _mockVenueRepository.Setup(r => r.GetByIdAsync(venueId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Venue?)null);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<ArgumentException>(
            () => _venueService.CreatePatioAsync(venueId, patio));

        exception.Message.Should().Contain($"Venue with ID {venueId} not found");
    }

    [Fact]
    public async Task ImportVenuesAsync_ValidVenues_ReturnsImportedCount()
    {
        // Arrange - Create 2 valid venues and 1 invalid
        var venues = new List<Venue>
        {
            CreateTestVenue(0, "Venue 1"), // Valid
            CreateTestVenue(0, "Venue 2"), // Valid
            new Venue  // Invalid: short name and address
            {
                Id = 0,
                Name = "X",
                Address = "Abc",
                Location = new Point(11.9, 57.7) { SRID = 4326 },
                IsMapped = false
            }
        };

        _mockVenueRepository.Setup(r => r.BulkInsertAsync(It.IsAny<IEnumerable<Venue>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IEnumerable<Venue> v, CancellationToken _) => v.Count());

        // Act
        var result = await _venueService.ImportVenuesAsync(venues);

        // Assert - Should only import the 2 valid venues
        result.Should().Be(2);
        _mockVenueRepository.Verify(r => r.BulkInsertAsync(
            It.Is<IEnumerable<Venue>>(v => v.Count() == 2),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    private static Venue CreateTestVenue(int id, string name, string address = "Test Address", bool isMapped = false)
    {
        return new Venue
        {
            Id = id,
            Name = name,
            Address = address,
            Location = new Point(11.9746, 57.7089) { SRID = 4326 }, // Gothenburg coordinates
            Type = VenueType.Restaurant,
            IsActive = true,
            IsMapped = isMapped,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private static Patio CreateTestPatio(int id, int venueId, string name)
    {
        var coordinates = new[]
        {
            new Coordinate(11.9746, 57.7089),
            new Coordinate(11.9747, 57.7089),
            new Coordinate(11.9747, 57.7090),
            new Coordinate(11.9746, 57.7090),
            new Coordinate(11.9746, 57.7089) // Close the polygon
        };

        return new Patio
        {
            Id = id,
            VenueId = venueId,
            Name = name,
            Geometry = new Polygon(new LinearRing(coordinates)) { SRID = 4326 },
            PolygonQuality = 0.8,
            HeightSource = HeightSource.Heuristic,
            ReviewNeeded = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }
}