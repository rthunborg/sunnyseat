using Microsoft.Extensions.Logging;
using NetTopologySuite.Geometries;

namespace SunnySeat.Core.Services;

/// <summary>
/// Service for processing building geometries and applying business rules
/// </summary>
public class BuildingDataProcessor
{
    private readonly ILogger<BuildingDataProcessor> _logger;

    public BuildingDataProcessor(ILogger<BuildingDataProcessor> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Validates building geometry for topology and quality
    /// </summary>
    public GeometryValidationResult ValidateGeometry(Geometry geometry)
    {
        var errors = new List<string>();
        var warnings = new List<string>();
        var qualityScore = 1.0;

        try
        {
            // Check if geometry is valid
            if (!geometry.IsValid)
            {
                errors.Add($"Invalid geometry: {geometry.GeometryType}");
                qualityScore = 0.0;
            }

            // Check if it's a polygon
            if (geometry is not Polygon polygon)
            {
                errors.Add($"Expected Polygon, got {geometry.GeometryType}");
                return new GeometryValidationResult
                {
                    IsValid = false,
                    Errors = errors,
                    QualityScore = 0.0
                };
            }

            // Check polygon characteristics
            var area = polygon.Area;
            if (area < 10.0) // Less than 10 square meters
            {
                warnings.Add("Very small building footprint (< 10 sq meters)");
                qualityScore *= 0.8;
            }

            if (area > 50000.0) // More than 5 hectares
            {
                warnings.Add("Very large building footprint (> 5 hectares)");
                qualityScore *= 0.9;
            }

            // Check for reasonable number of vertices
            var vertexCount = polygon.ExteriorRing.NumPoints;
            if (vertexCount < 4)
            {
                errors.Add("Polygon must have at least 4 vertices");
                qualityScore = 0.0;
            }
            else if (vertexCount > 1000)
            {
                warnings.Add("Polygon has many vertices, consider simplification");
                qualityScore *= 0.95;
            }

            // Check for holes (interior rings)
            if (polygon.NumInteriorRings > 0)
            {
                warnings.Add($"Polygon has {polygon.NumInteriorRings} interior rings (holes)");
                qualityScore *= 0.98;
            }

            return new GeometryValidationResult
            {
                IsValid = errors.Count == 0,
                Errors = errors,
                Warnings = warnings,
                QualityScore = qualityScore,
                Area = area,
                VertexCount = vertexCount
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating geometry");
            return new GeometryValidationResult
            {
                IsValid = false,
                Errors = new List<string> { $"Geometry validation failed: {ex.Message}" },
                QualityScore = 0.0
            };
        }
    }

    /// <summary>
    /// Estimates building height using available data and heuristics
    /// </summary>
    public HeightEstimationResult EstimateHeight(IDictionary<string, object?> sourceData)
    {
        try
        {
            // Try to get explicit height field
            if (TryGetNumericValue(sourceData, "height", out var height) && height > 0)
            {
                return new HeightEstimationResult
                {
                    Height = height,
                    Source = "explicit_height",
                    Confidence = 0.95
                };
            }

            // Try to get floor count and estimate height
            if (TryGetNumericValue(sourceData, new[] { "floors", "floor_count", "storeys" }, out var floors) && floors > 0)
            {
                return new HeightEstimationResult
                {
                    Height = floors * 3.5, // 3.5m per floor average
                    Source = "floor_heuristic",
                    Confidence = 0.7,
                    FloorCount = (int)floors
                };
            }

            // Check building type for default heights
            var buildingType = GetStringValue(sourceData, new[] { "building", "building_type", "type" });
            if (!string.IsNullOrEmpty(buildingType))
            {
                return new HeightEstimationResult
                {
                    Height = EstimateHeightFromBuildingType(buildingType),
                    Source = "type_heuristic",  
                    Confidence = 0.5,
                    BuildingType = buildingType
                };
            }

            // Default fallback height
            return new HeightEstimationResult
            {
                Height = 6.0, // ~2 floors
                Source = "default_heuristic",
                Confidence = 0.3
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error estimating building height");
            return new HeightEstimationResult
            {
                Height = 6.0,
                Source = "default_heuristic",
                Confidence = 0.1,
                Errors = new List<string> { $"Height estimation failed: {ex.Message}" }
            };
        }
    }

    private bool TryGetNumericValue(IDictionary<string, object?> data, string key, out double value)
    {
        return TryGetNumericValue(data, new[] { key }, out value);
    }

    private bool TryGetNumericValue(IDictionary<string, object?> data, string[] keys, out double value)
    {
        value = 0;
        
        foreach (var key in keys)
        {
            if (data.TryGetValue(key, out var objValue) && objValue != null)
            {
                if (double.TryParse(objValue.ToString(), out value))
                {
                    return true;
                }
            }
        }
        
        return false;
    }

    private string? GetStringValue(IDictionary<string, object?> data, string[] keys)
    {
        foreach (var key in keys)
        {
            if (data.TryGetValue(key, out var value) && value != null)
            {
                return value.ToString();
            }
        }
        return null;
    }

    private double EstimateHeightFromBuildingType(string buildingType)
    {
        return buildingType.ToLowerInvariant() switch
        {
            "house" or "residential" or "detached" => 8.0,
            "apartment" or "apartments" => 12.0,
            "commercial" or "office" => 15.0,
            "industrial" or "warehouse" => 10.0,
            "church" or "cathedral" => 20.0,
            "school" or "hospital" => 12.0,
            "garage" or "shed" => 4.0,
            _ => 8.0 // Default for unknown types
        };
    }
}

/// <summary>
/// Result of geometry validation
/// </summary>
public record GeometryValidationResult
{
    public bool IsValid { get; init; }
    public List<string> Errors { get; init; } = new();
    public List<string> Warnings { get; init; } = new();
    public double QualityScore { get; init; }
    public double? Area { get; init; }
    public int? VertexCount { get; init; }
}

/// <summary>
/// Result of height estimation
/// </summary>
public record HeightEstimationResult
{
    public double Height { get; init; }
    public string Source { get; init; } = "unknown";
    public double Confidence { get; init; }
    public int? FloorCount { get; init; }
    public string? BuildingType { get; init; }
    public List<string> Errors { get; init; } = new();
}