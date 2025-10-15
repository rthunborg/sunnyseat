using NetTopologySuite.Geometries;

namespace SunnySeat.Core.Entities;

/// <summary>
/// Information about shadow coverage on a patio at a specific time
/// </summary>
public class PatioShadowInfo
{
    /// <summary>
    /// ID of the patio
    /// </summary>
    public int PatioId { get; set; }

    /// <summary>
    /// Reference to the patio entity
    /// </summary>
    public Patio? Patio { get; set; }

    /// <summary>
    /// Percentage of patio area in shadow (0-100)
    /// </summary>
    public double ShadowedAreaPercent { get; set; }

    /// <summary>
    /// Percentage of patio area in sunlight (0-100)
    /// </summary>
    public double SunlitAreaPercent { get; set; }

    /// <summary>
    /// Buildings casting shadows on this patio
    /// </summary>
    public IEnumerable<ShadowProjection> CastingShadows { get; set; } = [];

    /// <summary>
    /// Geometry of shadowed area within patio (may be null if no shadows)
    /// </summary>
    public Polygon? ShadowedGeometry { get; set; }

    /// <summary>
    /// Geometry of sunlit area within patio (may be null if fully shadowed)
    /// </summary>
    public Polygon? SunlitGeometry { get; set; }

    /// <summary>
    /// Timestamp of shadow calculation (UTC)
    /// </summary>
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// Combined confidence of shadow calculation (0.0 to 1.0)
    /// </summary>
    public double Confidence { get; set; }

    /// <summary>
    /// Solar position at time of calculation
    /// </summary>
    public SolarPosition SolarPosition { get; set; } = null!;
}