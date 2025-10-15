using Microsoft.Extensions.Logging;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Utils;

namespace SunnySeat.Core.Services;

/// <summary>
/// Service for calculating building shadows and patio shadow coverage using 2.5D modeling
/// </summary>
public class ShadowCalculationService : IShadowCalculationService
{
    private readonly IBuildingRepository _buildingRepository;
    private readonly IPatioRepository _patioRepository;
    private readonly ISolarCalculationService _solarService;
    private readonly BuildingHeightManager _heightManager;
    private readonly GeometryFactory _geometryFactory;
    private readonly ILogger<ShadowCalculationService> _logger;

    public ShadowCalculationService(
        IBuildingRepository buildingRepository,
        IPatioRepository patioRepository,
        ISolarCalculationService solarService,
        BuildingHeightManager heightManager,
        GeometryFactory geometryFactory,
        ILogger<ShadowCalculationService> logger)
    {
        _buildingRepository = buildingRepository;
        _patioRepository = patioRepository;
        _solarService = solarService;
        _heightManager = heightManager;
        _geometryFactory = geometryFactory;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<ShadowProjection?> CalculateBuildingShadowAsync(int buildingId, 
        SolarPosition solarPosition, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Calculating shadow for building {BuildingId}", buildingId);

        var building = await _buildingRepository.GetByIdAsync(buildingId, cancellationToken);
        if (building == null)
        {
            _logger.LogWarning("Building {BuildingId} not found", buildingId);
            throw new ArgumentException($"Building {buildingId} not found");
        }

        // Skip shadow calculation if sun is below horizon or too low
        if (!IsShadowCalculationReliable(solarPosition))
        {
            _logger.LogDebug("Solar position unreliable for shadow calculation: elevation {Elevation}°", 
                solarPosition.Elevation);
            return null;
        }

        // Check if building can cast meaningful shadow
        if (!_heightManager.CanCastMeaningShadow(building))
        {
            _logger.LogDebug("Building {BuildingId} too short for meaningful shadow", buildingId);
            return null;
        }

        var effectiveHeight = _heightManager.GetEffectiveHeight(building);
        
        // Calculate shadow projection
        var shadowPolygon = ShadowGeometry.ProjectBuildingShadow(
            building.Geometry, effectiveHeight, solarPosition, _geometryFactory);

        if (shadowPolygon == null)
        {
            _logger.LogDebug("No shadow polygon generated for building {BuildingId}", buildingId);
            return null;
        }

        var shadowLength = ShadowGeometry.CalculateShadowLength(effectiveHeight, solarPosition.Elevation);
        var shadowDirection = (solarPosition.Azimuth + 180) % 360;
        var confidence = ShadowGeometry.CalculateShadowConfidence(building, solarPosition, shadowLength);

        var shadowProjection = new ShadowProjection
        {
            Geometry = shadowPolygon,
            Length = shadowLength,
            Direction = shadowDirection,
            BuildingId = buildingId,
            BuildingHeight = effectiveHeight,
            SolarPosition = solarPosition,
            Timestamp = DateTime.UtcNow,
            Confidence = confidence
        };

        _logger.LogDebug("Generated shadow for building {BuildingId}: length {Length:F1}m, direction {Direction:F1}°, confidence {Confidence:F2}",
            buildingId, shadowLength, shadowDirection, confidence);

        return shadowProjection;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<ShadowProjection>> CalculateAllShadowsAsync(
        SolarPosition solarPosition, Polygon boundingArea, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Calculating all shadows within bounding area");

        // Skip if sun position is unreliable
        if (!IsShadowCalculationReliable(solarPosition))
        {
            _logger.LogDebug("Solar position unreliable, returning empty shadow list");
            return [];
        }

        // Calculate maximum shadow length to determine search radius
        var maxShadowLength = Math.Min(
            ShadowGeometry.CalculateShadowLength(30.0, solarPosition.Elevation), // Assume max 30m buildings
            ShadowGeometry.MaxShadowDistance);

        // Get buildings within shadow casting distance
        var buildings = await _buildingRepository.GetBuildingsInBoundsAsync(
            boundingArea, ShadowGeometry.MinMeaningfulHeight, cancellationToken);

        _logger.LogDebug("Found {BuildingCount} potential shadow-casting buildings", buildings.Count());

        var shadows = new List<ShadowProjection>();
        
        foreach (var building in buildings)
        {
            try
            {
                var shadow = await CalculateBuildingShadowAsync(building.Id, solarPosition, cancellationToken);
                if (shadow != null)
                {
                    shadows.Add(shadow);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to calculate shadow for building {BuildingId}", building.Id);
            }
        }

        _logger.LogDebug("Generated {ShadowCount} shadows from {BuildingCount} buildings", 
            shadows.Count, buildings.Count());

        return shadows;
    }

    /// <inheritdoc />
    public async Task<PatioShadowInfo> CalculatePatioShadowAsync(int patioId, 
        DateTime timestamp, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Calculating patio shadow for patio {PatioId} at {Timestamp}", patioId, timestamp);

        var patio = await _patioRepository.GetByIdAsync(patioId, cancellationToken);
        if (patio == null)
        {
            _logger.LogWarning("Patio {PatioId} not found", patioId);
            throw new ArgumentException($"Patio {patioId} not found");
        }

        // Get solar position for the timestamp
        var solarPosition = await _solarService.CalculateSolarPositionAsync(timestamp);

        // Handle case where sun is not visible
        if (!_solarService.IsSunVisible(solarPosition))
        {
            _logger.LogDebug("Sun not visible for patio {PatioId} at {Timestamp}", patioId, timestamp);
            return CreateNoSunPatioShadowInfo(patioId, patio, timestamp, solarPosition);
        }

        // Skip shadow calculation if solar position is unreliable
        if (!IsShadowCalculationReliable(solarPosition))
        {
            _logger.LogDebug("Solar position unreliable for patio {PatioId}, assuming partial shadow", patioId);
            return CreateLowConfidencePatioShadowInfo(patioId, patio, timestamp, solarPosition);
        }

        // Calculate expanded bounding area around patio to find shadow-casting buildings
        var searchRadius = ShadowGeometry.MaxShadowDistance / 111300.0; // Convert to degrees (rough)
        var patioBuffer = patio.Geometry.Buffer(searchRadius);

        // Get all shadows that could affect this patio
        var allShadows = await CalculateAllShadowsAsync(solarPosition, (Polygon)patioBuffer, cancellationToken);

        // Filter shadows that actually intersect with the patio
        var affectingShadows = allShadows
            .Where(shadow => shadow.Geometry.Intersects(patio.Geometry))
            .ToList();

        _logger.LogDebug("Found {ShadowCount} shadows affecting patio {PatioId}", affectingShadows.Count, patioId);

        // Calculate shadowed and sunlit areas
        var (shadowedGeometry, sunlitGeometry) = ShadowGeometry.CalculateShadowedAndSunlitAreas(
            patio.Geometry, affectingShadows.Select(s => s.Geometry), _geometryFactory);

        // Calculate coverage percentages
        var shadowedPercent = shadowedGeometry?.Area / patio.Geometry.Area * 100.0 ?? 0.0;
        var sunlitPercent = Math.Max(0.0, 100.0 - shadowedPercent);

        // Calculate combined confidence
        var combinedConfidence = affectingShadows.Any() 
            ? affectingShadows.Average(s => s.Confidence)
            : 1.0; // Full confidence if no shadows

        var patioShadowInfo = new PatioShadowInfo
        {
            PatioId = patioId,
            Patio = patio,
            ShadowedAreaPercent = shadowedPercent,
            SunlitAreaPercent = sunlitPercent,
            CastingShadows = affectingShadows,
            ShadowedGeometry = shadowedGeometry,
            SunlitGeometry = sunlitGeometry,
            Timestamp = timestamp,
            Confidence = combinedConfidence,
            SolarPosition = solarPosition
        };

        _logger.LogDebug("Patio {PatioId} shadow calculation complete: {ShadowPercent:F1}% shadowed, {SunlitPercent:F1}% sunlit, confidence {Confidence:F2}",
            patioId, shadowedPercent, sunlitPercent, combinedConfidence);

        return patioShadowInfo;
    }

    /// <inheritdoc />
    public async Task<Dictionary<int, PatioShadowInfo>> CalculatePatioBatchShadowAsync(
        IEnumerable<int> patioIds, DateTime timestamp, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Calculating batch shadows for {PatioCount} patios at {Timestamp}", 
            patioIds.Count(), timestamp);

        var patioIdsList = patioIds.ToList();
        if (!patioIdsList.Any())
            return new Dictionary<int, PatioShadowInfo>();

        // Get solar position once for all patios
        var solarPosition = await _solarService.CalculateSolarPositionAsync(timestamp);

        // Handle case where sun is not visible - create results for all patios
        if (!_solarService.IsSunVisible(solarPosition))
        {
            _logger.LogDebug("Sun not visible, returning no-sun results for all patios");
            var patios = await _patioRepository.GetByIdsAsync(patioIdsList, cancellationToken);
            return patios.ToDictionary(p => p.Id, p => CreateNoSunPatioShadowInfo(p.Id, p, timestamp, solarPosition));
        }

        // Optimize by calculating all shadows in the area once
        var allPatios = await _patioRepository.GetByIdsAsync(patioIdsList, cancellationToken);
        var boundingBox = CalculateBoundingBox(allPatios.Select(p => p.Geometry));
        var expandedBounds = boundingBox.Buffer(ShadowGeometry.MaxShadowDistance / 111300.0); // Convert to degrees

        var allShadows = await CalculateAllShadowsAsync(solarPosition, (Polygon)expandedBounds, cancellationToken);
        var shadowsList = allShadows.ToList();

        _logger.LogDebug("Calculated {ShadowCount} total shadows for batch processing", shadowsList.Count);

        // Process each patio in parallel
        var tasks = allPatios.Select(async patio =>
        {
            try
            {
                var affectingShadows = shadowsList
                    .Where(shadow => shadow.Geometry.Intersects(patio.Geometry))
                    .ToList();

                var (shadowedGeometry, sunlitGeometry) = ShadowGeometry.CalculateShadowedAndSunlitAreas(
                    patio.Geometry, affectingShadows.Select(s => s.Geometry), _geometryFactory);

                var shadowedPercent = shadowedGeometry?.Area / patio.Geometry.Area * 100.0 ?? 0.0;
                var sunlitPercent = Math.Max(0.0, 100.0 - shadowedPercent);
                var combinedConfidence = affectingShadows.Any() 
                    ? affectingShadows.Average(s => s.Confidence)
                    : 1.0;

                return new PatioShadowInfo
                {
                    PatioId = patio.Id,
                    Patio = patio,
                    ShadowedAreaPercent = shadowedPercent,
                    SunlitAreaPercent = sunlitPercent,
                    CastingShadows = affectingShadows,
                    ShadowedGeometry = shadowedGeometry,
                    SunlitGeometry = sunlitGeometry,
                    Timestamp = timestamp,
                    Confidence = combinedConfidence,
                    SolarPosition = solarPosition
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to calculate shadow for patio {PatioId}", patio.Id);
                return CreateLowConfidencePatioShadowInfo(patio.Id, patio, timestamp, solarPosition);
            }
        });

        var results = await Task.WhenAll(tasks);

        _logger.LogDebug("Batch shadow calculation complete for {PatioCount} patios", results.Length);

        return results.ToDictionary(r => r.PatioId, r => r);
    }

    /// <inheritdoc />
    public async Task<ShadowTimeline> CalculatePatioShadowTimelineAsync(int patioId, 
        DateTime startTime, DateTime endTime, TimeSpan interval, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Calculating shadow timeline for patio {PatioId} from {StartTime} to {EndTime} with {Interval} interval",
            patioId, startTime, endTime, interval);

        if (startTime >= endTime)
            throw new ArgumentException("Start time must be before end time");

        if (interval <= TimeSpan.Zero)
            throw new ArgumentException("Interval must be positive");

        var points = new List<ShadowTimelinePoint>();
        var confidenceSum = 0.0;
        var pointCount = 0;

        for (var currentTime = startTime; currentTime <= endTime; currentTime += interval)
        {
            try
            {
                var shadowInfo = await CalculatePatioShadowAsync(patioId, currentTime, cancellationToken);
                
                points.Add(new ShadowTimelinePoint
                {
                    Timestamp = currentTime,
                    ShadowedAreaPercent = shadowInfo.ShadowedAreaPercent,
                    SunlitAreaPercent = shadowInfo.SunlitAreaPercent,
                    Confidence = shadowInfo.Confidence,
                    IsSunVisible = _solarService.IsSunVisible(shadowInfo.SolarPosition)
                });

                confidenceSum += shadowInfo.Confidence;
                pointCount++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to calculate shadow for patio {PatioId} at {Timestamp}", 
                    patioId, currentTime);
                
                // Add low-confidence point for failed calculations
                points.Add(new ShadowTimelinePoint
                {
                    Timestamp = currentTime,
                    ShadowedAreaPercent = 50.0, // Assume partially shadowed
                    SunlitAreaPercent = 50.0,
                    Confidence = 0.2,
                    IsSunVisible = true // Assume sun is visible
                });

                confidenceSum += 0.2;
                pointCount++;
            }
        }

        var averageConfidence = pointCount > 0 ? confidenceSum / pointCount : 0.0;

        var timeline = new ShadowTimeline
        {
            PatioId = patioId,
            StartTime = startTime,
            EndTime = endTime,
            Interval = interval,
            Points = points,
            AverageConfidence = averageConfidence
        };

        _logger.LogDebug("Shadow timeline calculation complete: {PointCount} points, average confidence {Confidence:F2}",
            points.Count, averageConfidence);

        return timeline;
    }

    /// <inheritdoc />
    public bool IsShadowCalculationReliable(SolarPosition solarPosition)
    {
        return solarPosition.Elevation >= ShadowGeometry.MinReliableElevation;
    }

    /// <inheritdoc />
    public async Task<Building> UpdateBuildingHeightAsync(int buildingId, double heightOverride, 
        string updatedBy, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Updating building {BuildingId} height to {Height}m by {UpdatedBy}",
            buildingId, heightOverride, updatedBy);

        var building = await _buildingRepository.GetByIdAsync(buildingId, cancellationToken);
        if (building == null)
        {
            _logger.LogWarning("Building {BuildingId} not found for height update", buildingId);
            throw new ArgumentException($"Building {buildingId} not found");
        }

        _heightManager.UpdateHeightOverride(building, heightOverride, updatedBy);

        await _buildingRepository.UpdateAsync(building, cancellationToken);

        _logger.LogInformation("Building {BuildingId} height updated successfully", buildingId);

        return building;
    }

    /// <inheritdoc />
    public async Task<Building> RemoveBuildingHeightOverrideAsync(int buildingId, string updatedBy, 
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Removing building {BuildingId} height override by {UpdatedBy}",
            buildingId, updatedBy);

        var building = await _buildingRepository.GetByIdAsync(buildingId, cancellationToken);
        if (building == null)
        {
            _logger.LogWarning("Building {BuildingId} not found for height override removal", buildingId);
            throw new ArgumentException($"Building {buildingId} not found");
        }

        _heightManager.RemoveHeightOverride(building, updatedBy);

        await _buildingRepository.UpdateAsync(building, cancellationToken);

        _logger.LogInformation("Building {BuildingId} height override removed successfully", buildingId);

        return building;
    }

    /// <inheritdoc />
    public async Task<BuildingHeightInfo> GetBuildingHeightInfoAsync(int buildingId, 
        CancellationToken cancellationToken = default)
    {
        var building = await _buildingRepository.GetByIdAsync(buildingId, cancellationToken);
        if (building == null)
        {
            throw new ArgumentException($"Building {buildingId} not found");
        }

        return _heightManager.GetHeightInfo(building);
    }

    /// <summary>
    /// Create PatioShadowInfo for when sun is not visible (night time)
    /// </summary>
    private static PatioShadowInfo CreateNoSunPatioShadowInfo(int patioId, Patio patio, 
        DateTime timestamp, SolarPosition solarPosition)
    {
        return new PatioShadowInfo
        {
            PatioId = patioId,
            Patio = patio,
            ShadowedAreaPercent = 100.0, // Fully shadowed when sun not visible
            SunlitAreaPercent = 0.0,
            CastingShadows = [],
            ShadowedGeometry = patio.Geometry, // Entire patio is shadowed
            SunlitGeometry = null,
            Timestamp = timestamp,
            Confidence = 1.0, // High confidence - definitely no sun
            SolarPosition = solarPosition
        };
    }

    /// <summary>
    /// Create PatioShadowInfo for low confidence scenarios (very low sun, etc.)
    /// </summary>
    private static PatioShadowInfo CreateLowConfidencePatioShadowInfo(int patioId, Patio patio,
        DateTime timestamp, SolarPosition solarPosition)
    {
        return new PatioShadowInfo
        {
            PatioId = patioId,
            Patio = patio,
            ShadowedAreaPercent = 75.0, // Assume mostly shadowed when uncertain
            SunlitAreaPercent = 25.0,
            CastingShadows = [],
            ShadowedGeometry = null,
            SunlitGeometry = null,
            Timestamp = timestamp,
            Confidence = 0.3, // Low confidence
            SolarPosition = solarPosition
        };
    }

    /// <summary>
    /// Calculate bounding box that encompasses all geometries
    /// </summary>
    private Polygon CalculateBoundingBox(IEnumerable<Polygon> geometries)
    {
        var envelope = new Envelope();
        foreach (var geometry in geometries)
        {
            envelope.ExpandToInclude(geometry.EnvelopeInternal);
        }

        return _geometryFactory.ToGeometry(envelope) as Polygon 
            ?? _geometryFactory.CreatePolygon();
    }
}