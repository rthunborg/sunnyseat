using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Services;
using System.Text;
using System.Text.Json;
using Xunit;

namespace SunnySeat.Core.Tests.Services;

/// <summary>
/// Unit tests for MultiLayerCacheService
/// </summary>
public class MultiLayerCacheServiceTests
{
    private readonly Mock<IMemoryCache> _mockMemoryCache;
    private readonly Mock<IDistributedCache> _mockDistributedCache;
    private readonly Mock<IPrecomputationRepository> _mockPrecomputationRepository;
    private readonly MultiLayerCacheService _cacheService;

    public MultiLayerCacheServiceTests()
    {
        _mockMemoryCache = new Mock<IMemoryCache>();
        _mockDistributedCache = new Mock<IDistributedCache>();
        _mockPrecomputationRepository = new Mock<IPrecomputationRepository>();

        _cacheService = new MultiLayerCacheService(
            _mockMemoryCache.Object,
            _mockDistributedCache.Object,
            _mockPrecomputationRepository.Object,
            NullLogger<MultiLayerCacheService>.Instance);
    }

    [Fact]
    public async Task GetCachedSunExposureAsync_MemoryCacheHit_ReturnsFromMemory()
    {
        // Arrange
        var patioId = 1;
        var timestamp = DateTime.UtcNow;
        var expectedExposure = CreateTestSunExposure(patioId, timestamp);

        _mockMemoryCache.Setup(x => x.TryGetValue(It.IsAny<string>(), out It.Ref<object>.IsAny))
            .Returns((string key, out object value) =>
            {
                value = expectedExposure;
                return true;
            });

        // Act
        var result = await _cacheService.GetCachedSunExposureAsync(patioId, timestamp);

        // Assert
        result.Should().Be(expectedExposure);
        // Verify distributed cache was not called (use GetAsync instead of GetStringAsync)
        _mockDistributedCache.Verify(x => x.GetAsync(It.IsAny<string>(), default), Times.Never);
    }

    [Fact]
    public async Task GetCachedSunExposureAsync_DistributedCacheHit_ReturnsFromDistributedAndWarmsMemory()
    {
        // Arrange
        var patioId = 1;
        var timestamp = DateTime.UtcNow;
        var expectedExposure = CreateTestSunExposure(patioId, timestamp);
        var serializedExposure = JsonSerializer.Serialize(expectedExposure);
        var serializedBytes = Encoding.UTF8.GetBytes(serializedExposure);

        // Memory cache miss
        _mockMemoryCache.Setup(x => x.TryGetValue(It.IsAny<string>(), out It.Ref<object>.IsAny))
            .Returns(false);

        // Mock CreateEntry for Set method (warming memory cache)
        var mockCacheEntry = new Mock<ICacheEntry>();
        mockCacheEntry.SetupProperty(e => e.Value);
        mockCacheEntry.SetupProperty(e => e.AbsoluteExpirationRelativeToNow);
        _mockMemoryCache.Setup(x => x.CreateEntry(It.IsAny<object>()))
            .Returns(mockCacheEntry.Object);

        // Distributed cache hit - use GetAsync instead of GetStringAsync
        _mockDistributedCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync(serializedBytes);

        // Act
        var result = await _cacheService.GetCachedSunExposureAsync(patioId, timestamp);

        // Assert
        result.Should().NotBeNull();
        result!.PatioId.Should().Be(patioId);

        // Should warm memory cache
        _mockMemoryCache.Verify(x => x.CreateEntry(It.IsAny<object>()), Times.Once);
    }

    [Fact]
    public async Task GetCachedSunExposureAsync_PrecomputedHit_ReturnsReconstructedData()
    {
        // Arrange
        var patioId = 1;
        var timestamp = DateTime.UtcNow;
        var precomputedData = CreateTestPrecomputedData(patioId, timestamp);

        // Memory cache miss
        _mockMemoryCache.Setup(x => x.TryGetValue(It.IsAny<string>(), out It.Ref<object>.IsAny))
            .Returns(false);

        // Distributed cache miss - use GetAsync
        _mockDistributedCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync((byte[]?)null);

        // Precomputed cache hit
        _mockPrecomputationRepository.Setup(x => x.GetPrecomputedSunExposureAsync(patioId, timestamp, 5, default))
            .ReturnsAsync(precomputedData);

        // Act
        var result = await _cacheService.GetCachedSunExposureAsync(patioId, timestamp);

        // Assert
        result.Should().NotBeNull();
        result!.PatioId.Should().Be(patioId);
        result.SunExposurePercent.Should().Be(precomputedData.SunExposurePercent);
        result.State.Should().Be(precomputedData.State);
    }

    [Fact]
    public async Task GetCachedSunExposureAsync_AllCachesMiss_ReturnsNull()
    {
        // Arrange
        var patioId = 1;
        var timestamp = DateTime.UtcNow;

        // All caches miss
        _mockMemoryCache.Setup(x => x.TryGetValue(It.IsAny<string>(), out It.Ref<object>.IsAny))
            .Returns(false);
        _mockDistributedCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync((byte[]?)null);
        _mockPrecomputationRepository.Setup(x => x.GetPrecomputedSunExposureAsync(patioId, timestamp, 5, default))
            .ReturnsAsync((PrecomputedSunExposure?)null);

        // Act
        var result = await _cacheService.GetCachedSunExposureAsync(patioId, timestamp);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task SetCachedSunExposureAsync_ValidData_DoesNotThrow()
    {
        // Arrange
        var exposure = CreateTestSunExposure(1, DateTime.UtcNow);

        // Act & Assert - Just verify it doesn't throw
        var act = async () => await _cacheService.SetCachedSunExposureAsync(exposure);
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task GetBatchCachedSunExposureAsync_MultiplePatios_ReturnsAvailableData()
    {
        // Arrange
        var patioIds = new[] { 1, 2, 3 };
        var timestamp = DateTime.UtcNow;
        var exposure1 = CreateTestSunExposure(1, timestamp);
        var exposure3 = CreateTestSunExposure(3, timestamp);

        // Setup cache to return data for patios 1 and 3, but miss for patio 2
        _mockMemoryCache.Setup(x => x.TryGetValue(It.Is<string>(k => k.Contains(":1:")), out It.Ref<object>.IsAny))
            .Returns((string key, out object value) =>
            {
                value = exposure1;
                return true;
            });

        _mockMemoryCache.Setup(x => x.TryGetValue(It.Is<string>(k => k.Contains(":2:")), out It.Ref<object>.IsAny))
            .Returns(false);

        _mockMemoryCache.Setup(x => x.TryGetValue(It.Is<string>(k => k.Contains(":3:")), out It.Ref<object>.IsAny))
            .Returns((string key, out object value) =>
            {
                value = exposure3;
                return true;
            });

        // Act
        var results = await _cacheService.GetBatchCachedSunExposureAsync(patioIds, timestamp);

        // Assert
        results.Should().HaveCount(2);
        results.Should().ContainKey(1);
        results.Should().ContainKey(3);
        results.Should().NotContainKey(2);

        results[1].Should().Be(exposure1);
        results[3].Should().Be(exposure3);
    }

    [Fact]
    public async Task InvalidateCacheAsync_ValidPatio_CompletesSuccessfully()
    {
        // Arrange
        var patioId = 1;
        var date = DateOnly.FromDateTime(DateTime.Today);

        // Act & Assert - Just verify it doesn't throw
        var act = async () => await _cacheService.InvalidateCacheAsync(patioId, date);
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task GetCacheMetricsAsync_ReturnsValidMetrics()
    {
        // Act
        var metrics = await _cacheService.GetCacheMetricsAsync();

        // Assert
        metrics.Should().NotBeNull();
        metrics.HitRate.Should().BeGreaterOrEqualTo(0.0);
        metrics.HitRate.Should().BeLessOrEqualTo(1.0);
        metrics.TotalRequests.Should().BeGreaterOrEqualTo(0);
        metrics.CollectedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task GetCacheHealthAsync_HealthyCache_ReturnsHealthyStatus()
    {
        // Arrange - mock CreateEntry for Set method
        var mockCacheEntry = new Mock<ICacheEntry>();
        mockCacheEntry.SetupProperty(e => e.Value);
        mockCacheEntry.SetupProperty(e => e.AbsoluteExpirationRelativeToNow);

        _mockMemoryCache.Setup(x => x.CreateEntry(It.IsAny<object>()))
            .Returns(mockCacheEntry.Object);

        // Setup TryGetValue to return true (memory cache works)
        object? cachedValue = "test";
        _mockMemoryCache.Setup(x => x.TryGetValue(It.IsAny<string>(), out cachedValue!))
            .Returns(true);

        // Setup distributed cache
        _mockDistributedCache.Setup(x => x.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(), It.IsAny<DistributedCacheEntryOptions>(), default))
            .Returns(Task.CompletedTask);
        _mockDistributedCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync(Encoding.UTF8.GetBytes("test"));

        // Act
        var health = await _cacheService.GetCacheHealthAsync();

        // Assert
        health.Should().NotBeNull();
        health.MemoryCacheHealth.IsAvailable.Should().BeTrue();
        health.DistributedCacheHealth.IsAvailable.Should().BeTrue();
        health.Status.Should().Be(CacheHealthStatus.Healthy);
        health.IsConfiguredCorrectly.Should().BeTrue();
    }

    [Fact]
    public async Task GetCacheHealthAsync_UnhealthyDistributedCache_ReturnsDegradedStatus()
    {
        // Arrange - mock CreateEntry for Set method
        var mockCacheEntry = new Mock<ICacheEntry>();
        mockCacheEntry.SetupProperty(e => e.Value);
        mockCacheEntry.SetupProperty(e => e.AbsoluteExpirationRelativeToNow);

        _mockMemoryCache.Setup(x => x.CreateEntry(It.IsAny<object>()))
            .Returns(mockCacheEntry.Object);

        // Setup memory cache to work correctly
        object? cachedValue = "test";
        _mockMemoryCache.Setup(x => x.TryGetValue(It.IsAny<string>(), out cachedValue!))
            .Returns(true);

        // Simulate distributed cache failure
        _mockDistributedCache.Setup(x => x.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(), It.IsAny<DistributedCacheEntryOptions>(), default))
            .ThrowsAsync(new InvalidOperationException("Redis connection failed"));

        // Act
        var health = await _cacheService.GetCacheHealthAsync();

        // Assert
        health.Should().NotBeNull();
        health.MemoryCacheHealth.IsAvailable.Should().BeTrue();
        health.DistributedCacheHealth.IsAvailable.Should().BeFalse();
        health.Status.Should().Be(CacheHealthStatus.Degraded);
    }

    /// <summary>
    /// Create test sun exposure data
    /// </summary>
    private PatioSunExposure CreateTestSunExposure(int patioId, DateTime timestamp)
    {
        return new PatioSunExposure
        {
            PatioId = patioId,
            Timestamp = timestamp,
            LocalTime = timestamp.AddHours(2), // Mock local time
            SunExposurePercent = 75.0,
            State = SunExposureState.Sunny,
            Confidence = 85.0,
            SunlitAreaSqM = 50.0,
            ShadedAreaSqM = 15.0,
            SolarPosition = new SolarPosition
            {
                Elevation = 45.0,
                Azimuth = 180.0,
                Timestamp = timestamp,
                LocalTime = timestamp.AddHours(2)
            },
            CalculationSource = "test"
        };
    }

    /// <summary>
    /// Create test precomputed data
    /// </summary>
    private PrecomputedSunExposure CreateTestPrecomputedData(int patioId, DateTime timestamp)
    {
        return new PrecomputedSunExposure
        {
            Id = 1,
            PatioId = patioId,
            Timestamp = timestamp,
            LocalTime = timestamp.AddHours(2),
            Date = DateOnly.FromDateTime(timestamp),
            Time = TimeOnly.FromDateTime(timestamp),
            SunExposurePercent = 75.0,
            State = SunExposureState.Sunny,
            Confidence = 85.0,
            SunlitAreaSqM = 50.0,
            ShadedAreaSqM = 15.0,
            SolarElevation = 45.0,
            SolarAzimuth = 180.0,
            ComputedAt = DateTime.UtcNow.AddMinutes(-30),
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            ComputationVersion = "1.0",
            IsStale = false
        };
    }
}