using NetTopologySuite.Geometries;

namespace SunnySeat.Core.Entities;

/// <summary>
/// Represents a shadow cast by a building at a specific time
/// </summary>
public class ShadowProjection
{
    /// <summary>
    /// Shadow polygon geometry in WGS84 (EPSG:4326)
    /// </summary>
    public Polygon Geometry { get; set; } = null!;

    /// <summary>
    /// Shadow length in meters
    /// </summary>
    public double Length { get; set; }

    /// <summary>
    /// Shadow direction in degrees (0-360, where 0 is North)
    /// </summary>
    public double Direction { get; set; }

    /// <summary>
    /// ID of the building casting this shadow
    /// </summary>
    public int BuildingId { get; set; }

    /// <summary>
    /// Height of the building used for shadow calculation
    /// </summary>
    public double BuildingHeight { get; set; }

    /// <summary>
    /// Solar position at the time of shadow calculation
    /// </summary>
    public SolarPosition SolarPosition { get; set; } = null!;

    /// <summary>
    /// Timestamp when shadow was calculated (UTC)
    /// </summary>
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// Confidence level of shadow accuracy (0.0 to 1.0)
    /// </summary>
    public double Confidence { get; set; }
}