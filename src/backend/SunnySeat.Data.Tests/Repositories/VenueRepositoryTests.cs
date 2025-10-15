using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Data;
using SunnySeat.Data.Repositories;
using Xunit;
using FluentAssertions;

namespace SunnySeat.Data.Tests.Repositories;

/// <summary>
/// Integration tests for VenueRepository using in-memory database
/// </summary>
public class VenueRepositoryTests : IDisposable
{
    private readonly SunnySeatDbContext _context;
    private readonly VenueRepository _repository;

    public VenueRepositoryTests()
    {
        var options = new DbContextOptionsBuilder<SunnySeatDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new SunnySeatDbContext(options);
        _repository = new VenueRepository(_context);
    }

    [Fact]
    public async Task CreateAsync_ValidVenue_CreatesVenueSuccessfully()
    {
        // Arrange
        var venue = CreateTestVenue("Test Venue", "Test Address, Göteborg");

        // Act
        var result = await _repository.CreateAsync(venue);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().BeGreaterThan(0);
        result.Name.Should().Be("Test Venue");
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
        result.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task GetByIdAsync_ExistingVenue_ReturnsVenue()
    {
        // Arrange
        var venue = CreateTestVenue("Test Venue", "Test Address, Göteborg");
        await _repository.CreateAsync(venue);

        // Act
        var result = await _repository.GetByIdAsync(venue.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(venue.Id);
        result.Name.Should().Be("Test Venue");
    }

    [Fact]
    public async Task GetByIdAsync_NonExistingVenue_ReturnsNull()
    {
        // Act
        var result = await _repository.GetByIdAsync(999);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task SearchByNameAsync_WithMatchingName_ReturnsMatchingVenues()
    {
        // Arrange
        var venues = new[]
        {
            CreateTestVenue("Café Central", "Address 1, Göteborg"),
            CreateTestVenue("Restaurant Roma", "Address 2, Göteborg"),
            CreateTestVenue("Café Corner", "Address 3, Göteborg")
        };

        foreach (var venue in venues)
        {
            await _repository.CreateAsync(venue);
        }

        // Act
        var result = await _repository.SearchByNameAsync("café");

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(v => v.Name.ToLower().Contains("café"));
    }

    [Fact]
    public async Task SearchByAddressAsync_WithMatchingAddress_ReturnsMatchingVenues()
    {
        // Arrange
        var venues = new[]
        {
            CreateTestVenue("Venue 1", "Kungsgatan 1, Göteborg"),
            CreateTestVenue("Venue 2", "Avenyn 2, Göteborg"),
            CreateTestVenue("Venue 3", "Kungsgatan 3, Göteborg")
        };

        foreach (var venue in venues)
        {
            await _repository.CreateAsync(venue);
        }

        // Act
        var result = await _repository.SearchByAddressAsync("kungsgatan");

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(v => v.Address.ToLower().Contains("kungsgatan"));
    }

    [Fact]
    public async Task GetByTypeAsync_WithSpecificType_ReturnsVenuesOfThatType()
    {
        // Arrange
        var venues = new[]
        {
            CreateTestVenue("Restaurant 1", "Address 1, Göteborg", VenueType.Restaurant),
            CreateTestVenue("Café 1", "Address 2, Göteborg", VenueType.Cafe),
            CreateTestVenue("Restaurant 2", "Address 3, Göteborg", VenueType.Restaurant),
            CreateTestVenue("Bar 1", "Address 4, Göteborg", VenueType.Bar)
        };

        foreach (var venue in venues)
        {
            await _repository.CreateAsync(venue);
        }

        // Act
        var result = await _repository.GetByTypeAsync(VenueType.Restaurant);

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(v => v.Type == VenueType.Restaurant);
    }

    [Fact]
    public async Task GetUnmappedVenuesAsync_ReturnsOnlyUnmappedVenues()
    {
        // Arrange
        var venues = new[]
        {
            CreateTestVenue("Mapped Venue", "Address 1, Göteborg", isMapped: true),
            CreateTestVenue("Unmapped Venue 1", "Address 2, Göteborg", isMapped: false),
            CreateTestVenue("Unmapped Venue 2", "Address 3, Göteborg", isMapped: false)
        };

        foreach (var venue in venues)
        {
            await _repository.CreateAsync(venue);
        }

        // Act
        var result = await _repository.GetUnmappedVenuesAsync();

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(v => !v.IsMapped);
    }

    [Fact]
    public async Task UpdateAsync_ExistingVenue_UpdatesVenueSuccessfully()
    {
        // Arrange
        var venue = CreateTestVenue("Original Name", "Original Address, Göteborg");
        await _repository.CreateAsync(venue);

        venue.Name = "Updated Name";
        venue.Address = "Updated Address, Göteborg";

        // Act
        var result = await _repository.UpdateAsync(venue);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Updated Name");
        result.Address.Should().Be("Updated Address, Göteborg");
        result.UpdatedAt.Should().BeAfter(result.CreatedAt);
    }

    [Fact]
    public async Task DeleteAsync_ExistingVenue_DeletesVenueSuccessfully()
    {
        // Arrange
        var venue = CreateTestVenue("Test Venue", "Test Address, Göteborg");
        await _repository.CreateAsync(venue);

        // Act
        var result = await _repository.DeleteAsync(venue.Id);

        // Assert
        result.Should().BeTrue();

        var deletedVenue = await _repository.GetByIdAsync(venue.Id);
        deletedVenue.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_NonExistingVenue_ReturnsFalse()
    {
        // Act
        var result = await _repository.DeleteAsync(999);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task ExistsAsync_ExistingVenue_ReturnsTrue()
    {
        // Arrange
        var venue = CreateTestVenue("Test Venue", "Test Address, Göteborg");
        await _repository.CreateAsync(venue);

        // Act
        var result = await _repository.ExistsAsync(venue.Id);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task ExistsAsync_NonExistingVenue_ReturnsFalse()
    {
        // Act
        var result = await _repository.ExistsAsync(999);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task BulkInsertAsync_MultipleVenues_InsertsAllVenues()
    {
        // Arrange
        var venues = new[]
        {
            CreateTestVenue("Venue 1", "Address 1, Göteborg"),
            CreateTestVenue("Venue 2", "Address 2, Göteborg"),
            CreateTestVenue("Venue 3", "Address 3, Göteborg")
        };

        // Act
        var result = await _repository.BulkInsertAsync(venues);

        // Assert
        result.Should().Be(3);

        var allVenues = await _repository.GetAllAsync();
        allVenues.Should().HaveCount(3);
    }

    [Fact]
    public async Task CountAsync_WithVenues_ReturnsCorrectCount()
    {
        // Arrange
        var venues = new[]
        {
            CreateTestVenue("Venue 1", "Address 1, Göteborg"),
            CreateTestVenue("Venue 2", "Address 2, Göteborg")
        };

        foreach (var venue in venues)
        {
            await _repository.CreateAsync(venue);
        }

        // Act
        var result = await _repository.CountAsync();

        // Assert
        result.Should().Be(2);
    }

    [Fact]
    public async Task CountByTypeAsync_WithSpecificType_ReturnsCorrectCount()
    {
        // Arrange
        var venues = new[]
        {
            CreateTestVenue("Restaurant 1", "Address 1, Göteborg", VenueType.Restaurant),
            CreateTestVenue("Café 1", "Address 2, Göteborg", VenueType.Cafe),
            CreateTestVenue("Restaurant 2", "Address 3, Göteborg", VenueType.Restaurant)
        };

        foreach (var venue in venues)
        {
            await _repository.CreateAsync(venue);
        }

        // Act
        var result = await _repository.CountByTypeAsync(VenueType.Restaurant);

        // Assert
        result.Should().Be(2);
    }

    [Fact]
    public async Task GetActiveVenuesAsync_ReturnsOnlyActiveVenues()
    {
        // Arrange
        var venues = new[]
        {
            CreateTestVenue("Active Venue 1", "Address 1, Göteborg", isActive: true),
            CreateTestVenue("Inactive Venue", "Address 2, Göteborg", isActive: false),
            CreateTestVenue("Active Venue 2", "Address 3, Göteborg", isActive: true)
        };

        foreach (var venue in venues)
        {
            await _repository.CreateAsync(venue);
        }

        // Act
        var result = await _repository.GetActiveVenuesAsync();

        // Assert
        result.Should().HaveCount(2);
        result.Should().OnlyContain(v => v.IsActive);
    }

    private static Venue CreateTestVenue(string name, string address, VenueType type = VenueType.Restaurant, bool isMapped = false, bool isActive = true)
    {
        return new Venue
        {
            Name = name,
            Address = address,
            Location = new Point(11.9746, 57.7089) { SRID = 4326 },
            Type = type,
            IsActive = isActive,
            IsMapped = isMapped,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}