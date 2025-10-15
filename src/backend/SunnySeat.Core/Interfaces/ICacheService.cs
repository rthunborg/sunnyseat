using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Multi-layer caching service for sun exposure data
/// </summary>
public interface ICacheService
{
    // Sun exposure caching
    /// <summary>
    /// Get cached sun exposure data for a patio at a specific timestamp
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="timestamp">Target timestamp (UTC)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Cached sun exposure data if available</returns>
    Task<PatioSunExposure?> GetCachedSunExposureAsync(int patioId, DateTime timestamp,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Cache sun exposure data with appropriate expiration
    /// </summary>
    /// <param name="exposure">Sun exposure data to cache</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SetCachedSunExposureAsync(PatioSunExposure exposure,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get cached sun exposure data for multiple patios (batch operation)
    /// </summary>
    /// <param name="patioIds">Collection of patio IDs</param>
    /// <param name="timestamp">Target timestamp (UTC)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Dictionary mapping patio IDs to cached sun exposure data</returns>
    Task<Dictionary<int, PatioSunExposure>> GetBatchCachedSunExposureAsync(
        IEnumerable<int> patioIds, DateTime timestamp, CancellationToken cancellationToken = default);

    /// <summary>
    /// Cache multiple sun exposure data points (batch operation)
    /// </summary>
    /// <param name="exposures">Collection of sun exposure data to cache</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SetBatchCachedSunExposureAsync(IEnumerable<PatioSunExposure> exposures,
        CancellationToken cancellationToken = default);

    // Timeline caching
    /// <summary>
    /// Get cached sun exposure timeline for a patio
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="startTime">Timeline start time (UTC)</param>
    /// <param name="endTime">Timeline end time (UTC)</param>
    /// <param name="interval">Time interval between data points</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Cached timeline data if available</returns>
    Task<SunExposureTimeline?> GetCachedTimelineAsync(int patioId, DateTime startTime, 
        DateTime endTime, TimeSpan interval, CancellationToken cancellationToken = default);

    /// <summary>
    /// Cache sun exposure timeline data
    /// </summary>
    /// <param name="timeline">Timeline data to cache</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SetCachedTimelineAsync(SunExposureTimeline timeline,
        CancellationToken cancellationToken = default);

    // Cache warming
    /// <summary>
    /// Warm cache with sun exposure data for popular patios
    /// </summary>
    /// <param name="patioIds">Collection of patio IDs to warm</param>
    /// <param name="startTime">Start time for cache warming</param>
    /// <param name="endTime">End time for cache warming</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task WarmCacheAsync(IEnumerable<int> patioIds, DateTime startTime, DateTime endTime,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Warm cache for upcoming time periods based on usage patterns
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    Task WarmCacheForUpcomingPeriodsAsync(CancellationToken cancellationToken = default);

    // Cache invalidation
    /// <summary>
    /// Invalidate all cached data for a specific patio
    /// </summary>
    /// <param name="patioId">ID of the patio</param>
    /// <param name="date">Optional specific date to invalidate (null = all dates)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task InvalidateCacheAsync(int patioId, DateOnly? date = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Invalidate cache for multiple patios
    /// </summary>
    /// <param name="patioIds">Collection of patio IDs to invalidate</param>
    /// <param name="date">Optional specific date to invalidate (null = all dates)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task InvalidateBatchCacheAsync(IEnumerable<int> patioIds, DateOnly? date = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Invalidate expired cache entries
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    Task InvalidateExpiredCacheAsync(CancellationToken cancellationToken = default);

    // Cache monitoring and metrics
    /// <summary>
    /// Get cache performance metrics
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Cache performance metrics</returns>
    Task<CacheMetrics> GetCacheMetricsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get cache health status
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Cache health information</returns>
    Task<CacheHealthInfo> GetCacheHealthAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Clear all cache data (use with caution)
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    Task ClearAllCacheAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Cache performance metrics
/// </summary>
public class CacheMetrics
{
    /// <summary>
    /// Cache hit rate (0-1)
    /// </summary>
    public double HitRate { get; set; }
    
    /// <summary>
    /// Total number of cache requests
    /// </summary>
    public long TotalRequests { get; set; }
    
    /// <summary>
    /// Number of cache hits
    /// </summary>
    public long CacheHits { get; set; }
    
    /// <summary>
    /// Number of cache misses
    /// </summary>
    public long CacheMisses { get; set; }
    
    /// <summary>
    /// Average cache retrieval time in milliseconds
    /// </summary>
    public double AverageRetrievalTimeMs { get; set; }
    
    /// <summary>
    /// Cache hit rate by layer (Memory, Distributed, Precomputed)
    /// </summary>
    public Dictionary<CacheLayer, double> HitRateByLayer { get; set; } = new();
    
    /// <summary>
    /// Total cache size in bytes
    /// </summary>
    public long CacheSizeBytes { get; set; }
    
    /// <summary>
    /// Number of cache keys
    /// </summary>
    public long KeyCount { get; set; }
    
    /// <summary>
    /// Cache eviction count
    /// </summary>
    public long EvictionCount { get; set; }
    
    /// <summary>
    /// When these metrics were collected
    /// </summary>
    public DateTime CollectedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Cache health information
/// </summary>
public class CacheHealthInfo
{
    /// <summary>
    /// Overall cache health status
    /// </summary>
    public CacheHealthStatus Status { get; set; }
    
    /// <summary>
    /// Memory cache status
    /// </summary>
    public CacheLayerHealth MemoryCacheHealth { get; set; } = new();
    
    /// <summary>
    /// Distributed cache (Redis) status
    /// </summary>
    public CacheLayerHealth DistributedCacheHealth { get; set; } = new();
    
    /// <summary>
    /// Precomputed data cache status
    /// </summary>
    public CacheLayerHealth PrecomputedCacheHealth { get; set; } = new();
    
    /// <summary>
    /// Issues or warnings
    /// </summary>
    public List<string> Issues { get; set; } = new();
    
    /// <summary>
    /// Cache configuration status
    /// </summary>
    public bool IsConfiguredCorrectly { get; set; }
    
    /// <summary>
    /// Last health check time
    /// </summary>
    public DateTime LastCheckTime { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Individual cache layer health information
/// </summary>
public class CacheLayerHealth
{
    /// <summary>
    /// Whether this cache layer is available
    /// </summary>
    public bool IsAvailable { get; set; }
    
    /// <summary>
    /// Response time in milliseconds
    /// </summary>
    public double ResponseTimeMs { get; set; }
    
    /// <summary>
    /// Current usage percentage (0-100)
    /// </summary>
    public double UsagePercent { get; set; }
    
    /// <summary>
    /// Error count in last monitoring period
    /// </summary>
    public int ErrorCount { get; set; }
    
    /// <summary>
    /// Health status message
    /// </summary>
    public string? StatusMessage { get; set; }
}

/// <summary>
/// Cache layer enumeration
/// </summary>
public enum CacheLayer
{
    /// <summary>
    /// In-memory cache (fastest, volatile)
    /// </summary>
    Memory,
    
    /// <summary>
    /// Distributed cache (Redis, persistent)
    /// </summary>
    Distributed,
    
    /// <summary>
    /// Precomputed database cache (complete, slower)
    /// </summary>
    Precomputed
}

/// <summary>
/// Cache health status enumeration
/// </summary>
public enum CacheHealthStatus
{
    /// <summary>
    /// All cache layers are healthy
    /// </summary>
    Healthy,
    
    /// <summary>
    /// Some cache layers have issues but system is functional
    /// </summary>
    Degraded,
    
    /// <summary>
    /// Major cache issues affecting performance
    /// </summary>
    Unhealthy,
    
    /// <summary>
    /// Cache system is down
    /// </summary>
    Critical
}