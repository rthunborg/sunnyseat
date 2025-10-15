using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Services;

/// <summary>
/// Manages building height data from multiple sources with quality scoring
/// </summary>
public class BuildingHeightManager
{
    /// <summary>
    /// Get the most reliable height for a building, considering all available sources
    /// </summary>
    /// <param name="building">Building entity</param>
    /// <returns>Most reliable height in meters</returns>
    public double GetEffectiveHeight(Building building)
    {
        // For now, just use the existing Height property
        return building.Height;
    }

    /// <summary>
    /// Calculate confidence score for building height data
    /// </summary>
    /// <param name="building">Building entity</param>
    /// <returns>Confidence score (0.0 to 1.0)</returns>
    public double CalculateHeightConfidence(Building building)
    {
        // Default to OSM confidence for existing data
        return 0.80;
    }

    /// <summary>
    /// Calculate heuristic height estimate based on building footprint and characteristics
    /// </summary>
    /// <param name="building">Building entity</param>
    /// <returns>Estimated height in meters</returns>
    public double CalculateHeuristicHeight(Building building)
    {
        if (building.Geometry == null)
            return GetDefaultBuildingHeight();

        // Calculate building footprint area
        var area = building.Geometry.Area;

        // Convert from degrees² to approximate m² (rough calculation for Gothenburg)
        // At latitude ~58°: 1° ? 111.3 km latitude, 1° ? 55.8 km longitude
        var areaM2 = area * 111300 * 55800; // Very rough approximation

        // Estimate number of floors based on area and typical building types
        var estimatedFloors = areaM2 switch
        {
            < 100 => 1,         // Very small buildings: 1 floor (sheds, garages)
            < 300 => 2,         // Small buildings: 2 floors (small houses)
            < 600 => 3,         // Medium buildings: 3 floors (typical houses)
            < 1200 => 4,        // Large buildings: 4 floors (large houses, small apartments)
            < 2400 => 5,        // Very large buildings: 5 floors (apartment buildings)
            _ => 6              // Huge buildings: 6+ floors (large apartment buildings)
        };

        // Convert floors to height (3.0m per floor is typical for Swedish buildings)
        var heightM = estimatedFloors * 3.0;

        // Add some variation based on area to avoid all buildings having exact multiples of 3m
        var areaVariation = (areaM2 % 100) / 100.0; // 0-1 variation based on area
        heightM += areaVariation * 0.5; // Add up to 50cm variation

        // Ensure reasonable bounds
        return Math.Max(3.0, Math.Min(30.0, heightM));
    }

    /// <summary>
    /// Get default building height when no data is available
    /// </summary>
    /// <returns>Default height in meters</returns>
    public double GetDefaultBuildingHeight()
    {
        return 7.0; // Default to 2-story building (6m) + roof (1m)
    }

    /// <summary>
    /// Determine if building is tall enough to cast meaningful shadows
    /// </summary>
    /// <param name="building">Building entity</param>
    /// <returns>True if building can cast meaningful shadows</returns>
    public bool CanCastMeaningShadow(Building building)
    {
        var effectiveHeight = GetEffectiveHeight(building);
        return effectiveHeight >= Utils.ShadowGeometry.MinMeaningfulHeight;
    }

    /// <summary>
    /// Update building height with admin override (simplified for current implementation)
    /// </summary>
    /// <param name="building">Building to update</param>
    /// <param name="heightOverride">New height override value</param>
    /// <param name="updatedBy">Admin user making the update</param>
    public void UpdateHeightOverride(Building building, double heightOverride, string updatedBy)
    {
        if (heightOverride <= 0)
            throw new ArgumentException("Height override must be positive", nameof(heightOverride));

        if (heightOverride > 200) // Reasonable upper limit for buildings in Gothenburg
            throw new ArgumentException("Height override exceeds reasonable limit (200m)", nameof(heightOverride));

        // For now, just update the main Height property
        building.Height = heightOverride;
        building.UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Remove building height override, reverting to original height data (simplified)
    /// </summary>
    /// <param name="building">Building to update</param>
    /// <param name="updatedBy">Admin user making the update</param>
    public void RemoveHeightOverride(Building building, string updatedBy)
    {
        // For now, just keep the current height - no separate override system yet
        building.UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Get height information summary for a building
    /// </summary>
    /// <param name="building">Building entity</param>
    /// <returns>Height information summary</returns>
    public BuildingHeightInfo GetHeightInfo(Building building)
    {
        var effectiveHeight = GetEffectiveHeight(building);
        var confidence = CalculateHeightConfidence(building);

        return new BuildingHeightInfo
        {
            EffectiveHeight = effectiveHeight,
            OriginalHeight = building.Height,
            AdminOverride = null, // No override system yet
            HeightSource = HeightSource.Osm,
            Confidence = confidence,
            CanCastShadow = CanCastMeaningShadow(building),
            IsHeuristic = false
        };
    }
}