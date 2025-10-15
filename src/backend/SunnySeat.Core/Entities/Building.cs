using NetTopologySuite.Geometries;

namespace SunnySeat.Core.Entities;

/// <summary>
/// Represents building footprints used for shadow calculations
/// </summary>
public class Building
{
    public int Id { get; set; }
    
    /// <summary>
    /// Building footprint geometry (EPSG:4326)
    /// </summary>
    public Polygon Geometry { get; set; } = null!;
    
    /// <summary>
    /// Height of the building in meters
    /// </summary>
    public double Height { get; set; } = 10.0;
    
    /// <summary>
    /// Source of building data (e.g., "lantmateriet", "osm")
    /// </summary>
    public string Source { get; set; } = "unknown";
    
    /// <summary>
    /// Data quality score for this building (0.0 to 1.0)
    /// </summary>
    public double QualityScore { get; set; } = 1.0;
    
    /// <summary>
    /// Optional building identifier from external source
    /// </summary>
    public string? ExternalId { get; set; }
    
    /// <summary>
    /// Timestamp when this building was imported/created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Timestamp when this building was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// User who last updated this building (for admin operations)
    /// </summary>
    public string? UpdatedBy { get; set; }

    // Shadow calculation helper properties

    /// <summary>
    /// Get effective height for shadow calculations (using existing Height property)
    /// </summary>
    public double EffectiveHeight => Height;

    /// <summary>
    /// Get height source (defaulting to OSM for existing data)
    /// </summary>
    public HeightSource HeightSource { get; set; } = HeightSource.Osm;

    /// <summary>
    /// Building type for heuristic calculations (not stored yet)
    /// </summary>
    public string? BuildingType { get; set; }

    /// <summary>
    /// Height in meters from original data source (for compatibility, maps to Height)
    /// </summary>
    public double? HeightM 
    { 
        get => Height; 
        set => Height = value ?? Height; 
    }

    /// <summary>
    /// Admin-provided height override (for future implementation, maps to Height for now)
    /// </summary>
    public double? AdminHeightOverride 
    { 
        get => null; // No override system yet
        set { if (value.HasValue) Height = value.Value; }
    }
}