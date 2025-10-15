using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Data;
using SunnySeat.Data.Repositories;
using Xunit;
using FluentAssertions;

namespace SunnySeat.Data.Tests.Repositories;

/// <summary>
/// Integration tests for PatioRepository using in-memory database
/// </summary>
public class PatioRepositoryTests : IDisposable
{
    private readonly SunnySeatDbContext _context;
    private readonly PatioRepository _repository;
    private readonly VenueRepository _venueRepository;

    public PatioRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<SunnySeatDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new SunnySeatDbContext(options);
        _repository = new PatioRepository(_context);
        _venueRepository = new VenueRepository(_context);
    }

    [Fact]
    public async Task CreateAsync_ValidPatio_CreatesPatioSuccessfully()
    {
        // Arrange
        var venue = await CreateTestVenueAsync("Test Venue");
        var patio = CreateTestPatio(venue.Id, "Test Patio");

        // Act
        var result = await _repository.CreateAsync(patio);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().BeGreaterThan(0);
        result.Name.Should().Be("Test Patio");
        result.VenueId.Should().Be(venue.Id);
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
        result.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task GetByIdAsync_ExistingPatio_ReturnsPatioWithVenue()
    {
        // Arrange
        var venue = await CreateTestVenueAsync("Test Venue");
        var patio = CreateTestPatio(venue.Id, "Test Patio");
        await _repository.CreateAsync(patio);

        // Act
        var result = await _repository.GetByIdAsync(patio.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(patio.Id);
        result.Name.Should().Be("Test Patio");
        result.Venue.Should().NotBeNull();
        result.Venue.Name.Should().Be("Test Venue");
    }

    [Fact]
    public async Task GetByVenueIdAsync_WithMultiplePatios_ReturnsAllPatiosForVenue()
    {
        // Arrange
        var venue1 = await CreateTestVenueAsync("Venue 1");
        var venue2 = await CreateTestVenueAsync("Venue 2");
        
        var patios = new[]
        {
            CreateTestPatio(venue1.Id, "Patio 1A"),
            CreateTestPatio(venue1.Id, "Patio 1B"),
            CreateTestPatio(venue2.Id, "Patio 2A")
        };

        foreach (var patio in patios)
        {
            await _repository.CreateAsync(patio);
        }

        // Act
        var result = await _repository.GetByVenueIdAsync(venue1.Id);

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(p => p.VenueId == venue1.Id);
        result.Should().Contain(p => p.Name == "Patio 1A");
        result.Should().Contain(p => p.Name == "Patio 1B");
    }

    [Fact]
    public async Task GetPatiosRequiringReviewAsync_ReturnsPatiosNeedingReview()
    {
        // Arrange
        var venue = await CreateTestVenueAsync("Test Venue");
        
        var patios = new[]
        {
            CreateTestPatio(venue.Id, "Good Patio", 0.8, false),
            CreateTestPatio(venue.Id, "Poor Patio", 0.3, false), // Low quality, should need review
            CreateTestPatio(venue.Id, "Review Patio", 0.7, true), // Explicitly needs review
            CreateTestPatio(venue.Id, "Excellent Patio", 0.9, false)
        };

        foreach (var patio in patios)
        {
            await _repository.CreateAsync(patio);
        }

        // Act
        var result = await _repository.GetPatiosRequiringReviewAsync();

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain(p => p.Name == "Poor Patio");
        result.Should().Contain(p => p.Name == "Review Patio");
    }

    [Fact]
    public async Task GetPatiosByQualityRangeAsync_ReturnsPatiosInRange()
    {
        // Arrange
        var venue = await CreateTestVenueAsync("Test Venue");
        
        var patios = new[]
        {
            CreateTestPatio(venue.Id, "Low Quality", 0.2),
            CreateTestPatio(venue.Id, "Medium Quality", 0.6),
            CreateTestPatio(venue.Id, "High Quality", 0.9),
            CreateTestPatio(venue.Id, "Another Medium", 0.7)
        };

        foreach (var patio in patios)
        {
            await _repository.CreateAsync(patio);
        }

        // Act
        var result = await _repository.GetPatiosByQualityRangeAsync(0.5, 0.8);

        // Assert
        result.Should().HaveCount(2);
        result.Should().Contain(p => p.Name == "Medium Quality");
        result.Should().Contain(p => p.Name == "Another Medium");
        result.Should().NotContain(p => p.Name == "Low Quality");
        result.Should().NotContain(p => p.Name == "High Quality");
    }

    [Fact]
    public async Task GetPatiosByHeightSourceAsync_ReturnsPatiosWithSpecificHeightSource()
    {
        // Arrange
        var venue = await CreateTestVenueAsync("Test Venue");
        
        var patios = new[]
        {
            CreateTestPatio(venue.Id, "Surveyed Patio", heightSource: HeightSource.Surveyed),
            CreateTestPatio(venue.Id, "OSM Patio", heightSource: HeightSource.Osm),
            CreateTestPatio(venue.Id, "Heuristic Patio", heightSource: HeightSource.Heuristic),
            CreateTestPatio(venue.Id, "Another Surveyed", heightSource: HeightSource.Surveyed)
        };

        foreach (var patio in patios)
        {
            await _repository.CreateAsync(patio);
        }

        // Act
        var result = await _repository.GetPatiosByHeightSourceAsync(HeightSource.Surveyed);

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(p => p.HeightSource == HeightSource.Surveyed);
    }

    [Fact]
    public async Task UpdateAsync_ExistingPatio_UpdatesPatioSuccessfully()
    {
        // Arrange
        var venue = await CreateTestVenueAsync("Test Venue");
        var patio = CreateTestPatio(venue.Id, "Original Name");
        await _repository.CreateAsync(patio);

        patio.Name = "Updated Name";
        patio.PolygonQuality = 0.9;
        patio.ReviewNeeded = false;

        // Act
        var result = await _repository.UpdateAsync(patio);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Updated Name");
        result.PolygonQuality.Should().Be(0.9);
        result.ReviewNeeded.Should().BeFalse();
        result.UpdatedAt.Should().BeAfter(result.CreatedAt);
    }

    [Fact]
    public async Task DeleteAsync_ExistingPatio_DeletesPatioSuccessfully()
    {
        // Arrange
        var venue = await CreateTestVenueAsync("Test Venue");
        var patio = CreateTestPatio(venue.Id, "Test Patio");
        await _repository.CreateAsync(patio);

        // Act
        var result = await _repository.DeleteAsync(patio.Id);

        // Assert
        result.Should().BeTrue();

        var deletedPatio = await _repository.GetByIdAsync(patio.Id);
        deletedPatio.Should().BeNull();
    }

    [Fact]
    public async Task GetAverageQualityScoreAsync_WithMultiplePatios_ReturnsCorrectAverage()
    {
        // Arrange
        var venue = await CreateTestVenueAsync("Test Venue");
        
        var patios = new[]
        {
            CreateTestPatio(venue.Id, "Patio 1", 0.6),
            CreateTestPatio(venue.Id, "Patio 2", 0.8),
            CreateTestPatio(venue.Id, "Patio 3", 0.7)
        };

        foreach (var patio in patios)
        {
            await _repository.CreateAsync(patio);
        }

        // Act
        var result = await _repository.GetAverageQualityScoreAsync();

        // Assert
        result.Should().BeApproximately(0.7, 0.01); // (0.6 + 0.8 + 0.7) / 3 = 0.7
    }

    [Fact]
    public async Task GetAverageQualityScoreForVenueAsync_WithSpecificVenue_ReturnsVenueAverage()
    {
        // Arrange
        var venue1 = await CreateTestVenueAsync("Venue 1");
        var venue2 = await CreateTestVenueAsync("Venue 2");
        
        var patios = new[]
        {
            CreateTestPatio(venue1.Id, "Venue 1 Patio 1", 0.6),
            CreateTestPatio(venue1.Id, "Venue 1 Patio 2", 0.8),
            CreateTestPatio(venue2.Id, "Venue 2 Patio 1", 0.9)
        };

        foreach (var patio in patios)
        {
            await _repository.CreateAsync(patio);
        }

        // Act
        var result = await _repository.GetAverageQualityScoreForVenueAsync(venue1.Id);

        // Assert
        result.Should().BeApproximately(0.7, 0.01); // (0.6 + 0.8) / 2 = 0.7
    }

    [Fact]
    public async Task CountPatiosRequiringReviewAsync_ReturnsCorrectCount()
    {
        // Arrange
        var venue = await CreateTestVenueAsync("Test Venue");
        
        var patios = new[]
        {
            CreateTestPatio(venue.Id, "Good Patio", 0.8, false),
            CreateTestPatio(venue.Id, "Poor Patio", 0.3, false), // Low quality
            CreateTestPatio(venue.Id, "Review Patio", 0.7, true), // Needs review
            CreateTestPatio(venue.Id, "Excellent Patio", 0.9, false)
        };

        foreach (var patio in patios)
        {
            await _repository.CreateAsync(patio);
        }

        // Act
        var result = await _repository.CountPatiosRequiringReviewAsync();

        // Assert
        result.Should().Be(2); // Poor quality and explicit review needed
    }

    [Fact]
    public async Task BulkInsertAsync_MultiplePatios_InsertsAllPatios()
    {
        // Arrange
        var venue = await CreateTestVenueAsync("Test Venue");
        
        var patios = new[]
        {
            CreateTestPatio(venue.Id, "Patio 1"),
            CreateTestPatio(venue.Id, "Patio 2"),
            CreateTestPatio(venue.Id, "Patio 3")
        };

        // Act
        var result = await _repository.BulkInsertAsync(patios);

        // Assert
        result.Should().Be(3);

        var allPatios = await _repository.GetAllAsync();
        allPatios.Should().HaveCount(3);
    }

    [Fact]
    public async Task CountByVenueAsync_WithSpecificVenue_ReturnsCorrectCount()
    {
        // Arrange
        var venue1 = await CreateTestVenueAsync("Venue 1");
        var venue2 = await CreateTestVenueAsync("Venue 2");
        
        var patios = new[]
        {
            CreateTestPatio(venue1.Id, "Venue 1 Patio 1"),
            CreateTestPatio(venue1.Id, "Venue 1 Patio 2"),
            CreateTestPatio(venue2.Id, "Venue 2 Patio 1")
        };

        foreach (var patio in patios)
        {
            await _repository.CreateAsync(patio);
        }

        // Act
        var result = await _repository.CountByVenueAsync(venue1.Id);

        // Assert
        result.Should().Be(2);
    }

    private async Task<Venue> CreateTestVenueAsync(string name)
    {
        var venue = new Venue
        {
            Name = name,
            Address = $"{name} Address, Göteborg",
            Location = new Point(11.9746, 57.7089) { SRID = 4326 },
            Type = VenueType.Restaurant,
            IsActive = true,
            IsMapped = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        return await _venueRepository.CreateAsync(venue);
    }

    private static Patio CreateTestPatio(int venueId, string name, double quality = 0.7, bool reviewNeeded = false, HeightSource heightSource = HeightSource.Heuristic)
    {
        var coordinates = new[]
        {
            new Coordinate(11.9746, 57.7089),
            new Coordinate(11.9747, 57.7089),
            new Coordinate(11.9747, 57.7090),
            new Coordinate(11.9746, 57.7090),
            new Coordinate(11.9746, 57.7089)
        };

        return new Patio
        {
            VenueId = venueId,
            Name = name,
            Geometry = new Polygon(new LinearRing(coordinates)) { SRID = 4326 },
            PolygonQuality = quality,
            HeightSource = heightSource,
            ReviewNeeded = reviewNeeded,
            HeightM = 2.0,
            Orientation = "South",
            Notes = $"Test patio {name}",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}