using SunnySeat.Core.Entities;
using NetTopologySuite.Geometries;

namespace SunnySeat.Core.Validation;

/// <summary>
/// Validation rules and methods for patio data quality
/// </summary>
public static class PatioValidator
{
    /// <summary>
    /// Validates that a patio has a valid name
    /// </summary>
    public static bool HasValidName(Patio patio)
    {
        return !string.IsNullOrWhiteSpace(patio.Name) &&
               patio.Name.Length >= 1 &&
               patio.Name.Length <= 100;
    }

    /// <summary>
    /// Validates that a patio has valid geometry
    /// </summary>
    public static bool HasValidGeometry(Patio patio)
    {
        return patio.Geometry != null &&
               patio.Geometry.IsValid &&
               patio.Geometry.Area > 0 &&
               patio.Geometry.Coordinates.Length >= 4; // At least 4 points for a polygon
    }

    /// <summary>
    /// Validates that the patio geometry has reasonable size (not too small or too large)
    /// </summary>
    public static bool HasReasonableSize(Patio patio)
    {
        if (patio.Geometry == null) return false;

        var area = patio.Geometry.Area;
        // Assuming area is in square degrees, very rough estimates:
        // Min: 0.00000001 sq degrees (~1 sq meter at Gothenburg latitude)
        // Max: 0.001 sq degrees (~10,000 sq meters / 1 hectare)
        return area >= 0.00000001 && area <= 0.001;
    }

    /// <summary>
    /// Validates that the polygon quality score is within valid range
    /// </summary>
    public static bool HasValidQualityScore(Patio patio)
    {
        return patio.PolygonQuality >= 0.0 && patio.PolygonQuality <= 1.0;
    }

    /// <summary>
    /// Validates that the height measurement is reasonable if provided
    /// </summary>
    public static bool HasValidHeight(Patio patio)
    {
        if (!patio.HeightM.HasValue) return true; // Height is optional

        // Reasonable height range: 0.1m to 100m
        return patio.HeightM.Value >= 0.1 && patio.HeightM.Value <= 100.0;
    }

    /// <summary>
    /// Gets all validation issues for a patio
    /// </summary>
    public static List<string> GetValidationIssues(Patio patio)
    {
        var issues = new List<string>();

        if (!HasValidName(patio))
            issues.Add("Invalid or missing patio name");

        if (!HasValidGeometry(patio))
            issues.Add("Invalid patio geometry");
        else if (!HasReasonableSize(patio))
            issues.Add("Patio size appears unreasonable (too small or too large)");

        if (!HasValidQualityScore(patio))
            issues.Add("Quality score must be between 0.0 and 1.0");

        if (!HasValidHeight(patio))
            issues.Add("Height measurement appears unreasonable");

        return issues;
    }

    /// <summary>
    /// Calculates quality score for a patio based on various factors
    /// </summary>
    public static double CalculateQualityScore(Patio patio)
    {
        var scores = new List<double>();

        // Geometry validity (40%)
        var geometryScore = 0.0;
        if (HasValidGeometry(patio)) geometryScore += 0.6;
        if (HasReasonableSize(patio)) geometryScore += 0.4;
        scores.Add(geometryScore * 0.4);

        // Data completeness (30%)
        var completenessScore = 0.0;
        if (HasValidName(patio)) completenessScore += 0.2;
        if (patio.HeightM.HasValue && HasValidHeight(patio)) completenessScore += 0.3;
        if (!string.IsNullOrWhiteSpace(patio.Orientation)) completenessScore += 0.2;
        if (!string.IsNullOrWhiteSpace(patio.Notes)) completenessScore += 0.1;
        if (patio.HeightSource == HeightSource.Surveyed) completenessScore += 0.2;
        scores.Add(completenessScore * 0.3);

        // Current quality score (30%)
        scores.Add(patio.PolygonQuality * 0.3);

        return Math.Round(scores.Sum(), 2);
    }

    /// <summary>
    /// Determines if a patio needs review based on quality metrics
    /// </summary>
    public static bool NeedsReview(Patio patio)
    {
        return patio.ReviewNeeded ||
               patio.PolygonQuality < 0.5 ||
               GetValidationIssues(patio).Any();
    }
}