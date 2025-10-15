using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using System.Diagnostics;
using System.Text.Json;

namespace SunnySeat.Core.Services;

/// <summary>
/// Multi-layer caching service implementation for sun exposure data
/// </summary>
public class MultiLayerCacheService : ICacheService
{
    private readonly IMemoryCache _memoryCache;          // L1: In-memory (fastest)
    private readonly IDistributedCache _distributedCache; // L2: Redis (persistent)  
    private readonly IPrecomputationRepository _precomputationRepo; // L3: Database (complete)
    private readonly ILogger<MultiLayerCacheService> _logger;

    // Cache configuration
    private readonly TimeSpan _memoryCacheExpiry = TimeSpan.FromMinutes(5);
    private readonly TimeSpan _distributedCacheExpiry = TimeSpan.FromHours(2);
    
    // Cache metrics tracking
    private long _totalRequests = 0;
    private long _memoryHits = 0;
    private long _distributedHits = 0;
    private long _precomputedHits = 0;
    private long _cacheMisses = 0;

    public MultiLayerCacheService(
        IMemoryCache memoryCache,
        IDistributedCache distributedCache,
        IPrecomputationRepository precomputationRepository,
        ILogger<MultiLayerCacheService> logger)
    {
        _memoryCache = memoryCache;
        _distributedCache = distributedCache;
        _precomputationRepo = precomputationRepository;
        _logger = logger;
    }

    /// <summary>
    /// Get cached sun exposure with multi-layer fallback
    /// </summary>
    public async Task<PatioSunExposure?> GetCachedSunExposureAsync(int patioId, DateTime timestamp,
        CancellationToken cancellationToken = default)
    {
        Interlocked.Increment(ref _totalRequests);
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            var cacheKey = GenerateCacheKey(patioId, timestamp);
            
            // L1: Try memory cache (sub-millisecond)
            if (_memoryCache.TryGetValue(cacheKey, out PatioSunExposure? memoryCached))
            {
                Interlocked.Increment(ref _memoryHits);
                _logger.LogDebug("Cache hit (Memory) for patio {PatioId} at {Timestamp} in {ElapsedMs}ms", 
                    patioId, timestamp, stopwatch.ElapsedMilliseconds);
                return memoryCached;
            }

            // L2: Try distributed cache (few milliseconds)
            var distributedJson = await _distributedCache.GetStringAsync(cacheKey, cancellationToken);
            if (distributedJson != null)
            {
                var distributedCached = JsonSerializer.Deserialize<PatioSunExposure>(distributedJson);
                if (distributedCached != null)
                {
                    // Warm L1 cache
                    _memoryCache.Set(cacheKey, distributedCached, _memoryCacheExpiry);
                    
                    Interlocked.Increment(ref _distributedHits);
                    _logger.LogDebug("Cache hit (Distributed) for patio {PatioId} at {Timestamp} in {ElapsedMs}ms", 
                        patioId, timestamp, stopwatch.ElapsedMilliseconds);
                    return distributedCached;
                }
            }

            // L3: Try precomputed database (tens of milliseconds)
            var precomputed = await _precomputationRepo.GetPrecomputedSunExposureAsync(
                patioId, timestamp, toleranceMinutes: 5, cancellationToken);
            
            if (precomputed != null && !precomputed.IsStale)
            {
                var reconstructed = ReconstructSunExposureFromPrecomputed(precomputed);
                
                // Warm both cache layers
                await SetCachedSunExposureAsync(reconstructed, cancellationToken);
                
                Interlocked.Increment(ref _precomputedHits);
                _logger.LogDebug("Cache hit (Precomputed) for patio {PatioId} at {Timestamp} in {ElapsedMs}ms", 
                    patioId, timestamp, stopwatch.ElapsedMilliseconds);
                return reconstructed;
            }

            // Cache miss - will need real-time calculation
            Interlocked.Increment(ref _cacheMisses);
            _logger.LogDebug("Cache miss for patio {PatioId} at {Timestamp} in {ElapsedMs}ms", 
                patioId, timestamp, stopwatch.ElapsedMilliseconds);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving cached sun exposure for patio {PatioId} at {Timestamp}", 
                patioId, timestamp);
            return null;
        }
    }

    /// <summary>
    /// Cache sun exposure data in multiple layers
    /// </summary>
    public async Task SetCachedSunExposureAsync(PatioSunExposure exposure,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var cacheKey = GenerateCacheKey(exposure.PatioId, exposure.Timestamp);
            
            // Set in L1 cache (memory)
            _memoryCache.Set(cacheKey, exposure, _memoryCacheExpiry);
            
            // Set in L2 cache (distributed) 
            var serialized = JsonSerializer.Serialize(exposure);
            await _distributedCache.SetStringAsync(cacheKey, serialized, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = _distributedCacheExpiry
            }, cancellationToken);
            
            _logger.LogDebug("Cached sun exposure for patio {PatioId} at {Timestamp}", 
                exposure.PatioId, exposure.Timestamp);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error caching sun exposure for patio {PatioId} at {Timestamp}", 
                exposure.PatioId, exposure.Timestamp);
        }
    }

    /// <summary>
    /// Get cached data for multiple patios (batch operation)
    /// </summary>
    public async Task<Dictionary<int, PatioSunExposure>> GetBatchCachedSunExposureAsync(
        IEnumerable<int> patioIds, DateTime timestamp, CancellationToken cancellationToken = default)
    {
        var results = new Dictionary<int, PatioSunExposure>();
        var patioIdsList = patioIds.ToList();
        
        _logger.LogDebug("Batch cache lookup for {PatioCount} patios at {Timestamp}", 
            patioIdsList.Count, timestamp);

        // Process in parallel for better performance
        var tasks = patioIdsList.Select(async patioId =>
        {
            var exposure = await GetCachedSunExposureAsync(patioId, timestamp, cancellationToken);
            return new { PatioId = patioId, Exposure = exposure };
        });

        var taskResults = await Task.WhenAll(tasks);
        
        foreach (var result in taskResults)
        {
            if (result.Exposure != null)
            {
                results[result.PatioId] = result.Exposure;
            }
        }

        _logger.LogDebug("Batch cache lookup returned {CachedCount}/{TotalCount} results", 
            results.Count, patioIdsList.Count);

        return results;
    }

    /// <summary>
    /// Cache multiple sun exposure data points (batch operation)
    /// </summary>
    public async Task SetBatchCachedSunExposureAsync(IEnumerable<PatioSunExposure> exposures,
        CancellationToken cancellationToken = default)
    {
        var exposuresList = exposures.ToList();
        _logger.LogDebug("Batch caching {ExposureCount} sun exposure data points", exposuresList.Count);

        // Process in parallel for better performance
        var tasks = exposuresList.Select(exposure => 
            SetCachedSunExposureAsync(exposure, cancellationToken));

        await Task.WhenAll(tasks);
    }

    /// <summary>
    /// Invalidate cache for a specific patio
    /// </summary>
    public async Task InvalidateCacheAsync(int patioId, DateOnly? date = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Invalidating cache for patio {PatioId}, date: {Date}", patioId, date);

            // Generate potential cache keys for this patio
            var keysToInvalidate = GeneratePatiosCacheKeys(new[] { patioId }, date);
            
            // Remove from memory cache
            foreach (var key in keysToInvalidate)
            {
                _memoryCache.Remove(key);
            }

            // Remove from distributed cache
            var distributedTasks = keysToInvalidate.Select(key => 
                _distributedCache.RemoveAsync(key, cancellationToken));
            await Task.WhenAll(distributedTasks);

            _logger.LogDebug("Invalidated {KeyCount} cache keys for patio {PatioId}", 
                keysToInvalidate.Count, patioId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error invalidating cache for patio {PatioId}", patioId);
        }
    }

    /// <summary>
    /// Invalidate cache for multiple patios
    /// </summary>
    public async Task InvalidateBatchCacheAsync(IEnumerable<int> patioIds, DateOnly? date = null,
        CancellationToken cancellationToken = default)
    {
        var patioIdsList = patioIds.ToList();
        _logger.LogInformation("Batch invalidating cache for {PatioCount} patios", patioIdsList.Count);

        var tasks = patioIdsList.Select(patioId => 
            InvalidateCacheAsync(patioId, date, cancellationToken));
        
        await Task.WhenAll(tasks);
    }

    /// <summary>
    /// Get cache performance metrics
    /// </summary>
    public async Task<CacheMetrics> GetCacheMetricsAsync(CancellationToken cancellationToken = default)
    {
        var totalRequests = _totalRequests;
        var hitRate = totalRequests > 0 
            ? (double)(_memoryHits + _distributedHits + _precomputedHits) / totalRequests 
            : 0.0;

        return new CacheMetrics
        {
            HitRate = hitRate,
            TotalRequests = totalRequests,
            CacheHits = _memoryHits + _distributedHits + _precomputedHits,
            CacheMisses = _cacheMisses,
            HitRateByLayer = new Dictionary<CacheLayer, double>
            {
                [CacheLayer.Memory] = totalRequests > 0 ? (double)_memoryHits / totalRequests : 0.0,
                [CacheLayer.Distributed] = totalRequests > 0 ? (double)_distributedHits / totalRequests : 0.0,
                [CacheLayer.Precomputed] = totalRequests > 0 ? (double)_precomputedHits / totalRequests : 0.0
            },
            CollectedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Not implemented in this basic version - would need timeline-specific logic
    /// </summary>
    public Task<SunExposureTimeline?> GetCachedTimelineAsync(int patioId, DateTime startTime, DateTime endTime, TimeSpan interval, CancellationToken cancellationToken = default)
    {
        // TODO: Implement timeline caching logic
        return Task.FromResult<SunExposureTimeline?>(null);
    }

    public Task SetCachedTimelineAsync(SunExposureTimeline timeline, CancellationToken cancellationToken = default)
    {
        // TODO: Implement timeline caching logic
        return Task.CompletedTask;
    }

    public Task WarmCacheAsync(IEnumerable<int> patioIds, DateTime startTime, DateTime endTime, CancellationToken cancellationToken = default)
    {
        // TODO: Implement cache warming logic
        return Task.CompletedTask;
    }

    public Task WarmCacheForUpcomingPeriodsAsync(CancellationToken cancellationToken = default)
    {
        // TODO: Implement intelligent cache warming
        return Task.CompletedTask;
    }

    public Task InvalidateExpiredCacheAsync(CancellationToken cancellationToken = default)
    {
        // Memory cache handles expiration automatically
        // Distributed cache expiration is handled by Redis
        // TODO: Could implement cleanup of expired distributed cache keys
        return Task.CompletedTask;
    }

    public async Task<CacheHealthInfo> GetCacheHealthAsync(CancellationToken cancellationToken = default)
    {
        var health = new CacheHealthInfo();
        
        try
        {
            // Test memory cache
            var testKey = "health_check_" + Guid.NewGuid();
            _memoryCache.Set(testKey, "test", TimeSpan.FromSeconds(1));
            var memoryTest = _memoryCache.TryGetValue(testKey, out _);
            
            health.MemoryCacheHealth = new CacheLayerHealth
            {
                IsAvailable = memoryTest,
                ResponseTimeMs = 0.1, // Memory cache is very fast
                StatusMessage = memoryTest ? "Healthy" : "Unavailable"
            };

            // Test distributed cache
            var stopwatch = Stopwatch.StartNew();
            try
            {
                await _distributedCache.SetStringAsync(testKey, "test", cancellationToken);
                var distributedTest = await _distributedCache.GetStringAsync(testKey, cancellationToken);
                
                health.DistributedCacheHealth = new CacheLayerHealth
                {
                    IsAvailable = distributedTest != null,
                    ResponseTimeMs = stopwatch.ElapsedMilliseconds,
                    StatusMessage = distributedTest != null ? "Healthy" : "Unavailable"
                };
            }
            catch (Exception ex)
            {
                health.DistributedCacheHealth = new CacheLayerHealth
                {
                    IsAvailable = false,
                    ResponseTimeMs = stopwatch.ElapsedMilliseconds,
                    StatusMessage = $"Error: {ex.Message}",
                    ErrorCount = 1
                };
            }

            // Determine overall status
            if (health.MemoryCacheHealth.IsAvailable && health.DistributedCacheHealth.IsAvailable)
                health.Status = CacheHealthStatus.Healthy;
            else if (health.MemoryCacheHealth.IsAvailable || health.DistributedCacheHealth.IsAvailable)
                health.Status = CacheHealthStatus.Degraded;
            else
                health.Status = CacheHealthStatus.Critical;

            health.IsConfiguredCorrectly = health.Status != CacheHealthStatus.Critical;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing cache health check");
            health.Status = CacheHealthStatus.Critical;
            health.Issues.Add($"Health check failed: {ex.Message}");
        }

        return health;
    }

    public async Task ClearAllCacheAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogWarning("Clearing all cache data - this will impact performance");
        
        // Clear memory cache (dispose and recreate would be needed for complete clear)
        if (_memoryCache is MemoryCache memCache)
        {
            // Memory cache doesn't have a clear method, but we could track keys
            _logger.LogWarning("Memory cache clear not fully implemented");
        }

        // Note: Clearing distributed cache would require Redis-specific implementation
        _logger.LogWarning("Distributed cache clear not implemented - would require Redis FLUSHDB");
    }

    /// <summary>
    /// Generate cache key for patio sun exposure
    /// </summary>
    private static string GenerateCacheKey(int patioId, DateTime timestamp)
    {
        // Round to nearest 5 minutes for better cache hit rates
        var roundedTime = RoundToNearestMinutes(timestamp, 5);
        return $"sun_exposure:{patioId}:{roundedTime:yyyyMMddHHmm}";
    }

    /// <summary>
    /// Generate cache keys for multiple patios over a date range
    /// </summary>
    private static List<string> GeneratePatiosCacheKeys(IEnumerable<int> patioIds, DateOnly? date)
    {
        var keys = new List<string>();
        
        // If no specific date, generate keys for current day + next 2 days
        var dates = date.HasValue 
            ? new[] { date.Value }
            : new[] { DateOnly.FromDateTime(DateTime.Today), 
                     DateOnly.FromDateTime(DateTime.Today.AddDays(1)), 
                     DateOnly.FromDateTime(DateTime.Today.AddDays(2)) };

        foreach (var patioId in patioIds)
        {
            foreach (var targetDate in dates)
            {
                // Generate keys for typical time slots (every 5 minutes during peak hours)
                var startTime = targetDate.ToDateTime(new TimeOnly(8, 0));
                var endTime = targetDate.ToDateTime(new TimeOnly(20, 0));
                
                for (var time = startTime; time <= endTime; time = time.AddMinutes(5))
                {
                    keys.Add(GenerateCacheKey(patioId, time));
                }
            }
        }

        return keys;
    }

    /// <summary>
    /// Round timestamp to nearest minutes for better cache hit rates
    /// </summary>
    private static DateTime RoundToNearestMinutes(DateTime dateTime, int minutes)
    {
        var ticks = dateTime.Ticks + (TimeSpan.TicksPerMinute * minutes / 2);
        return new DateTime(ticks - (ticks % (TimeSpan.TicksPerMinute * minutes)), dateTime.Kind);
    }

    /// <summary>
    /// Reconstruct PatioSunExposure from precomputed data
    /// </summary>
    private PatioSunExposure ReconstructSunExposureFromPrecomputed(PrecomputedSunExposure precomputed)
    {
        return new PatioSunExposure
        {
            PatioId = precomputed.PatioId,
            Patio = precomputed.Patio,
            Timestamp = precomputed.Timestamp,
            LocalTime = precomputed.LocalTime,
            SunExposurePercent = precomputed.SunExposurePercent,
            State = precomputed.State,
            Confidence = precomputed.Confidence,
            SunlitGeometry = DecompressGeometry(precomputed.CompressedSunlitGeometry),
            SunlitAreaSqM = precomputed.SunlitAreaSqM,
            ShadedAreaSqM = precomputed.ShadedAreaSqM,
            SolarPosition = new SolarPosition
            {
                Elevation = precomputed.SolarElevation,
                Azimuth = precomputed.SolarAzimuth,
                Timestamp = precomputed.Timestamp,
                LocalTime = precomputed.LocalTime
            },
            Shadows = new List<ShadowProjection>(), // Simplified - not storing individual shadows
            CalculationDuration = precomputed.CalculationDuration,
            CalculationSource = "precomputed"
        };
    }

    /// <summary>
    /// Decompress geometry from compressed bytes (simplified implementation)
    /// </summary>
    private NetTopologySuite.Geometries.Polygon? DecompressGeometry(byte[]? compressedGeometry)
    {
        // TODO: Implement geometry decompression
        // For now, return null - geometry decompression would use GZip + WKB
        return null;
    }
}